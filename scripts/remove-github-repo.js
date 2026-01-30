#!/usr/bin/env node

/**
 * Script to remove GitHub repo from "The Furniture Store" test suite
 * This will make it use local furniture-store tests instead
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function removeGitHubRepo() {
  try {
    console.log('🔍 Looking for "The Furniture Store" test suite...');
    
    // Find the suite by name (case-insensitive, partial match)
    const { data: suites, error: searchError } = await supabase
      .from('test_suites')
      .select('id, name, github_repo')
      .ilike('name', '%Furniture Store%');
    
    if (searchError) {
      console.error('❌ Error searching for suite:', searchError);
      process.exit(1);
    }
    
    if (!suites || suites.length === 0) {
      console.error('❌ No test suite found matching "Furniture Store"');
      process.exit(1);
    }
    
    // Find the exact match or use the first one
    let targetSuite = suites.find(s => 
      s.name.toLowerCase().includes('furniture store')
    ) || suites[0];
    
    console.log(`✅ Found suite: "${targetSuite.name}" (ID: ${targetSuite.id})`);
    console.log(`   Current GitHub repo: ${targetSuite.github_repo || 'None'}`);
    
    if (!targetSuite.github_repo) {
      console.log('ℹ️  Suite already has no GitHub repo configured. Nothing to do.');
      return;
    }
    
    // Update the suite to remove GitHub repo
    console.log('🔄 Removing GitHub repo...');
    const { data: updatedSuite, error: updateError } = await supabase
      .from('test_suites')
      .update({ 
        github_repo: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetSuite.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating suite:', updateError);
      process.exit(1);
    }
    
    console.log('✅ Successfully removed GitHub repo from suite!');
    console.log(`   Suite "${updatedSuite.name}" will now use local tests`);
    console.log(`   It will look for tests in: playwright-runner/tests/furniture-store/`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

removeGitHubRepo();

