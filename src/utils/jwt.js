const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || "1d8dbfdb1328bb68cb413ab6c8d4ca33dd1db3c7bff405e5cb62b26d87332fef";

  return jwt.sign({ id }, secret, {
    expiresIn: "7d",
  });
};

module.exports = { generateToken };
