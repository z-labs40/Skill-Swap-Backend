import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Creating tables...');

    // 1. Profiles Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
        offers TEXT[],
        seeks TEXT[],
        rating FLOAT DEFAULT 5.0,
        total_swaps INT DEFAULT 0,
        phone TEXT,
        dob TEXT,
        match INT DEFAULT 0,
        status TEXT DEFAULT 'active',
        reports INT DEFAULT 0,
        appeal_status TEXT DEFAULT 'none',
        appeal_message TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Profiles table ready.');

    // 2. Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id UUID NOT NULL,
        receiver_id UUID NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        type TEXT DEFAULT 'text',
        file_url TEXT
      );
    `);
    console.log('✅ Messages table ready.');

    // 3. Support Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        message TEXT NOT NULL,
        reply TEXT,
        status TEXT DEFAULT 'pending',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Support messages table ready.');

    // 4. Site Settings (for Landing Content)
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ Site settings table ready.');

    // 5. OTPs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otps (
        email TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    console.log('✅ OTPs table ready.');

    console.log('Database initialization complete!');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  } finally {
    await client.end();
  }
}

initDB();
