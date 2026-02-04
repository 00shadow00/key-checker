const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd, ...args) {
  try {
    const res = await fetch(`${REDIS_URL}/${cmd}/${args.join("/")}`, {
      method: "GET",  // Ensure you use the correct HTTP method
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    // Check if the response was successful
    if (!res.ok) {
      throw new Error(`Failed to fetch from Redis: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`Error with Redis command "${cmd}":`, err.message);
    throw err;  // Rethrow error to propagate it
  }
}

export default async function handler(req, res) {
  try {
    const { method } = req;
    const { key, device, expiry } = req.query;

    if (!key) {
      return res.status(400).json({ error: "Key is required" });
    }

    switch (method) {
      case "GET":
        const data = await redis("get", key);
        if (!data.result) {
          return res.json({ status: "invalid" });
        }
        return res.json({
          status: "ok",
          key,
          device: JSON.parse(data.result).device || "Not bound",
          expiry: JSON.parse(data.result).expiry || null,
        });

      // Other cases (POST, PUT, DELETE) follow the same pattern

      default:
        return res.status(405).json({ status: "error", message: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ status: "error", message: "Server crashed" });
  }
}
