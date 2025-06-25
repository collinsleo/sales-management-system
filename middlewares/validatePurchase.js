const {body} = require('express-validator')

const validatePurchase = [
    body('product_id')
    .notEmpty().withMessage('product id is required')
    .isInt({min:1}).withMessage('invalid product id'),
    body('supplyer_id')
    .notEmpty().withMessage('supplyer id is required')
    .isInt({min:1}).withMessage('invalid supplyer id'),
    body('carton')
    .notEmpty().withMessage('carton id is required')
    .isInt({min:1}).withMessage('carton can\'t be less than 1'),
    body('unit_cost_price')
    .notEmpty().withMessage('unit cost price is required')
    .isFloat({gt:1}).withMessage('price can\'t be less than 1')

]

module.exports  = validatePurchase;