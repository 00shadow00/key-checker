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

    // ===================== DEFAULT DATA (SEED ONCE) =====================
    const defaultKeys = {
      "venom": { device: "18db7457294f554f" },
      "abdee": {
        device: "18db7457294f554f",
        expiry: "2027-01-01"
      }
    };

    // seed only if missing
    for (const k in defaultKeys) {
      const exists = await redis("get", k);
      if (!exists.result) {
        await redis("set", k, JSON.stringify(defaultKeys[k]));
      }
    }

    // ===================== ROUTER =====================
    switch (method) {

      // ===================== GET =====================
      case "GET":
        if (!key) {
          return res.status(200).json({ error: "Key required" });
        }

        const data = await redis("get", key);
        if (!data.result) {
          return res.json({ status: "invalid" });
        }

        const saved = JSON.parse(data.result);
        const savedDevice = saved.device;
        const savedExpiry = saved.expiry;

        // 🔒 SAME device logic
        if (savedDevice && device && savedDevice !== device) {
          return res.json({ status: "invalid" });
        }

        // ⏰ EXPIRY CHECK
        if (savedExpiry) {
          const now = new Date();
          const expDate = new Date(savedExpiry + "T23:59:59");
          if (now > expDate) {
            return res.json({
              status: "error",
              message: "expired"
            });
          }
        }

        return res.json({
          status: "ok",
          key,
          device: savedDevice ? savedDevice : "Not bound",
          expiry: savedExpiry || null
        });

      // ===================== POST =====================
      case "POST":
        if (!key) {
          return res.json({ status: "error", message: "Key is required" });
        }

        const exists = await redis("get", key);
        if (exists.result) {
          return res.json({ status: "error", message: "Key already exists" });
        }

        await redis(
          "set",
          key,
          JSON.stringify({
            device: device || null,
            expiry: expiry || null
          })
        );

        return res.json({
          status: "ok",
          message: "Key created",
          key,
          device: device || null,
          expiry: expiry || null
        });

      // ===================== PUT =====================
      case "PUT":
        if (!key) {
          return res.json({ status: "error", message: "Key is required" });
        }

        const current = await redis("get", key);
        if (!current.result) {
          return res.json({ status: "error", message: "Key does not exist" });
        }

        const updated = JSON.parse(current.result);

        if (device !== undefined) {
          updated.device = device || null;
        }

        if (expiry !== undefined) {
          updated.expiry = expiry || null;
        }

        await redis("set", key, JSON.stringify(updated));

        return res.json({
          status: "ok",
          message: "Key updated",
          key,
          device: updated.device,
          expiry: updated.expiry
        });

      // ===================== DELETE =====================
      case "DELETE":
        if (!key) {
          return res.json({ status: "error", message: "Key is required" });
        }

        const del = await redis("get", key);
        if (!del.result) {
          return res.json({ status: "error", message: "Key does not exist" });
        }

        // Unbind device only
        if (device) {
          const obj = JSON.parse(del.result);
          obj.device = null;
          await redis("set", key, JSON.stringify(obj));
          return res.json({
            status: "ok",
            message: "Device unbound",
            key
          });
        }

        // Delete key
        await redis("del", key);
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

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "error",
      message: "Server crashed"
    });
  }
}
