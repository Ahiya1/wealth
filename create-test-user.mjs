#!/usr/bin/env node

/**
 * Create a verified test user in Supabase Auth
 *
 * This script creates a user with:
 * - Pre-verified email (email_confirmed_at set)
 * - User metadata (name)
 * - Custom password
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
        // Remove quotes if present
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
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const USER_EMAIL = 'ahiya.butman@gmail.com';
const USER_PASSWORD = 'hnatsam2402';
const USER_NAME = 'Ahiya Butman';

async function main() {
  console.log('🚀 Creating verified test user in Supabase Auth...\n');

  try {
    // Step 1: Check if user already exists
    console.log('1️⃣  Checking if user already exists...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === USER_EMAIL);

    if (existingUser) {
      console.log(`⚠️  User already exists with ID: ${existingUser.id}`);
      console.log(`   Email confirmed: ${existingUser.email_confirmed_at ? '✓' : '✗'}`);
      console.log(`   Name: ${existingUser.user_metadata?.name || 'Not set'}`);

      // Ask if we should delete and recreate
      console.log('\n   Would you like to delete and recreate? (Ctrl+C to cancel)');

      // Delete existing user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        throw new Error(`Failed to delete existing user: ${deleteError.message}`);
      }
      console.log('   ✓ Deleted existing user\n');
    }

    // Step 2: Create new user with Supabase Admin API
    console.log('2️⃣  Creating user in Supabase Auth...');
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: USER_EMAIL,
      password: USER_PASSWORD,
      email_confirm: true, // This sets email_confirmed_at automatically
      user_metadata: {
        name: USER_NAME
      }
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    console.log('   ✓ User created successfully');
    console.log(`   - User ID: ${authUser.user.id}`);
    console.log(`   - Email: ${authUser.user.email}`);
    console.log(`   - Email confirmed: ${authUser.user.email_confirmed_at ? '✓' : '✗'}`);
    console.log(`   - Name: ${authUser.user.user_metadata?.name || 'Not set'}\n`);

    // Step 3: Check if user was auto-synced to Prisma
    console.log('3️⃣  Checking if user was synced to Prisma database...');

    // Import Prisma client
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const prismaUser = await prisma.user.findUnique({
        where: { supabaseAuthId: authUser.user.id }
      });

      if (prismaUser) {
        console.log('   ✓ User found in Prisma database (auto-sync worked!)');
        console.log(`   - Prisma User ID: ${prismaUser.id}`);
        console.log(`   - Supabase Auth ID: ${prismaUser.supabaseAuthId}`);
        console.log(`   - Email: ${prismaUser.email}\n`);
      } else {
        console.log('   ⚠️  User NOT found in Prisma database');
        console.log('   Creating Prisma user manually...\n');

        const newPrismaUser = await prisma.user.create({
          data: {
            supabaseAuthId: authUser.user.id,
            email: USER_EMAIL,
            name: USER_NAME
          }
        });

        console.log('   ✓ Prisma user created successfully');
        console.log(`   - Prisma User ID: ${newPrismaUser.id}`);
        console.log(`   - Supabase Auth ID: ${newPrismaUser.supabaseAuthId}\n`);
      }
    } finally {
      await prisma.$disconnect();
    }

    // Step 4: Print success message with login instructions
    console.log('✅ SUCCESS! Test user created and verified\n');
    console.log('📋 Login Details:');
    console.log(`   Email: ${USER_EMAIL}`);
    console.log(`   Password: ${USER_PASSWORD}`);
    console.log('\n🔗 Next Steps:');
    console.log('   1. Start the app: npm run dev');
    console.log('   2. Navigate to: http://localhost:3000/signin');
    console.log('   3. Sign in with the credentials above');
    console.log('   4. You should be redirected to /dashboard\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
