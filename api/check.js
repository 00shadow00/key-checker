// Temporary in-memory store
let keysDB = {
  "ABC123": { device: null, expiresAt: null },
  "venom": { device: "18db7457294f554f", expiresAt: Date.now() + 3*24*3600*1000 },
  "aj": { device: "18db7457294f554f", expiresAt: Date.now() + 3*24*3600*1000 }
};

export default async function handler(req, res) {
  const { method } = req;
  const { key, device, days } = req.query;

  // --- COMMON VALIDATION ---
  if (!key) return res.status(400).json({ status: "error", message: "Key is required" });

  // Helper to calculate expiresAt
  const daysToMillis = (d) => (parseInt(d) || 0) * 24 * 3600 * 1000;

  // --- DEVICE CHECK ---
  if (keysDB[key] && keysDB[key].device) {
    if (!device || keysDB[key].device !== device) {
      return res.json({ status: "invalid_device", message: "Device does not match the key" });
    }
  }

  switch (method) {
    // GET: Return all keys info
    case 'GET':
      const result = {};
      for (const k in keysDB) {
        result[k] = {
          device: keysDB[k].device || "Not bound",
          expiresAt: keysDB[k].expiresAt || null
        };
      }
      return res.json(result);

    // POST: Create new key
    case 'POST':
      if (keysDB[key]) return res.json({ status: "error", message: "Key already exists" });
      keysDB[key] = { device: device || null, expiresAt: days ? Date.now() + daysToMillis(days) : null };
      return res.json({ status: "ok", message: "Key created", key, device: keysDB[key].device });

    // PUT: Bind device to key
    case 'PUT':
      if (!keysDB[key]) return res.json({ status: "invalid", message: "Key does not exist" });
      if (!keysDB[key].device) {
        keysDB[key].device = device;
        if (days) keysDB[key].expiresAt = Date.now() + daysToMillis(days);
        return res.json({ status: "ok", message: "Device bound", key, device });
      } else {
        return res.json({ status: "error", message: "Key already bound. Cannot update without permission." });
      }

    // DELETE: Unbind device or delete key
    case 'DELETE':
      if (!keysDB[key]) return res.json({ status: "invalid", message: "Key does not exist" });
      if (device) {
        // Device check already enforced above
        keysDB[key].device = null;
        return res.json({ status: "ok", message: "Device unbound", key });
      } else {
        delete keysDB[key];
        return res.json({ status: "ok", message: "Key deleted", key });
      }

    default:
      return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }
}
