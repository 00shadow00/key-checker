// ===================== Upstash Redis Config =====================
const UPSTASH_REDIS_URL = "https://actual-drum-63266.upstash.io";
const UPSTASH_REDIS_TOKEN = "AfciAAIncDE4MjkxYmFhOTUyMzI0NTk2ODYxNDc3ZmJiNjFkZjVkOXAxNjMyNjY";

// ===================== Redis Helpers =====================
async function getKey(key) {
  const res = await fetch(`${UPSTASH_REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

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

async function deleteKey(key) {
  await fetch(`${UPSTASH_REDIS_URL}/del/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
  });
}

// ===================== Preload Default Keys =====================
const defaultKeys = {
  "ABC123": { device: null },
  "venom": { device: "18db7457294f554f" },
  "abdee": { device: "18db7457294f554f", expiry: "2027-01-01" }
};

async function initDefaultKeys() {
  for (const k of Object.keys(defaultKeys)) {
    const exists = await getKey(k);
    if (!exists) {
      await setKey(k, defaultKeys[k]);
    }
  }
}

// Initialize once
initDefaultKeys().catch(console.error);

// ===================== API Handler =====================
export default async function handler(req, res) {
  const { method } = req;
  const { key, device, expiry } = req.query;

  switch (method) {

    // ===================== GET =====================
    case "GET":
      if (!key) {
        // Return all keys (might be slow for many keys)
        const keysRes = await fetch(`${UPSTASH_REDIS_URL}/keys/*`, {
          headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
        });
        const data = await keysRes.json();
        const allKeys = {};
        for (let k of data.result) {
          allKeys[k] = await getKey(k);
        }
        return res.status(200).json(allKeys);
      }

      // Try to fetch key
      let saved = await getKey(key);

      // Auto-initialize from defaultKeys if missing
      if (!saved) {
        if (defaultKeys[key]) {
          await setKey(key, defaultKeys[key]);
          saved = defaultKeys[key];
        } else {
          return res.json({ status: "invalid" });
        }
      }

      // Device validator: only invalid if bound and query doesn't match
      if (saved.device && device && saved.device !== device) {
        return res.json({ status: "invalid" });
      }

      // Expiry check
      if (saved.expiry) {
        const now = new Date();
        const expDate = new Date(saved.expiry + "T23:59:59");
        if (now > expDate) return res.json({ status: "error", message: "expired" });
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
      if (await getKey(key)) return res.json({ status: "error", message: "Key already exists" });

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

      const existing = await getKey(key);
      if (!existing) return res.json({ status: "error", message: "Key does not exist" });

      // Unbind device only
      if (device) {
        existing.device = null;
        await setKey(key, existing);
        return res.json({ status: "ok", message: "Device unbound", key });
      }

      // Delete key
      await deleteKey(key);
      return res.json({ status: "ok", message: "Key deleted", key });

    default:
      return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }
}
