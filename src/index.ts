/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Common headers for CORS
		const headers = new Headers({
			"Access-Control-Allow-Origin": "*",           // allow all origins (dev)
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		});

		// Handle preflight OPTIONS request
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers });
		}

		// Handle form submissions
		if (url.pathname === "/subscribe" && request.method === "POST") {
			let email: string | undefined;

			try {
				const body = await request.json() as { email?: string };
				email = body.email;
			} catch {
				return new Response("Invalid JSON", { status: 400, headers });
			}

			if (!email || !email.includes("@")) {
				return new Response("Invalid email", { status: 400, headers });
			}

			try {
				await env.DB.prepare(
					"INSERT INTO subscribers (email) VALUES (?)"
				).bind(email).run();

				return new Response("Subscribed!", { status: 200, headers });
			} catch (err: any) {
				if (err.message?.includes("UNIQUE")) {
					return new Response("Already subscribed", { status: 409, headers });
				}
				return new Response("Error saving", { status: 500, headers });
			}
		}

		// Endpoint to list subscribers (protect this later)
		if (url.pathname === "/subscribers") {
			const result = await env.DB.prepare(
				"SELECT id, email, created_at FROM subscribers ORDER BY created_at DESC"
			).all();
			return Response.json(result.results);
		}

		// Default response
		return new Response("Email List Worker running");
	}
};
