export default async function handler(req, res) {
  const { key, device } = req.query;

  // "DB"
  const keysDB = {
    "ABC123": { device: null },
    "venom": { device: "18db7457294f554f" }
  };

  // If no key is provided, just return all keys
  if (!key) {
    return res.status(200).json(keysDB);
  }

  // Existing logic for single key check/bind
  if (!keysDB[key]) {
    return res.json({ status: "invalid" });
  }

  // First-time use → bind device
  if (!keysDB[key].device) {
    keysDB[key].device = device;
    return res.json({ status: "ok", bound: true });
  }

  // Already bound → check device
  if (keysDB[key].device === device) {
    return res.json({ status: "ok", bound: true });
  }

  // Device mismatch
  return res.json({ status: "device_mismatch" });
}
