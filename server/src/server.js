const app = require('./app');
const env = require('./config/env');
const pool = require('./config/db');

async function start() {
  try {
    await pool.getConnection();
    app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
