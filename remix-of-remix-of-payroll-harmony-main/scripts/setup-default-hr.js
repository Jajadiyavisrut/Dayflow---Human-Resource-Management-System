// Script to create default HR user in Supabase
// Run this with: node scripts/setup-default-hr.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to add this to .env

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('\nPlease add SUPABASE_SERVICE_ROLE_KEY to your .env file');
  console.log('You can get this from your Supabase project settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDefaultHR() {
  try {
    console.log('Creating default HR user...');

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'hr@dayflow.com',
      password: 'hradmin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'HR Administrator'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('User already exists, proceeding with profile setup...');
        
        // Get existing user
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === 'hr@dayflow.com');
        
        if (existingUser) {
          authData.user = existingUser;
        } else {
          throw new Error('User exists but could not be retrieved');
        }
      } else {
        throw authError;
      }
    }

    const userId = authData.user.id;
    console.log(`User created/found with ID: ${userId}`);

    // 2. Create profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        email: 'hr@dayflow.com',
        full_name: 'HR Administrator',
        department: 'Human Resources',
        position: 'HR Manager',
        status: 'active',
        salary: 0,
        remaining_annual_leave: 21,
        remaining_sick_leave: 10,
        join_date: new Date().toISOString().split('T')[0]
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    console.log('Profile created successfully');

    // 3. Create user role record
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'hr'
      });

    if (roleError) {
      console.error('Error creating user role:', roleError);
      throw roleError;
    }

    console.log('User role assigned successfully');
    console.log('\n✅ Default HR user setup complete!');
    console.log('📧 Email: hr@dayflow.com');
    console.log('🔑 Password: hradmin123');
    console.log('👤 Role: HR Administrator');

  } catch (error) {
    console.error('❌ Error setting up default HR user:', error.message);
    process.exit(1);
  }
}

setupDefaultHR();
