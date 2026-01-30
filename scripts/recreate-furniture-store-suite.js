#!/usr/bin/env node

/**
 * Script to delete "The Furniture Store - Regression Tests" and create a new
 * "The Furniture Store" suite that uses local furniture-store tests
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

async function recreateFurnitureStoreSuite() {
  try {
    console.log('🔍 Looking for "The Furniture Store - Regression Tests" suite...');
    
    // Find the old suite
    const { data: oldSuites, error: searchError } = await supabase
      .from('test_suites')
      .select('id, name, user_id')
      .ilike('name', '%Furniture Store%');
    
    if (searchError) {
      console.error('❌ Error searching for suite:', searchError);
      process.exit(1);
    }
    
    if (!oldSuites || oldSuites.length === 0) {
      console.log('ℹ️  No existing "Furniture Store" suite found. Creating new one...');
    } else {
      // Find the exact match
      const oldSuite = oldSuites.find(s => 
        s.name.toLowerCase().includes('furniture store')
      ) || oldSuites[0];
      
      console.log(`✅ Found old suite: "${oldSuite.name}" (ID: ${oldSuite.id})`);
      console.log('🗑️  Deleting old suite...');
      
      // Delete the old suite
      const { error: deleteError } = await supabase
        .from('test_suites')
        .delete()
        .eq('id', oldSuite.id);
      
      if (deleteError) {
        console.error('❌ Error deleting old suite:', deleteError);
        process.exit(1);
      }
      
      console.log('✅ Old suite deleted successfully!');
      
      // Use the same user_id for the new suite
      var userId = oldSuite.user_id;
    }
    
    // If we didn't find an old suite, we need to get a user_id
    // For admin user, we can find any user or use a default
    if (!userId) {
      console.log('🔍 Finding a user to create the suite for...');
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (!profiles || profiles.length === 0) {
        console.error('❌ No users found in database. Please create a user first.');
        process.exit(1);
      }
      
      userId = profiles[0].id;
      console.log(`✅ Using user ID: ${userId}`);
    }
    
    // Create the new suite
    console.log('✨ Creating new "The Furniture Store" suite...');
    const { data: newSuite, error: createError } = await supabase
      .from('test_suites')
      .insert({
        user_id: userId,
        name: 'The Furniture Store',
        description: 'Test suite for furniture store functionality using local tests',
        github_repo: null, // No GitHub repo - uses local tests
        is_active: true,
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating new suite:', createError);
      process.exit(1);
    }
    
    console.log('✅ Successfully created new suite!');
    console.log(`   Name: "${newSuite.name}"`);
    console.log(`   ID: ${newSuite.id}`);
    console.log(`   GitHub Repo: ${newSuite.github_repo || 'None (using local tests)'}`);
    console.log(`   It will use tests from: playwright-runner/tests/furniture-store/`);
    console.log('\n🎉 Done! Refresh your dashboard to see the new suite.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

recreateFurnitureStoreSuite();

