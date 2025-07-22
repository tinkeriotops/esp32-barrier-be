export interface Env {
  PINS: KVNamespace;
  BLYNK_TOKEN: string;
}

interface GeneratePinRequest {
  adminPin: string;
}

interface OpenBarrierRequest {
  pin: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // POST /generate-pin — validate admin PIN, generate guest PIN
    if (url.pathname === "/generate-pin" && request.method === "POST") {
      const { adminPin }: GeneratePinRequest = await request.json();

      if (!/^\d{4}$/.test(adminPin)) {
        return Response.json({ success: false, reason: "Invalid PIN format" }, { status: 400 });
      }

      const adminType = await env.PINS.get(adminPin);
      if (adminType !== "9") {
        return Response.json({ success: false, reason: "Invalid admin PIN" }, { status: 403 });
      }

      const guestPin = Math.floor(1000 + Math.random() * 9000).toString();
      const ttl = 86400; // 24 hours

      await env.PINS.put(guestPin, "1", { expirationTtl: ttl });

      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      return Response.json({ success: true, pin: guestPin, expiresAt });
    }

    // POST /open-barrier — validate PIN and trigger Blynk
    if (url.pathname === "/open-barrier" && request.method === "POST") {
      const { pin }: OpenBarrierRequest = await request.json();

      if (!/^\d{4}$/.test(pin)) {
        return Response.json({ success: false, reason: "Invalid PIN format" }, { status: 400 });
      }

      const type = await env.PINS.get(pin);
      if (!type) {
        return Response.json({ success: false, reason: "Invalid or expired PIN" }, { status: 403 });
      }

      const blynkToken = env.BLYNK_TOKEN;
      const vPin = "V0";
      const triggerUrl = `https://blynk.cloud/external/api/update?token=${blynkToken}&${vPin}=1`;

      const blynkRes = await fetch(triggerUrl);
      if (!blynkRes.ok) {
        return Response.json({ success: false, reason: "Blynk API error" }, { status: 502 });
      }

      return Response.json({ success: true, type });
    }

    // GET /device-status — check if Blynk device is online
    if (url.pathname === "/device-status" && request.method === "GET") {
      const blynkToken = env.BLYNK_TOKEN;
      const res = await fetch(`https://blynk.cloud/external/api/isHardwareConnected?token=${blynkToken}`);
      const status = await res.text();

      return Response.json({ online: status.trim() === "true" });
    }

    return new Response("Not Found", { status: 404 });
  }
};
