// Simulated Database (Temporary in-memory store)
let keysDB = {
  "ABC123": { device: null },
  "venom": { device: "18db7457294f554f" }
};

export default async function handler(req, res) {
  const { method } = req;
  const { key, device } = req.query;

  switch (method) {

    // --- GET: Retrieve key status ---
    case 'GET':
      if (!key) {
        return res.status(200).json(keysDB); // Return all keys
      }

      if (!keysDB[key]) {
        return res.json({ status: "invalid" });
      }

      return res.json({
        status: "ok",
        key,
        device: keysDB[key].device || "Not bound"
      });

    // --- POST: Create a new key ---
    case 'POST':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (keysDB[key]) {
        return res.json({ status: "error", message: "Key already exists" });
      }

      keysDB[key] = { device: device || null };
      return res.json({ status: "ok", message: "Key created", key, device: keysDB[key].device });

    // --- PUT: Bind a device to an unbound key (cannot update existing binding) ---
    case 'PUT':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      // Prevent changing device if already bound
      if (keysDB[key].device) {
        return res.json({ status: "error", message: "Key is already bound to a device. Cannot update without permission." });
      }

      // Bind the key to the device
      keysDB[key].device = device;
      return res.json({ status: "ok", message: "Device bound", key, device });

    // --- DELETE: Unbind device or delete key ---
    case 'DELETE':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      // Unbind device only if the correct device is provided
      if (device) {
        if (keysDB[key].device !== device) {
          return res.json({ status: "error", message: "Device does not match the key. Cannot unbind." });
        }
        keysDB[key].device = null;
        return res.json({ status: "ok", message: "Device unbound", key });
      }

      // Delete key completely (allowed regardless of device binding)
      delete keysDB[key];
      return res.json({ status: "ok", message: "Key deleted", key });

    // --- Unsupported methods ---
    default:
      return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }
}
