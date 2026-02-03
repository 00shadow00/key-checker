

// Simulated Database (Temporary in-memory store)
let keysDB = {
  "ABC123": { device: null, expiresAt: null },
  "venom": {
    device: "18db7457294f554f",
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  }
};

// Helper: check if expired
function isExpired(keyData) {
  return keyData.expiresAt && Date.now() > keyData.expiresAt;
}

export default async function handler(req, res) {
  const { method } = req;
  const { key, device, days } = req.query;

  switch (method) {

    // ================= GET =================
    case 'GET':
      if (!key) {
        return res.status(200).json(keysDB);
      }

      if (!keysDB[key]) {
        return res.json({ status: "invalid" });
      }

      // Expiry check
      if (isExpired(keysDB[key])) {
        delete keysDB[key]; // auto cleanup
        return res.json({ status: "expired" });
      }

      return res.json({
        status: "ok",
        key,
        device: keysDB[key].device || "Not bound",
        expiresAt: keysDB[key].expiresAt
      });

    // ================= POST =================
    case 'POST':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (keysDB[key]) {
        return res.json({ status: "error", message: "Key already exists" });
      }

      keysDB[key] = {
        device: device || null,
        expiresAt: days
          ? Date.now() + Number(days) * 24 * 60 * 60 * 1000
          : null
      };

      return res.json({
        status: "ok",
        message: "Key created",
        key,
        device: keysDB[key].device,
        expiresAt: keysDB[key].expiresAt
      });

    // ================= PUT =================
    case 'PUT':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      if (isExpired(keysDB[key])) {
        delete keysDB[key];
        return res.json({ status: "expired" });
      }

      keysDB[key].device = device;
      return res.json({
        status: "ok",
        message: "Device updated",
        key,
        device
      });

    // ================= DELETE =================
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

    // ================= DEFAULT =================
    default:
      return res.status(405).json({
        status: "error",
        message: "Method Not Allowed"
      });
  }
}
