const {body} = require('express-validator');


const validateSupplyer = [
    body('product')
        .notEmpty().withMessage('Supplyer product is required.'),
    body('sName')
        .notEmpty().withMessage('Supplyer name is required.')
        .isLength({ max: 255 }).withMessage('Name must not exceed 255 characters.')
        .isLength({ min: 2 }).withMessage('Name must not be less 3 characters.'),
    body('sPhone')
        .notEmpty().withMessage('Supplyer phone is required.')
        .isMobilePhone('any').withMessage('Invalid phone number format.')
        .isLength({ max: 15 }).withMessage('Phone number must not exceed 15 characters.'),
    body('sAddress')
        .notEmpty().withMessage('Supplyer address is required.')
        .isLength({ max: 255 }).withMessage('Address must not exceed 255 characters.')
        .isLength({ min: 5 }).withMessage('Address must not be less than 5 characters.'),
    body('sCompany')
        .notEmpty().withMessage('Supplyer company is required.')
        .isLength({ max: 255 }).withMessage('Company name must not exceed 255 characters.')
        .isLength({ min: 2 }).withMessage('Company name must not be less than 2 characters.'),
]

module.exports = validateSupplyer;