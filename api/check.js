// Simulated Database (Temporary in-memory store)
let keysDB = {
  "ABC123": { device: null },
  "venom": { device: "18db7457294f554f" },
  "abd": {
    device: "18db7457294f554f",
    expiry: "2027-01-01" // YYYY-MM-DD
  }
};

export default async function handler(req, res) {
  const { method } = req;
  const { key, device, expiry } = req.query;

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
      const savedExpiry = keysDB[key].expiry;

      // 🔒 SAME device logic (unchanged)
      if (savedDevice && device && savedDevice !== device) {
        return res.json({ status: "invalid" });
      }

      // ⏰ EXPIRY CHECK (added)
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

      // SAME original response
      return res.json({
        status: "ok",
        key,
        device: savedDevice ? savedDevice : "Not bound",
        expiry: savedExpiry || null
      });

    // ===================== POST =====================
    case 'POST':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (keysDB[key]) {
        return res.json({ status: "error", message: "Key already exists" });
      }

      keysDB[key] = {
        device: device || null,
        expiry: expiry || null   // 🔥 ADDED
      };

      return res.json({
        status: "ok",
        message: "Key created",
        key,
        device: keysDB[key].device,
        expiry: keysDB[key].expiry
      });

    // ===================== PUT =====================
    case 'PUT':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      // SAME device update
      if (device !== undefined) {
        keysDB[key].device = device || null;
      }

      // 🔥 ADDED expiry update
      if (expiry !== undefined) {
        keysDB[key].expiry = expiry || null;
      }

      return res.json({
        status: "ok",
        message: "Key updated",
        key,
        device: keysDB[key].device,
        expiry: keysDB[key].expiry
      });

    // ===================== DELETE =====================
    case 'DELETE':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      // Unbind device only
      if (device) {
        keysDB[key].device = null;
        return res.json({
          status: "ok",
          message: "Device unbound",
          key
        });
      }

      // Delete key
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
