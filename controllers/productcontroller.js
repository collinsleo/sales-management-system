const { validationResult } = require('express-validator');

exports.addProduct = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return first error or all
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, barcode, cost_price, selling_price, quantity } = req.body;

  // Proceed to insert into DB
  // Example (pseudo-code):
  // db.query('INSERT INTO products (...) VALUES (...)', [...], ...)

  res.status(200).json({ message: 'Product added successfully.' });
};
