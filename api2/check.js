
const keys = {
  "ABC123": {
    device: null,
    expiresAt: 1893456000000 // Jan 1, 2030
  },
  "DEF456": {
    device: "device-aaa",
    expiresAt: 1700000000000 // expired example
  }
};

export default function handler(req, res) {
  const { key, device } = req.query;

  if (!key || !device) {
    return res.json({ valid: false });
  }

  const record = keys[key];
  if (!record) {
    return res.json({ valid: false });
  }

  // expiry check
  if (Date.now() > record.expiresAt) {
    return res.json({ valid: false, reason: "expired" });
  }

  // first use → bind device
  if (record.device === null) {
    record.device = device;
    return res.json({
      valid: true,
      bound: true,
      expiresAt: record.expiresAt
    });
  }

  // same device
  if (record.device === device) {
    return res.json({
      valid: true,
      expiresAt: record.expiresAt
    });
  }

  // different device
  return res.json({
    valid: false,
    reason: "device_mismatch"
  });
}
