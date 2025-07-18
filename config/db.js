const env = require('dotenv');
const { Pool } = require('pg')

// Load environment variables from .env file
env.config();
const db = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DB,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT
});

// db.connect()
  // db.on('connect', () => console.log("✅ Connected to PostgreSQL"))
  db.on('error', err => console.error("❌ DB connection error", err));

module.exports = db ;