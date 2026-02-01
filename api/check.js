export default async function handler(req, res) {
  const { key, device } = req.query;

  // kunwari DB
  const keysDB = {
    "ABC123": { device: null },
    "XYZ999": { device: "a1b2c3" }
  };

  if (!keysDB[key]) {
    return res.json({ status: "invalid" });
  }

  // first time use → bind device
  if (!keysDB[key].device) {
    keysDB[key].device = device;
    return res.json({ status: "ok", bound: true });
  }

  // already bound → check device
  if (keysDB[key].device === device) {
    return res.json({ status: "ok", bound: true });
  }

  // mismatch
  return res.json({ status: "device_mismatch" });
}
