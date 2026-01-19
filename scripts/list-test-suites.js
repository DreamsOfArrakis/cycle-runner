#!/usr/bin/env node

/**
 * Script to list all test suites in the database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    // Ignore read errors
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
  console.error('Please ensure these are set (e.g., by sourcing your .env.local file).');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function listTestSuites() {
  try {
    // Get all test suites
    const { data: suites, error } = await supabaseAdmin
      .from('test_suites')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Get all profiles to map user_id to company_name
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, company_name');
    
    const profileMap = {};
    if (profiles) {
      profiles.forEach(profile => {
        profileMap[profile.id] = profile.company_name;
      });
    }

    if (error) {
      console.error('❌ Error fetching test suites:', error.message);
      process.exit(1);
    }

    if (!suites || suites.length === 0) {
      console.log('No test suites found in the database.');
      return;
    }

    console.log(`\n📋 Found ${suites.length} test suite(s):\n`);
    
    suites.forEach((suite, index) => {
      const company = profileMap[suite.user_id] || 'Unknown';
      console.log(`${index + 1}. ${suite.name}`);
      console.log(`   ID: ${suite.id}`);
      console.log(`   User ID: ${suite.user_id}`);
      console.log(`   Company: ${company}`);
      console.log(`   GitHub Repo: ${suite.github_repo || 'None'}`);
      console.log(`   Active: ${suite.is_active}`);
      console.log(`   Created: ${new Date(suite.created_at).toLocaleString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ An unexpected error occurred:', error.message);
    process.exit(1);
  }
}

listTestSuites();

