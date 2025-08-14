// backend/middleware/validate.js
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errs = result.array();
    return res.status(400).json({ error: errs[0].msg, details: errs });
  }
  next();
}

module.exports = { validate };
