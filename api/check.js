export default function handler(req, res) {
  const key = req.query.key;

  const VALID_KEYS = ["12345", "ABCDE", "XYZ789"];
if (VALID_KEYS.includes(key)) {
    res.status(200).json({status:"ok", message:"Valid key"});
} else {
    res.status(200).json({status:"invalid", message:"Invalid key"});
}

}


