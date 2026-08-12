const {body} = require('express-validator');

const appLunchValidator = [
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
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({min: 6}).withMessage('Password must be at least 6 characters long'),
    body('confirm')
        .notEmpty().withMessage('Confirm Password is required'),   
];


module.exports = appLunchValidator;