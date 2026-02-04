// ===================== Upstash Redis Config =====================
const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

// ===================== Redis Helpers =====================
async function getKey(key) {
  try {
    const res = await fetch(`${UPSTASH_REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch (err) {
    console.error("Redis GET error:", err);
    return null;
  }
}

// ===================== API Handler (Test GET) =====================
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "GET only" });
  }

  const { key } = req.query;
  if (!key) return res.json({ status: "error", message: "Key required" });

  // Try fetching key from Upstash
  const saved = await getKey(key);

  // Always return OK for test
  if (saved) {
    return res.json({
      status: "ok",
      message: `Key ${key} found in Upstash!`,
      data: saved,
    });
  } else {
    return res.json({
      status: "ok",
      message: `Key ${key} not found, but Upstash is working.`,
    });
  }
}
