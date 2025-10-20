#!/usr/bin/env node

/**
 * Verify test user exists in both Supabase Auth and Prisma database
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
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USER_EMAIL = 'ahiya.butman@gmail.com';

async function main() {
  console.log('🔍 Verifying test user in databases...\n');

  try {
    // Check Supabase Auth
    console.log('1️⃣  Checking Supabase Auth (auth.users)...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = existingUsers?.users?.find(u => u.email === USER_EMAIL);

    if (authUser) {
      console.log('   ✓ User found in Supabase Auth');
      console.log(`   - User ID: ${authUser.id}`);
      console.log(`   - Email: ${authUser.email}`);
      console.log(`   - Email confirmed: ${authUser.email_confirmed_at ? '✓ (' + authUser.email_confirmed_at + ')' : '✗'}`);
      console.log(`   - Name: ${authUser.user_metadata?.name || 'Not set'}\n`);
    } else {
      console.log('   ✗ User NOT found in Supabase Auth\n');
      return;
    }

    // Check Prisma database
    console.log('2️⃣  Checking Prisma database (User table)...');
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const prismaUser = await prisma.user.findUnique({
        where: { supabaseAuthId: authUser.id }
      });

      if (prismaUser) {
        console.log('   ✓ User found in Prisma database');
        console.log(`   - Prisma User ID: ${prismaUser.id}`);
        console.log(`   - Supabase Auth ID: ${prismaUser.supabaseAuthId}`);
        console.log(`   - Email: ${prismaUser.email}`);
        console.log(`   - Name: ${prismaUser.name || 'Not set'}\n`);

        console.log('✅ Verification complete! User exists in both databases.');
        console.log('\n📝 User Details Summary:');
        console.log(`   Supabase Auth ID: ${authUser.id}`);
        console.log(`   Prisma User ID: ${prismaUser.id}`);
        console.log(`   Email: ${USER_EMAIL}`);
        console.log(`   Email Verified: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Name: ${prismaUser.name || 'Not set'}`);
      } else {
        console.log('   ✗ User NOT found in Prisma database');
        console.log('   The user exists in Supabase Auth but not in Prisma.\n');
      }
    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
