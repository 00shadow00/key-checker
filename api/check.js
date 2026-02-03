import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  try {
    await redis.set("testkey", { hello: "world" });
    const data = await redis.get("testkey");
    res.json({ status: "ok", data });
  } catch (err) {
    res.json({ status: "error", message: err.message });
  }
}
