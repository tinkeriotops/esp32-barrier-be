export interface Env {
  PINS: KVNamespace;
}

interface GenerateRequest {
  type: "guest" | "neighbor";
}

interface ValidateRequest {
  pin: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/generate-pin" && request.method === "POST") {
      const body: GenerateRequest = await request.json();
      const { type } = body;

      if (type !== "guest" && type !== "neighbor") {
        return new Response("Invalid type", { status: 400 });
      }

      const pin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit

      const ttl = type === "guest" ? 43200 : 604800; // 12h or 7d
      await env.PINS.put(pin, type, { expirationTtl: ttl });

      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

      return Response.json({ pin, expiresAt });
    }

    if (url.pathname === "/validate-pin" && request.method === "POST") {
      const body: ValidateRequest = await request.json();
      const { pin } = body;

      if (!/^\d{4}$/.test(pin)) {
        return new Response("Invalid PIN format", { status: 400 });
      }

      const type = await env.PINS.get(pin);
      if (type) {
        await env.PINS.delete(pin); // Optional: remove after use
        return Response.json({ valid: true, type });
      }

      return Response.json({ valid: false });
    }

    return new Response("Not Found", { status: 404 });
  },
};
