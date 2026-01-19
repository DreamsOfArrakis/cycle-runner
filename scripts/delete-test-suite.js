#!/usr/bin/env node

/**
 * Script to delete a test suite from the database
 * Usage: node scripts/delete-test-suite.js <suite-name-or-id>
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
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
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
  console.error('Please ensure these are set (e.g., by sourcing your .env.local file).');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deleteTestSuite() {
  const suiteIdentifier = process.argv[2];

  if (!suiteIdentifier) {
    console.error('❌ Error: Please provide a test suite name or ID');
    console.error('Usage: node scripts/delete-test-suite.js <suite-name-or-id>');
    process.exit(1);
  }

  try {
    // First, try to find the suite by name or ID
    let suite = null;
    
    // Try as ID first (UUID format)
    if (suiteIdentifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data, error } = await supabaseAdmin
        .from('test_suites')
        .select('*')
        .eq('id', suiteIdentifier)
        .single();
      
      if (!error && data) {
        suite = data;
      }
    }
    
    // If not found by ID, try by name
    if (!suite) {
      const { data, error } = await supabaseAdmin
        .from('test_suites')
        .select('*')
        .ilike('name', `%${suiteIdentifier}%`);
      
      if (!error && data && data.length > 0) {
        if (data.length === 1) {
          suite = data[0];
        } else {
          console.log(`\nFound ${data.length} matching test suites:`);
          data.forEach((s, i) => {
            console.log(`  ${i + 1}. ${s.name} (ID: ${s.id})`);
          });
          console.error('\n❌ Multiple suites found. Please use the suite ID instead.');
          process.exit(1);
        }
      }
    }

    if (!suite) {
      console.error(`❌ Test suite not found: ${suiteIdentifier}`);
      process.exit(1);
    }

    console.log(`\n📋 Found test suite:`);
    console.log(`   Name: ${suite.name}`);
    console.log(`   ID: ${suite.id}`);
    console.log(`   User ID: ${suite.user_id}`);
    console.log(`   GitHub Repo: ${suite.github_repo || 'None'}`);
    console.log(`   Active: ${suite.is_active}`);

    // Check for associated test runs
    const { data: testRuns, error: runsError } = await supabaseAdmin
      .from('test_runs')
      .select('id, status, created_at')
      .eq('suite_id', suite.id);

    if (runsError) {
      console.error('⚠️  Error checking test runs:', runsError.message);
    } else if (testRuns && testRuns.length > 0) {
      console.log(`\n⚠️  Warning: This suite has ${testRuns.length} associated test run(s).`);
      console.log('   They will need to be deleted separately if desired.');
    }

    // Delete the suite
    const { error: deleteError } = await supabaseAdmin
      .from('test_suites')
      .delete()
      .eq('id', suite.id);

    if (deleteError) {
      console.error('❌ Error deleting test suite:', deleteError.message);
      process.exit(1);
    }

    console.log(`\n✅ Successfully deleted test suite: ${suite.name}`);
    console.log(`   ID: ${suite.id}\n`);

  } catch (error) {
    console.error('❌ An unexpected error occurred:', error.message);
    process.exit(1);
  }
}

deleteTestSuite();

