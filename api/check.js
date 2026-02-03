// Simulated Database (Temporary in-memory store)
let keysDB = {
  "ABC123": { device: null },
  "venom": { device: "18db7457294f554f" }
};

export default async function handler(req, res) {
  const { method } = req;      // HTTP method
  const { key, device } = req.query;  // Query params

  switch (method) {

    // ===================== GET =====================
    case 'GET':
      // Return all keys
      if (!key) {
        return res.status(200).json(keysDB);
      }

      // Key not found
      if (!keysDB[key]) {
        return res.json({ status: "invalid" });
      }

      const savedDevice = keysDB[key].device;

      // 🔒 ADDED: device mismatch check (minimal change)
      if (savedDevice && device && savedDevice !== device) {
        return res.json({ status: "invalid" });
      }

      // Original behavior
      const deviceStatus = savedDevice ? savedDevice : "Not bound";
      return res.json({
        status: "ok",
        key,
        device: deviceStatus
      });

    // ===================== POST =====================
    case 'POST':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (keysDB[key]) {
        return res.json({ status: "error", message: "Key already exists" });
      }

      keysDB[key] = { device: device || null };
      return res.json({
        status: "ok",
        message: "Key created",
        key,
        device: keysDB[key].device
      });

    // ===================== PUT =====================
    case 'PUT':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      keysDB[key].device = device;
      return res.json({
        status: "ok",
        message: "Device updated",
        key,
        device
      });

    // ===================== DELETE =====================
    case 'DELETE':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      if (device) {
        keysDB[key].device = null;
        return res.json({
          status: "ok",
          message: "Device unbound",
          key
        });
      }

      delete keysDB[key];
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
