// ===================== Simulated Database (In-Memory) =====================
let keysDB = {
  "ABC123": {
    device: null,
    expiry: null
  },
  "venom": {
    device: "18db7457294f554f",
    expiry: null
  },
  "abd": {
    device: "18db7457294f554f",
    expiry: "2027-01-01" // YYYY-MM-DD
  }
};

// ===================== API Handler =====================
export default async function handler(req, res) {
  const { method } = req;

  // GET uses query, others can use body
  const { key, device } =
    method === "GET" ? req.query : req.body || {};

  switch (method) {

    // ===================== GET =====================
    case "GET": {
      // Return all keys (debug)
      if (!key) {
        return res.status(200).json(keysDB);
      }

      // Key not found
      if (!keysDB[key]) {
        return res.json({ status: "invalid" });
      }

      const { device: savedDevice, expiry } = keysDB[key];

      // 🔒 Device check
      if (savedDevice && (!device || savedDevice !== device)) {
        return res.json({ status: "invalid" });
      }

      // ⏰ Expiry check
      if (expiry) {
        const now = new Date();
        const expDate = new Date(expiry);

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
        device: savedDevice || "Not bound",
        expiry: expiry || "none"
      });
    }

    // ===================== POST =====================
    case "POST": {
      if (!key) {
        return res.json({
          status: "error",
          message: "Key is required"
        });
      }

      if (keysDB[key]) {
        return res.json({
          status: "error",
          message: "Key already exists"
        });
      }

      keysDB[key] = {
        device: device || null,
        expiry: null
      };

      return res.json({
        status: "ok",
        message: "Key created",
        key,
        device: keysDB[key].device
      });
    }

    // ===================== PUT =====================
    case "PUT": {
      if (!key) {
        return res.json({
          status: "error",
          message: "Key is required"
        });
      }

      if (!keysDB[key]) {
        return res.json({
          status: "error",
          message: "Key does not exist"
        });
      }

      if (device !== undefined) {
        keysDB[key].device = device;
      }

      return res.json({
        status: "ok",
        message: "Device updated",
        key,
        device: keysDB[key].device
      });
    }

    // ===================== DELETE =====================
    case "DELETE": {
      if (!key) {
        return res.json({
          status: "error",
          message: "Key is required"
        });
      }

      if (!keysDB[key]) {
        return res.json({
          status: "error",
          message: "Key does not exist"
        });
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
    }

    // ===================== DEFAULT =====================
    default:
      return res.status(405).json({
        status: "error",
        message: "Method Not Allowed"
      });
  }
}
