import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const { method } = req;
  const { key, device } = req.query;

  switch (method) {

    // ===================== GET =====================
    case 'GET': {
      if (!key) {
        const keys = await redis.keys("*");
        const all = {};
        for (const k of keys) {
          all[k] = await redis.get(k);
        }
        return res.status(200).json(all);
      }

      const data = await redis.get(key);

      if (!data) return res.json({ status: "invalid" });

      const { device: savedDevice, expiry } = data;

      if (savedDevice && device && savedDevice !== device) {
        return res.json({ status: "invalid" });
      }

      if (expiry) {
        const now = new Date();
        const expDate = new Date(expiry + "T23:59:59");
        if (now > expDate) {
          return res.json({ status: "error", message: "expired" });
        }
      }

      return res.json({
        status: "ok",
        key,
        device: savedDevice || "Not bound"
      });
    }

    // ===================== POST =====================
    case 'POST': {
      if (!key) return res.json({ status: "error", message: "Key is required" });

      const exists = await redis.get(key);
      if (exists) return res.json({ status: "error", message: "Key already exists" });

      await redis.set(key, { device: device || null, expiry: null });

      return res.json({ status: "ok", message: "Key created", key, device: device || null });
    }

    // ===================== PUT =====================
    case 'PUT': {
      if (!key) return res.json({ status: "error", message: "Key is required" });

      const data = await redis.get(key);
      if (!data) return res.json({ status: "error", message: "Key does not exist" });

      data.device = device;
      await redis.set(key, data);

      return res.json({ status: "ok", message: "Device updated", key, device });
    }

    // ===================== DELETE =====================
    case 'DELETE': {
      if (!key) return res.json({ status: "error", message: "Key is required" });

      const data = await redis.get(key);
      if (!data) return res.json({ status: "error", message: "Key does not exist" });

      if (device) {
        data.device = null;
        await redis.set(key, data);
        return res.json({ status: "ok", message: "Device unbound", key });
      }

      await redis.del(key);
      return res.json({ status: "ok", message: "Key deleted", key });
    }

    default:
      return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }
}
