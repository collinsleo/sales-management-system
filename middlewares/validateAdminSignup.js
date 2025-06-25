const {body} = require('express-validator');

const adminSignupValidator = [
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
    body('role')
        .notEmpty().withMessage('Gender is required')
        .isIn(['staff', 'admin', 'manager','cashier']).withMessage('role must be either admin, manager, cashier or staff '),
    body('gender')
        .notEmpty().withMessage('Gender is required')
        .isIn(['male', 'female']).withMessage('gender must be either male or female'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({min: 6}).withMessage('Password must be at least 6 characters long'),
    body('confirm')
        .notEmpty().withMessage('Confirm Password is required'),   
];


module.exports = adminSignupValidator;