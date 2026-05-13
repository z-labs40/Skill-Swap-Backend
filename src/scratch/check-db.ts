import { supabaseAdmin } from '../config/supabase';

async function checkTable() {
  try {
    const { data, error } = await supabaseAdmin.from('swap_requests').select('*').limit(1);
    if (error) {
      console.log('swap_requests table does not exist or error:', error.message);
      // Try to create it if possible (Supabase might not allow DDL via JS client easily depending on permissions)
    } else {
      console.log('swap_requests table exists!');
    }
  } catch (err) {
    console.error('Error checking table:', err);
  }
}

checkTable();
