#!/usr/bin/env node

/**
 * Test login for the created user
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envFile = readFileSync(join(__dirname, '.env.local'), 'utf-8');
    const env = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    });
    return env;
  } catch (error) {
    console.error('Error reading .env.local:', error.message);
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const USER_EMAIL = 'ahiya.butman@gmail.com';
const USER_PASSWORD = 'hnatsam2402';

async function main() {
  console.log('🔐 Testing login for user:', USER_EMAIL);
  console.log('');

  try {
    // Test sign in
    console.log('1️⃣  Attempting to sign in with password...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });

    if (error) {
      console.log('❌ Login failed!');
      console.log(`   Error: ${error.message}`);
      console.log(`   Status: ${error.status || 'N/A'}`);
      console.log('');
      process.exit(1);
    }

    if (data.user) {
      console.log('✅ Login successful!');
      console.log('');
      console.log('👤 User Details:');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Email Confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   Name: ${data.user.user_metadata?.name || 'Not set'}`);
      console.log('');

      if (data.session) {
        console.log('🔑 Session Created:');
        console.log(`   Access Token: ${data.session.access_token.substring(0, 20)}...`);
        console.log(`   Refresh Token: ${data.session.refresh_token.substring(0, 20)}...`);
        console.log(`   Expires At: ${new Date(data.session.expires_at * 1000).toLocaleString()}`);
        console.log('');
      }

      console.log('✅ SUCCESS! User can sign in successfully.');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   1. Open browser to: http://localhost:3000/signin');
      console.log('   2. Enter credentials:');
      console.log(`      Email: ${USER_EMAIL}`);
      console.log(`      Password: ${USER_PASSWORD}`);
      console.log('   3. You should be redirected to: http://localhost:3000/dashboard');
      console.log('');

      // Sign out after test
      await supabase.auth.signOut();
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
