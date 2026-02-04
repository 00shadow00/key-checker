const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function sb(path, method = "GET", body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: body ? JSON.stringify(body) : undefined
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

      const data = await sb(`keys?key=eq.${key}`);
      if (!data || data.length === 0) {
        return res.json({ status: "invalid" });
      }

      const saved = data[0];

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
        expiry: saved.expiry || null
      });
    }

    // ===================== POST =====================
    if (method === "POST") {
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      const exists = await sb(`keys?key=eq.${key}`);
      if (exists.length > 0) {
        return res.json({ status: "error", message: "Key already exists" });
      }

      await sb("keys", "POST", {
        key,
        device: device || null,
        expiry: expiry || null
      });

      return res.json({ status: "ok", message: "Key created", key });
    }

    // ===================== PUT =====================
    if (method === "PUT") {
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      const data = await sb(`keys?key=eq.${key}`);
      if (data.length === 0) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      const update = {};
      if (device !== undefined) update.device = device || null;
      if (expiry !== undefined) update.expiry = expiry || null;

      await sb(`keys?key=eq.${key}`, "PATCH", update);

      return res.json({ status: "ok", message: "Key updated", key });
    }

    // ===================== DELETE =====================
    if (method === "DELETE") {
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (device) {
        await sb(`keys?key=eq.${key}`, "PATCH", { device: null });
        return res.json({ status: "ok", message: "Device unbound", key });
      }

      await sb(`keys?key=eq.${key}`, "DELETE");
      return res.json({ status: "ok", message: "Key deleted", key });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server crashed" });
  }
}
