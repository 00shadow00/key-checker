// Simulated Database (Temporary in-memory store)
let keysDB = {
  "ABC123": { device: null },
  "venom": { device: "18db7457294f554f" },
  "abdee": {
    device: "18db7457294f554f",
    expiry: "2027-01-01" // YYYY-MM-DD
  }
};

export default async function handler(req, res) {
  const { method } = req;
  const { key, device } = req.query;

  if (method !== 'GET') {
    return res.status(405).json({
      status: "error",
      message: "Method Not Allowed"
    });
  }

  // Return all keys if no specific key is requested
  if (!key) {
    return res.status(200).json(keysDB);
  }

  // Key not found
  if (!keysDB[key]) {
    return res.json({ status: "invalid" });
  }

  const savedDevice = keysDB[key].device;
  const savedExpiry = keysDB[key].expiry;

  // 🔒 SAME device logic
  if (savedDevice && device && savedDevice !== device) {
    return res.json({ status: "invalid" });
  }

  // ⏰ EXPIRY CHECK
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

  // Return key info
  return res.json({
    status: "ok",
    key,
    device: savedDevice ? savedDevice : "Not bound",
    expiry: savedExpiry || null
  });
}
