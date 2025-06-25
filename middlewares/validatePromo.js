const {body} = require('express-validator')

const validatePromo = [
    body('product_id').notEmpty().withMessage('product id is required')
    .isInt({ min: 0 }).withMessage('Quantity must be 0 or more.'),
    body('discount_type').notEmpty().withMessage('Discount type is required')
    .isIn(['percent', 'fiat']).withMessage('Discount type must be either percentage or fixed'),
    body('applied_to').notEmpty().withMessage('Applied to is required')
    .isIn(['carton', 'unit', 'both']).withMessage('Applied to must be either carton or unit'),
    body('discount').notEmpty().withMessage('Discount value is required')
    .isFloat({ gt: 0 }).withMessage('Discount value must be a number greater than 0'),
    body('start_at').notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),
    body('end_at').notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date')
    .custom((value, {req}) => {
        if (new Date(value) <= new Date(req.body.start_at)) {
            throw new Error('End date must be after start date');
        }
        return true;
    })
];


module.exports = validatePromo;