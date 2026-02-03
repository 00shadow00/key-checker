// Simulated Database (Temporary in-memory store)
let keysDB = {
  "ABC123": { device: null },
  "venom": { device: "18db7457294f554f" }
};

export default async function handler(req, res) {
  const { method } = req;  // HTTP method (GET, POST, PUT, DELETE)
  const { key, device } = req.query;  // Extract `key` and `device` from query parameters
  
  // Handle different HTTP methods
  switch (method) {
    // **GET**: Retrieve the status of a specific key or all keys
    case 'GET':
      if (!key) {
        return res.status(200).json(keysDB);  // Return all keys if no specific key is provided
      }

      if (!keysDB[key]) {
        return res.json({ status: "invalid" });  // Key doesn't exist
      }

      // Key exists, return its device status
      const deviceStatus = keysDB[key].device ? keysDB[key].device : "Not bound";
      return res.json({ status: "ok", key, device: deviceStatus });

    // **POST**: Create a new key (optionally bind it to a device)
    case 'POST':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (keysDB[key]) {
        return res.json({ status: "error", message: "Key already exists" });
      }

      // Create new key and bind it to a device if provided
      keysDB[key] = { device: device || null };
      return res.json({ status: "ok", message: "Key created", key, device: keysDB[key].device });

    // **PUT**: Update the device of an existing key
    case 'PUT':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      // Update the device (bind the key to a new device)
      keysDB[key].device = device;
      return res.json({ status: "ok", message: "Device updated", key, device });

    // **DELETE**: Delete a key or unbind its device
    case 'DELETE':
      if (!key) {
        return res.json({ status: "error", message: "Key is required" });
      }

      if (!keysDB[key]) {
        return res.json({ status: "error", message: "Key does not exist" });
      }

      // If device is provided, unbind it
      if (device) {
        keysDB[key].device = null;
        return res.json({ status: "ok", message: "Device unbound", key });
      }

      // Delete the key from the database
      delete keysDB[key];
      return res.json({ status: "ok", message: "Key deleted", key });

    // Default case for unsupported methods
    default:
      return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }
}
