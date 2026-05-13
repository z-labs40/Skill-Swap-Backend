import { supabase } from '../src/config/supabase';


async function testConnection() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
  
  if (error) {
    if (error.code === 'PGRST116') {
      console.log('✅ Connected to Supabase! (Table not found, but connection established)');
    } else {
      console.error('❌ Connection error:', error.message);
    }
  } else {
    console.log('✅ Connected to Supabase! Data:', data);
  }
}

testConnection();
