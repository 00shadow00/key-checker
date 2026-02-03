// Simulated Database (Temporary in-memory store)
let keysDB = {
  "ABC123": { device: null },
  "venom": { device: "18db7457294f554f" },
  "aj": {device: "18db7457294f554f" }
};

export default async function handler(req, res) {
  const { method } = req;
  const { key, device } = req.query;

  // --- COMMON VALIDATION ---
  if (!key) {
    return res.status(400).json({ status: "error", message: "Key is required" });
  }

  if (!keysDB[key]) {
    return res.json({ status: "invalid", message: "Key does not exist" });
  }

  // --- DEVICE CHECK ---
  if (keysDB[key].device) {
    if (!device || keysDB[key].device !== device) {
      return res.json({
        status: "invalid_device",
        message: "Device does not match the key"
      });
    }
  }

  // --- METHOD HANDLING ---
  switch (method) {

    // GET: Return key info
    case 'GET':
      return res.json({
        status: "ok",
        key,
        device: keysDB[key].device || "Not bound"
      });

    // POST: Create a new key (only if key doesn't exist)
    case 'POST':
      if (keysDB[key]) {
        return res.json({ status: "error", message: "Key already exists" });
      }
      keysDB[key] = { device: device || null };
      return res.json({ status: "ok", message: "Key created", key, device: keysDB[key].device });

    // PUT: Bind a device to an unbound key
    case 'PUT':
      if (!keysDB[key].device) {
        keysDB[key].device = device;
        return res.json({ status: "ok", message: "Device bound", key, device });
      } else {
        return res.json({ status: "error", message: "Key already bound. Cannot update without permission." });
      }

    // DELETE: Unbind device or delete key
    case 'DELETE':
      if (device) {
        // Only allow unbind if device matches (already enforced by top check)
        keysDB[key].device = null;
        return res.json({ status: "ok", message: "Device unbound", key });
      } else {
        // Delete key completely
        delete keysDB[key];
        return res.json({ status: "ok", message: "Key deleted", key });
      }

    default:
      return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }
}
