export default function handler(req, res) {
  const key = req.query.key;

  if (key === "12345") {
    res.status(200).json({
      status: "ok",
      message: "Valid key"
    });
  } else {
    res.status(200).json({
      status: "invalid",
      message: "Invalid key"
    });
  }
}


