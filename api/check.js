const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd, ...args) {
  const res = await fetch(`${REDIS_URL}/${cmd}/${args.join("/")}`, {
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
    },
  });
  return res.json();
}

export default async function handler(req, res) {
  try {
    const { method } = req;
    const { key, device, expiry } = req.query;

    // ===================== GET =====================
    if (method === "GET") {
      if (!key) {
        return res.json({ error: "Key required" });
      }

      const data = await redis("get", key);
      if (!data.result) return res.json({ status: "invalid" });

      const saved = JSON.parse(data.result);

      if (saved.device && device && saved.device !== device) {
        return res.json({ status: "invalid" });
      }

      if (saved.expiry) {
        const now = new Date();
        const exp = new Date(saved.expiry + "T23:59:59");
        if (now > exp) {
          return res.json({ status: "error", message: "expired" });
        }
      }

      return res.json({
        status: "ok",
        key,
        device: saved.device || "Not bound",
        expiry: saved.expiry || null,
      });
    }

    // ===================== POST =====================
    if (method === "POST") {
      if (!key) return res.json({ error: "Key required" });

      const exists = await redis("get", key);
      if (exists.result) {
        return res.json({ error: "Key already exists" });
      }

      await redis(
        "set",
        key,
        JSON.stringify({
          device: device || null,
          expiry: expiry || null,
        })
      );

      return res.json({ status: "ok", message: "Key created" });
    }

    // ===================== PUT =====================
    if (method === "PUT") {
      if (!key) return res.json({ error: "Key required" });

      const data = await redis("get", key);
      if (!data.result) return res.json({ error: "Key not found" });

      const obj = JSON.parse(data.result);

      if (device !== undefined) obj.device = device || null;
      if (expiry !== undefined) obj.expiry = expiry || null;

      await redis("set", key, JSON.stringify(obj));

      return res.json({ status: "ok", message: "Key updated" });
    }

    // ===================== DELETE =====================
    if (method === "DELETE") {
      if (!key) return res.json({ error: "Key required" });

      if (device) {
        const data = await redis("get", key);
        if (!data.result) return res.json({ error: "Key not found" });

        const obj = JSON.parse(data.result);
        obj.device = null;

        await redis("set", key, JSON.stringify(obj));
        return res.json({ status: "ok", message: "Device unbound" });
      }

      await redis("del", key);
      return res.json({ status: "ok", message: "Key deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server crashed" });
  }
}
