require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEMail = async ({ to, subject, html }) => {
    console.log(process.env.EMAIL_USER);
    
    try {
        const info = await transporter.sendMail({
            from: `"Ogbu-oge Store" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        console.log('email sent');
        return true;
    } catch (err) {
        console.error('Error occurred sending email', err);
        return false;
    }
};

module.exports = sendEMail;