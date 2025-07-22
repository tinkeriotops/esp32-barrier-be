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

// CORS helper for all responses
function withCors(
  body: BodyInit | null,
  status: number = 200,
  headers: HeadersInit = {}
): Response {
  return new Response(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*", // Change to your frontend domain if needed
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...headers,
    },
  });
}

function withCorsJson(data: unknown, status = 200): Response {
  return withCors(JSON.stringify(data), status, {
    "Content-Type": "application/json",
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return withCors(null, 204);
    }

    // POST /generate-pin — validate admin PIN, generate guest PIN
    if (url.pathname === "/generate-pin" && request.method === "POST") {
      const { adminPin }: GeneratePinRequest = await request.json();

      if (!/^\d{4}$/.test(adminPin)) {
        return withCorsJson({ success: false, reason: "Invalid PIN format" }, 400);
      }

      const adminType = await env.PINS.get(adminPin);
      if (adminType !== "9") {
        return withCorsJson({ success: false, reason: "Invalid admin PIN" }, 403);
      }

      const guestPin = Math.floor(1000 + Math.random() * 9000).toString();
      const ttl = 86400; // 24 hours

      await env.PINS.put(guestPin, "1", { expirationTtl: ttl });

      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      return withCorsJson({ success: true, pin: guestPin, expiresAt });
    }

    // POST /open-barrier — validate PIN and trigger Blynk
    if (url.pathname === "/open-barrier" && request.method === "POST") {
      const { pin }: OpenBarrierRequest = await request.json();

      if (!/^\d{4}$/.test(pin)) {
        return withCorsJson({ success: false, reason: "Invalid PIN format" }, 400);
      }

      const type = await env.PINS.get(pin);
      if (!type) {
        return withCorsJson({ success: false, reason: "Invalid or expired PIN" }, 403);
      }

      const blynkToken = env.BLYNK_TOKEN;
      const vPin = "V0";
      const triggerUrl = `https://blynk.cloud/external/api/update?token=${blynkToken}&${vPin}=1`;

      const blynkRes = await fetch(triggerUrl);
      if (!blynkRes.ok) {
        return withCorsJson({ success: false, reason: "Blynk API error" }, 502);
      }

      return withCorsJson({ success: true, type });
    }

    // GET /device-status — check if Blynk device is online
    if (url.pathname === "/device-status" && request.method === "GET") {
      const blynkToken = env.BLYNK_TOKEN;
      const res = await fetch(
        `https://blynk.cloud/external/api/isHardwareConnected?token=${blynkToken}`
      );
      const status = await res.text();

      return withCorsJson({ online: status.trim() === "true" });
    }

    return withCors("Not Found", 404);
  },
};
