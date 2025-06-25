const {body} = require('express-validator')

const validateExpenses = [
   
    body('amount').notEmpty().withMessage('Amount value is required')
    .isFloat({ gt: 0 }).withMessage('Amount  must be a number greater than 0'),
    body('reason').notEmpty().withMessage('reason is required'),
    body('spent_at').notEmpty().withMessage('expenditure date is required')
    .isISO8601().withMessage('expenditure date must be a valid date'),
    
];


module.exports = validateExpenses;