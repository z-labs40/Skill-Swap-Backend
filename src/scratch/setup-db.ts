import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function describeTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Check messages table columns
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
    `);
    console.log('Messages columns:', res.rows);

    // Create swap_requests table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS swap_requests (
        id TEXT PRIMARY KEY,
        sender_id UUID REFERENCES profiles(id),
        receiver_id UUID REFERENCES profiles(id),
        skill TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('swap_requests table created or already exists.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

describeTables();
