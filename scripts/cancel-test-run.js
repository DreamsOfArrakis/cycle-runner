#!/usr/bin/env node

/**
 * Script to cancel a test run in the database
 * Usage: node scripts/cancel-test-run.js <runId>
 */

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

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cancelTestRun() {
  const runId = process.argv[2];

  if (!runId) {
    console.error('Usage: node scripts/cancel-test-run.js <runId>');
    console.error('');
    console.error('To find the runId:');
    console.error('  - Check the URL when viewing a test run (e.g., /dashboard/runs/{runId})');
    console.error('  - Or check the Test Run History table on the suite page');
    process.exit(1);
  }

  console.log(`🛑 Cancelling test run: ${runId}\n`);

  try {
    // First, check if the run exists
    const { data: run, error: fetchError } = await supabase
      .from('test_runs')
      .select('id, status, suite_id, test_suites(name)')
      .eq('id', runId)
      .single();

    if (fetchError || !run) {
      console.error(`❌ Test run not found: ${runId}`);
      process.exit(1);
    }

    console.log(`📋 Found test run:`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Suite: ${run.test_suites?.name || 'Unknown'}`);

    if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') {
      console.log(`⚠️  Test run is already ${run.status}`);
      process.exit(0);
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('test_runs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    if (updateError) {
      console.error(`❌ Error updating test run:`, updateError.message);
      process.exit(1);
    }

    console.log(`✅ Successfully cancelled test run: ${runId}`);
  } catch (error) {
    console.error(`❌ An unexpected error occurred:`, error.message);
    process.exit(1);
  }
}

cancelTestRun();

