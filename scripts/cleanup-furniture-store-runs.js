#!/usr/bin/env node

/**
 * Cleanup script to remove test runs associated with The Furniture Store suite
 * 
 * Usage:
 *   node scripts/cleanup-furniture-store-runs.js [--dry-run] [--suite-name "The Furniture Store - Regression Tests"]
 * 
 * Options:
 *   --dry-run    Only show what would be deleted, don't actually delete
 *   --suite-name The exact name of the suite to find (default: "The Furniture Store - Regression Tests")
 */

// Note: Ensure environment variables are loaded from .env.local
// You may need to run: export $(cat .env.local | xargs) before running this script
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanupTestRuns(suiteName = 'The Furniture Store - Regression Tests', dryRun = false) {
  try {
    console.log(`🔍 Looking for test suite: "${suiteName}"...\n`);

    // Find the suite
    const { data: suite, error: suiteError } = await supabase
      .from('test_suites')
      .select('id, name')
      .eq('name', suiteName)
      .single();

    if (suiteError || !suite) {
      console.error(`❌ Error: Could not find suite with name "${suiteName}"`);
      console.error(suiteError);
      process.exit(1);
    }

    console.log(`✅ Found suite: ${suite.name} (ID: ${suite.id})\n`);

    // Find all test runs for this suite
    const { data: testRuns, error: runsError } = await supabase
      .from('test_runs')
      .select('id, status, created_at, tests_passed, tests_failed')
      .eq('suite_id', suite.id)
      .order('created_at', { ascending: false });

    if (runsError) {
      console.error('❌ Error fetching test runs:', runsError);
      process.exit(1);
    }

    if (!testRuns || testRuns.length === 0) {
      console.log('✅ No test runs found for this suite. Nothing to clean up!\n');
      return;
    }

    console.log(`📊 Found ${testRuns.length} test run(s) for this suite:\n`);
    testRuns.forEach((run, index) => {
      console.log(`  ${index + 1}. ID: ${run.id}`);
      console.log(`     Status: ${run.status}`);
      console.log(`     Created: ${new Date(run.created_at).toLocaleString()}`);
      console.log(`     Results: ${run.tests_passed || 0} passed, ${run.tests_failed || 0} failed`);
      console.log('');
    });

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No test runs were deleted.');
      console.log(`   Would delete ${testRuns.length} test run(s) if run without --dry-run\n`);
      return;
    }

    // Delete test runs (and related test_results via cascade)
    console.log(`🗑️  Deleting ${testRuns.length} test run(s)...\n`);
    
    const { error: deleteError } = await supabase
      .from('test_runs')
      .delete()
      .eq('suite_id', suite.id);

    if (deleteError) {
      console.error('❌ Error deleting test runs:', deleteError);
      process.exit(1);
    }

    console.log(`✅ Successfully deleted ${testRuns.length} test run(s)!\n`);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const suiteNameIndex = args.indexOf('--suite-name');
const suiteName = suiteNameIndex !== -1 && args[suiteNameIndex + 1] 
  ? args[suiteNameIndex + 1]
  : 'The Furniture Store - Regression Tests';

cleanupTestRuns(suiteName, dryRun)
  .then(() => {
    console.log('✨ Done!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

