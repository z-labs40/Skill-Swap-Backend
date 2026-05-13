import { supabaseAdmin } from '../src/config/supabase';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function seedAdmin() {
  console.log('🚀 Seeding Admin user...');

  const email = 'admin.sb.dev@gmail.com';
  const password = 'Admin@123456';
  const name = 'SkillBridge Official';

  try {
    // 1. Connect via SQL first to check if user exists
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await pgClient.connect();

    let userId: string | undefined;

    // Check if user already exists in auth.users
    const userCheck = await pgClient.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    
    if (userCheck.rows.length > 0) {
      userId = userCheck.rows[0].id;
      console.log('ℹ️ Admin user already exists in Auth. Force updating password...');
      // Force update password so we don't get locked out
      await supabaseAdmin.auth.admin.updateUserById(userId!, { password, email_confirm: true });
    } else {
      // 2. Only sign up if user doesn't exist
      console.log(`Step 1: Creating ${email} via admin API...`);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      });

      if (authError) throw authError;
      userId = authData.user?.id;
      console.log('✅ User created in Auth!');
    }

    // 3. Upsert the profile with admin role
    console.log('Step 2: Setting up admin role in public.profiles...');
    
    if (!userId) throw new Error('Could not determine User ID');

    // Ensure no stale profile exists with this email that might cause a unique constraint error
    await pgClient.query('DELETE FROM public.profiles WHERE email = $1', [email]);

    await pgClient.query(`
      INSERT INTO public.profiles (id, name, email, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE 
      SET role = $4, status = $5;
    `, [userId, name, email, 'admin', 'active']);

    console.log(`✅ Success! User ${email} is now an Admin in the database.`);
    await pgClient.end();

  } catch (err: any) {
    console.error('❌ Error seeding admin:', err.message);
  }
}

seedAdmin();
