// api/check.js
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Helper function to call Upstash REST API
async function redis(cmd, ...args) {
  if (!REDIS_URL) throw new Error("UPSTASH_REDIS_REST_URL is not defined");
  if (!REDIS_TOKEN) throw new Error("UPSTASH_REDIS_REST_TOKEN is not defined");
  if (!cmd) throw new Error("Redis command is required");

  // Safely encode args to prevent URL issues
  const url = `${REDIS_URL}/${cmd}/${args.map(encodeURIComponent).join("/")}`;
  console.log("Fetching URL:", url);

  // Determine HTTP method based on Redis command
  const method = cmd.toLowerCase() === "get" ? "GET" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Redis fetch failed: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`Redis command "${cmd}" error:`, err.message);
    throw err;
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

        // Parse stored JSON safely
        let stored = {};
        try {
          stored = JSON.parse(data.result);
        } catch {
          stored = {};
        }

        return res.json({
          status: "ok",
          key,
          device: stored.device || "Not bound",
          expiry: stored.expiry || null,
        });

      case "POST":
        if (!device || !expiry) {
          return res
            .status(400)
            .json({ error: "device and expiry are required for POST" });
        }

        const value = JSON.stringify({ device, expiry });
        await redis("set", key, value);
        return res.json({ status: "ok", key, device, expiry });

      default:
        return res
          .status(405)
          .json({ status: "error", message: "Method Not Allowed" });
    }
  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({ status: "error", message: "Server crashed" });
  }
}
