const { body } = require('express-validator');

module.exports = validateProduct = [
  body('pName')
    .notEmpty().withMessage('Product name is required.')
    .isLength({ max: 70 }).withMessage('Name must not exceed 70 characters.'),

  body('cartonCostPrice')
    .notEmpty().withMessage('Carton cost price is required.')
    .isFloat({ gt: 0 }).withMessage('Carton cost price must be a number greater than 0.'),

  body('cartonSellingPrice')
    .notEmpty().withMessage('Carton selling price is required.')
    .isFloat({ gt: 0 }).withMessage('Carton cost price must be a number greater than 0.'),

  body('unitPerCarton')
    .notEmpty().withMessage('Unit per carton is required.')
    .isInt({ min: 0 }).withMessage('Quantity must be 0 or more.'),

  body('unitCostPrice')
    .notEmpty().withMessage('Unit cost price is required.')
    .isFloat({ gt: 0 }).withMessage('Cost price must be a number greater than 0.'),

  body('unitSellingPrice')
    .notEmpty().withMessage('Unit selling price is required.')
    .isFloat({ gt: 0 }).withMessage('Selling price must be a number greater than 0.'),

  body('treshold')
    .notEmpty().withMessage('treshold is required.')
    .isInt({ min: 0 }).withMessage('Quantity must be 0 or more.'),

  // Optional: Validate image file (Multer handles file type & size)
];
