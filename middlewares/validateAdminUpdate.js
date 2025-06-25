const {body} = require('express-validator');

const adminUpdateValidator = [
    body('fname')
        .notEmpty().withMessage('Full Name is required')
        .isLength({min: 3}).withMessage('FullName must be at least 3 characters long'),
    body('username')
        .notEmpty().withMessage('Username is required')
        .isLength({min: 3}).withMessage('Username must be at least 3 characters long'),
    body('email')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),
    body('mobile')
        .notEmpty().withMessage('Mobile number is required')
        .matches(/^\+?\d{10,15}$/).withMessage('Invalid mobile number'),
    body('address')
        .notEmpty().withMessage('Address is required')
        .isLength({min: 5}).withMessage('Address must be at least 5 characters long'),
    body('gender')
        .notEmpty().withMessage('Gender is required')
        .isIn(['male', 'female']).withMessage('gender must be either male or female'),
 
];

module.exports = adminUpdateValidator;