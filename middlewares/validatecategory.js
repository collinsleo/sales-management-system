const { check } = require('express-validator');
module.exports = validateCategory =[
    check('category')
        .notEmpty().withMessage('Category name is required.')
        .isLength({ max: 100 }).withMessage('Category name must not exceed 100 characters.')
]