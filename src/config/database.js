const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const environment = require('./environment');

const pool = new Pool({
  connectionString: environment.DATABASE_URL,
  max: 10,                           // lower if server small
  idleTimeoutMillis: 60000,          // 1 minute
  connectionTimeoutMillis: 10000,    // 10 seconds
  ssl: environment.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  statement_timeout: 60000,
  query_timeout: 60000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

pool.on('connect', (client) => {
  console.log('✅ New database connection established');
});

pool.on('remove', (client) => {
  console.log('🔌 Database connection closed');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected database error:', err.message);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (environment.NODE_ENV === 'development' && duration > 100) {
      console.log('⚠️ Slow query:', { text: text.substring(0, 100), duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('❌ Database query error:', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
};

const getClient = async () => {
  const client = await pool.connect();
  return client;
};

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    console.log('📦 Initializing database...');
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const indexesPath = path.join(__dirname, '../../database/indexes.sql');
    if (!fs.existsSync(schemaPath)) throw new Error(`Schema file not found: ${schemaPath}`);
    if (!fs.existsSync(indexesPath)) throw new Error(`Indexes file not found: ${indexesPath}`);
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    const indexesSQL = fs.readFileSync(indexesPath, 'utf-8');
    await client.query('BEGIN');
    try {
      await client.query(schemaSQL);
      console.log('✅ Database schema created/updated successfully');
      await client.query(indexesSQL);
      console.log('✅ Database indexes created/updated successfully');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, getClient, initializeDatabase };