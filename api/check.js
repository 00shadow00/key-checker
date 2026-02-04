// ===================== Upstash Redis Config =====================
const UPSTASH_REDIS_URL = "https://actual-drum-63266.upstash.io";
const UPSTASH_REDIS_TOKEN = "AfciAAIncDE4MjkxYmFhOTUyMzI0NTk2ODYxNDc3ZmJiNjFkZjVkOXAxNjMyNjY";

// ===================== Redis Helpers =====================
async function getKey(key) {
  const res = await fetch(`${UPSTASH_REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

// ===================== Default Keys =====================
const defaultKeys = {
  "ABC123": { device: null },
  "venom": { device: "18db7457294f554f" },
  "abdee": { device: "18db7457294f554f", expiry: "2027-01-01" },
};

// Preload defaults
async function initDefaultKeys() {
  for (const k of Object.keys(defaultKeys)) {
    const exists = await getKey(k);
    if (!exists) await fetch(`${UPSTASH_REDIS_URL}/set/${k}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: JSON.stringify(defaultKeys[k]) }),
    });
  }
}
initDefaultKeys().catch(console.error);

// ===================== API Handler =====================
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "GET only" });
  }

  // Prevent caching
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  const { key, device } = req.query;

  if (!key) return res.json({ status: "error", message: "Key required" });

  let saved = await getKey(key);

  // Auto-init default if missing
  if (!saved) {
    if (defaultKeys[key]) {
      await fetch(`${UPSTASH_REDIS_URL}/set/${key}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: JSON.stringify(defaultKeys[key]) }),
      });
      saved = defaultKeys[key];
    } else {
      return res.json({ status: "invalid" });
    }
  }

  // Device validation
  if (saved.device && device && saved.device !== device) return res.json({ status: "invalid" });

  // Expiry validation
  if (saved.expiry) {
    const now = new Date();
    const expDate = new Date(saved.expiry + "T23:59:59");
    if (now > expDate) return res.json({ status: "error", message: "expired" });
  }

  return res.json({
    status: "ok",
    key,
    device: saved.device || "Not bound",
    expiry: saved.expiry || null,
  });
}
