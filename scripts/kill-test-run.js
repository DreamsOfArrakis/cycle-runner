#!/usr/bin/env node

/**
 * Script to kill a running test process
 * Usage: 
 *   node scripts/kill-test-run.js <runId>
 *   node scripts/kill-test-run.js --all (kills all running test processes)
 *   node scripts/kill-test-run.js --furniture-store (kills all Furniture Store tests)
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function killProcess(pid, runId) {
  try {
    // Check if process exists
    if (process.platform === 'win32') {
      // Windows
      try {
        await execAsync(`tasklist /FI "PID eq ${pid}"`);
        await execAsync(`taskkill /pid ${pid} /T /F`);
        console.log(`✅ Killed process ${pid} (runId: ${runId})`);
        return true;
      } catch (error) {
        console.log(`⚠️  Process ${pid} may have already exited`);
        return false;
      }
    } else {
      // Unix-like (Mac, Linux)
      try {
        // Check if process exists
        await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
        // Kill the process group (negative PID)
        process.kill(-pid, 'SIGTERM');
        console.log(`✅ Sent SIGTERM to process group ${pid} (runId: ${runId})`);
        
        // Wait a bit, then force kill if still running
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
          process.kill(-pid, 'SIGKILL');
          console.log(`✅ Force killed process group ${pid}`);
        } catch {
          // Process already dead
        }
        return true;
      } catch (error) {
        console.log(`⚠️  Process ${pid} may have already exited`);
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ Error killing process ${pid}:`, error.message);
    return false;
  }
}

async function killTestRun(runId) {
  const pidDir = path.join(process.cwd(), '.cursor', 'test-pids');
  const pidFile = path.join(pidDir, `${runId}.json`);

  if (!fs.existsSync(pidFile)) {
    console.log(`⚠️  No PID file found for runId: ${runId}`);
    console.log(`   Looking for: ${pidFile}`);
    
    // Try to find by searching all PID files
    if (fs.existsSync(pidDir)) {
      const files = fs.readdirSync(pidDir);
      console.log(`   Found ${files.length} PID files in directory`);
      const matching = files.find(f => f.includes(runId.substring(0, 8)));
      if (matching) {
        console.log(`   Found similar file: ${matching}`);
      }
    }
    return false;
  }

  try {
    const pidData = JSON.parse(fs.readFileSync(pidFile, 'utf-8'));
    const { pid, runId: fileRunId } = pidData;
    
    console.log(`📋 Found PID file for runId: ${fileRunId}`);
    console.log(`   PID: ${pid}`);
    console.log(`   Timestamp: ${new Date(pidData.timestamp).toLocaleString()}`);

    if (!pid) {
      console.log(`⚠️  No PID in file`);
      return false;
    }

    const killed = await killProcess(pid, runId);
    
    // Update database status regardless of whether process was killed
    await updateDatabaseStatus(runId, 'cancelled');
    
    if (killed) {
      // Clean up PID file
      fs.unlinkSync(pidFile);
      console.log(`🗑️  Removed PID file: ${pidFile}`);
    }
    
    return killed;
  } catch (error) {
    console.error(`❌ Error reading PID file:`, error.message);
    return false;
  }
}

async function updateDatabaseStatus(runId, status = 'cancelled') {
  try {
    // Try to load environment variables
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
      console.log(`⚠️  Cannot update database: Missing environment variables`);
      return false;
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from('test_runs')
      .update({
        status: status,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    if (error) {
      console.error(`❌ Error updating database:`, error.message);
      return false;
    }

    console.log(`✅ Updated database: ${runId} -> ${status}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating database:`, error.message);
    return false;
  }
}

async function killAllTests() {
  const pidDir = path.join(process.cwd(), '.cursor', 'test-pids');
  
  if (!fs.existsSync(pidDir)) {
    console.log('No PID directory found');
    return;
  }

  const files = fs.readdirSync(pidDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} PID files`);

  for (const file of files) {
    const pidFile = path.join(pidDir, file);
    try {
      const pidData = JSON.parse(fs.readFileSync(pidFile, 'utf-8'));
      const { pid, runId } = pidData;
      
      if (pid) {
        console.log(`\n📋 Processing: ${runId} (PID: ${pid})`);
        await killProcess(pid, runId);
        
        // Update database status
        await updateDatabaseStatus(runId, 'cancelled');
        
        fs.unlinkSync(pidFile);
        console.log(`🗑️  Removed PID file`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  // Also kill any remaining Playwright Chrome processes
  console.log(`\n🧹 Cleaning up Playwright Chrome processes...`);
  try {
    if (process.platform !== 'win32') {
      await execAsync(`pkill -f "Google Chrome for Testing" || true`);
      await execAsync(`pkill -f "playwright.*test-server" || true`);
      console.log(`✅ Cleaned up Playwright processes`);
    }
  } catch (error) {
    console.log(`⚠️  Could not clean up Playwright processes: ${error.message}`);
  }
}

async function killFurnitureStoreTests() {
  // We need to check the database to find Furniture Store test runs
  // For now, just kill all and let the user specify runId
  console.log('To kill Furniture Store tests, you need the runId.');
  console.log('You can find it in the URL when viewing the test run detail page.');
  console.log('Or use: node scripts/kill-test-run.js --all');
}

async function main() {
  const args = process.argv.slice(2);
  const runId = args.find(arg => !arg.startsWith('--'));
  const flag = args.find(arg => arg.startsWith('--'));

  if (flag === '--all') {
    console.log('🛑 Killing all running test processes...\n');
    await killAllTests();
  } else if (flag === '--furniture-store') {
    await killFurnitureStoreTests();
  } else if (runId) {
    console.log(`🛑 Killing test run: ${runId}\n`);
    await killTestRun(runId);
  } else {
    console.log('Usage:');
    console.log('  node scripts/kill-test-run.js <runId>');
    console.log('  node scripts/kill-test-run.js --all');
    console.log('');
    console.log('To find the runId:');
    console.log('  - Check the URL when viewing a test run (e.g., /dashboard/runs/{runId})');
    console.log('  - Or list PID files: ls .cursor/test-pids/');
    process.exit(1);
  }
}

main().catch(console.error);

