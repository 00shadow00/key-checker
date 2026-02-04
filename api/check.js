import fetch from "node-fetch";

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Helper: get a key
async function getKey(key) {
  const res = await fetch(`${UPSTASH_REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

// Helper: set a key
async function setKey(key, value) {
  await fetch(`${UPSTASH_REDIS_URL}/set/${key}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value: JSON.stringify(value) }),
  });
}

// Helper: delete a key
async function deleteKey(key) {
  await fetch(`${UPSTASH_REDIS_URL}/del/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
  });
}

export default async function handler(req, res) {
  const { method } = req;
  const { key, device, expiry } = req.query;

  switch (method) {
    // ===================== GET =====================
    case "GET":
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      const saved = await getKey(key);

      if (!saved) return res.json({ status: "invalid" });

      // Device check
      if (saved.device && device && saved.device !== device) {
        return res.json({ status: "invalid" });
      }

      // Expiry check
      if (saved.expiry) {
        const now = new Date();
        const expDate = new Date(saved.expiry + "T23:59:59");
        if (now > expDate) {
          return res.json({ status: "error", message: "expired" });
        }
      }

      return res.json({
        status: "ok",
        key,
        device: saved.device || "Not bound",
        expiry: saved.expiry || null,
      });

    // ===================== POST =====================
    case "POST":
      if (!key) return res.json({ status: "error", message: "Key is required" });

      const exists = await getKey(key);
      if (exists) return res.json({ status: "error", message: "Key already exists" });

      const newKey = { device: device || null, expiry: expiry || null };
      await setKey(key, newKey);

      return res.json({ status: "ok", message: "Key created", key, ...newKey });

    // ===================== PUT =====================
    case "PUT":
      if (!key) return res.json({ status: "error", message: "Key is required" });

      const keyData = await getKey(key);
      if (!keyData) return res.json({ status: "error", message: "Key does not exist" });

      if (device !== undefined) keyData.device = device || null;
      if (expiry !== undefined) keyData.expiry = expiry || null;

      await setKey(key, keyData);

      return res.json({ status: "ok", message: "Key updated", key, ...keyData });

    // ===================== DELETE =====================
    case "DELETE":
      if (!key) return res.json({ status: "error", message: "Key is required" });

      const keyDel = await getKey(key);
      if (!keyDel) return res.json({ status: "error", message: "Key does not exist" });

      if (device) {
        keyDel.device = null;
        await setKey(key, keyDel);
        return res.json({ status: "ok", message: "Device unbound", key });
      }

      await deleteKey(key);
      return res.json({ status: "ok", message: "Key deleted", key });

    default:
      return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }
}
