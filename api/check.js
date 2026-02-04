import { Redis } from "@upstash/redis";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
  const { method } = req;
  const { key, device, expiry } = req.query;

  switch (method) {

    // ===================== GET =====================
    case 'GET':
      // Return all keys (you can consider limiting this for performance in production)
      if (!key) {
        // Redis keys pattern (can adjust to your needs)
        const allKeys = await redis.keys('*');
        const allData = {};

        for (let k of allKeys) {
          const v = await redis.get(k);
          allData[k] = JSON.parse(v);
        }

        return res.status(200).json(allData);
      }

      // Key not found in Redis
      const value = await redis.get(key);
      if (!value) return res.json({ status: "invalid" });

      const saved = JSON.parse(value);

      // 🔒 SAME device logic (unchanged)
      if (saved.device && device && saved.device !== device) {
        return res.json({ status: "invalid" });
      }

      // ⏰ EXPIRY CHECK
      if (saved.expiry) {
        const now = new Date();
        const expDate = new Date(saved.expiry + "T23:59:59");

        if (now > expDate) {
          return res.json({
            status: "error",
            message: "expired"
          });
        }
      }

      // Return saved data
      return res.json({
        status: "ok",
        key,
        device: saved.device || "Not bound",
        expiry: saved.expiry || null
      });

    // ===================== POST =====================
    case 'POST':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      // Check if key already exists
      const existing = await redis.get(key);
      if (existing) {
        return res.json({ status: "error", message: "Key already exists" });
      }

      // Save new key
      const newData = {
        device: device || null,
        expiry: expiry || null
      };

      await redis.set(key, JSON.stringify(newData));

      return res.json({
        status: "ok",
        message: "Key created",
        key,
        device: newData.device,
        expiry: newData.expiry
      });

    // ===================== PUT =====================
    case 'PUT':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      const current = await redis.get(key);
      if (!current) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      const updatedData = JSON.parse(current);

      if (device !== undefined) {
        updatedData.device = device || null;
      }

      if (expiry !== undefined) {
        updatedData.expiry = expiry || null;
      }

      await redis.set(key, JSON.stringify(updatedData));

      return res.json({
        status: "ok",
        message: "Key updated",
        key,
        device: updatedData.device,
        expiry: updatedData.expiry
      });

    // ===================== DELETE =====================
    case 'DELETE':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      const dataToDelete = await redis.get(key);
      if (!dataToDelete) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      // Unbind device
      if (device) {
        const data = JSON.parse(dataToDelete);
        data.device = null;
        await redis.set(key, JSON.stringify(data));
        return res.json({
          status: "ok",
          message: "Device unbound",
          key
        });
      }

      // Delete the key
      await redis.del(key);
      return res.json({
        status: "ok",
        message: "Key deleted",
        key
      });

    // ===================== DEFAULT =====================
    default:
      return res.status(405).json({
        status: "error",
        message: "Method Not Allowed"
      });
  }
}
