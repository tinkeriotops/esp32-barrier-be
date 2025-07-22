export interface Env {
	PINS: KVNamespace;
	BLYNK_TOKEN: string;
}

interface GenerateRequest {
	type: 1 | 9;
}

interface OpenBarrierRequest {
	pin: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// POST /generate-pin
		if (url.pathname === "/generate-pin" && request.method === "POST") {
			const { type }: GenerateRequest = await request.json();

			// Only allow type 1 (guest) and 9 (admin)
			let ttl: number;
			if (type === 1) {
				ttl = 86400; // 24 hours
			} else if (type === 9) {
				ttl = 604800; // 7 days
			} else {
				return new Response("Invalid type", { status: 400 });
			}

			const pin = Math.floor(1000 + Math.random() * 9000).toString();
			await env.PINS.put(pin, String(type), { expirationTtl: ttl });

			const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
			return Response.json({ pin, expiresAt });
		}

		// POST /open-barrier
		if (url.pathname === "/open-barrier" && request.method === "POST") {
			const { pin }: OpenBarrierRequest = await request.json();

			if (!/^\d{4}$/.test(pin)) {
				return Response.json({ success: false, reason: "Invalid PIN format" }, { status: 400 });
			}

			const type = await env.PINS.get(pin);
			if (!type) {
				return Response.json({ success: false, reason: "Invalid or expired PIN" }, { status: 403 });
			}

			// Trigger Blynk relay
			const blynkToken = env.BLYNK_TOKEN;
			const vPin = "V0";
			const triggerUrl = `https://blynk.cloud/external/api/update?token=${blynkToken}&${vPin}=1`;

			const blynkRes = await fetch(triggerUrl);
			if (!blynkRes.ok) {
				return Response.json({ success: false, reason: "Blynk API error" }, { status: 502 });
			}

			return Response.json({ success: true, type });
		}

		// GET /device-status
		if (url.pathname === "/device-status" && request.method === "GET") {
			const blynkToken = env.BLYNK_TOKEN;
			const res = await fetch(`https://blynk.cloud/external/api/isHardwareConnected?token=${blynkToken}`);
			const status = await res.text();

			return Response.json({ online: status.trim() === "true" });
		}

		return new Response("Not Found", { status: 404 });
	}
};
