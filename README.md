# sales-management-system
Sales Management System (Node.js + Express)
A simple, powerful backend application that helps small businesses track inventory, record sales, calculate profit/loss, and get notifications for low stock — all in one place.

🚀 Features
. Product & Inventory Management

. Track Sales & Profit

. Daily, Monthly & Overall Reports

. Low Stock Alert Notifications

. Product Promo

. Product supplyer info

. Receipt Generation

🔐 User Authentication & Role Management

📬 Email Integration (e.g., low stock alerts)

🔧 Built With
Node.js

Express.js

PostgreSQL

EJS (templating engine)

Bootstrap

Passport.js (authentication)

Nodemailer (email)

📁 Folder Structure

├── config/
├── middleware/
├── documentation/
├── public/
├── routes/
├── views/
├── .env
├── server.js
├── package.json


⚙️ Installation
git clone https://github.com/yourusername/sales-management-system.git
cd sales-management-system
npm install
Create a .env file and add the following:

Add

PORT=3000
DATABASE_URL=your_postgres_url
EMAIL_USER=your_email
EMAIL_PASS=your_password
🧪 Running the App

Run the code 
npm run dev
Visit: http://localhost:3000

📦 Database Setup
Set up PostgreSQL database with the following tables:

users

products

sales

notifications

(SQL migration script can be found in /config/db.sql )

📬 Email Notification Setup
Make sure to set up your Gmail or SMTP service credentials in .env.

🌍 Deployment
You can deploy this app using:

Render.com

Railway

Vercel (backend API only)

Any VPS with Node.js and PostgreSQL support

📚 Documentation
If you want a full step-by-step guide with code walkthroughs, see the E-book version here (https://paystack.shop/add-a-smart-tech-to-your-business).

👨‍💻 Author
CodedCraft
Backend Engineer & Node.js Developer
whatsapp: https://wa.link/iyh9mj | email: codedcrafter@gmail.com | linktree: lintr.ee/codedcraft

💡 License
This project is open-source for learning.
For commercial use or rebranding, contact me.
cheack out LICENCE.txt

