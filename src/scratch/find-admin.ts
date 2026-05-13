import { supabaseAdmin } from '../config/supabase';

async function findAdmin() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .eq('role', 'admin')
    .limit(1)
    .single();
    
  if (error) console.error('Error finding admin:', error);
  else console.log('Admin found:', data);
}

findAdmin();
