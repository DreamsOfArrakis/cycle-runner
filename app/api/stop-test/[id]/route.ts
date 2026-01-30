import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Test run ID is required" },
        { status: 400 }
      );
    }

    // Update test run status to cancelled
    console.log(`[stop-test] 🔍 DEBUG: Updating database status to cancelled for runId: ${id}`);
    const { error: updateError, data: updateData } = await supabase
      .from("test_runs")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (updateError) {
      console.error(`[stop-test] ❌ ERROR: Failed to update database:`, updateError);
      return NextResponse.json(
        { error: "Failed to cancel test run" },
        { status: 500 }
      );
    }

    console.log(`[stop-test] ✅ DEBUG: Database updated successfully`);
    if (updateData && updateData.length > 0) {
      console.log(`[stop-test] 🔍 DEBUG: Updated test run status: ${updateData[0].status}`);
    }

    // Try to kill the process if we have the PID
    try {
      const pidFilePath = path.join(process.cwd(), ".cursor", "test-pids", `${id}.json`);
      
      console.log(`[stop-test] 🔍 DEBUG: Looking for PID file: ${pidFilePath}`);
      
      if (fs.existsSync(pidFilePath)) {
        const pidData = JSON.parse(fs.readFileSync(pidFilePath, "utf-8"));
        const { pid } = pidData;

        console.log(`[stop-test] 🔍 DEBUG: Found PID: ${pid} for runId: ${id}`);

        if (pid) {
          try {
            // Kill the process tree (parent and children)
            if (process.platform === "win32") {
              // Windows
              const { exec } = require("child_process");
              const { promisify } = require("util");
              const execAsync = promisify(exec);
              await execAsync(`taskkill /pid ${pid} /T /F`);
              console.log(`[stop-test] ✅ Killed test process with PID: ${pid}`);
            } else {
              const { exec } = require("child_process");
              const { promisify } = require("util");
              const execAsync = promisify(exec);
              // Unix-like (Mac, Linux)
              // First try to check if process exists
              try {
                await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
                console.log(`[stop-test] 🔍 DEBUG: Process ${pid} exists, attempting to kill`);
                
                // Strategy 1: Kill process group (most effective for detached processes)
                // Detached processes get their own process group, so -pid kills the group
                try {
                  process.kill(-pid, "SIGTERM");
                  console.log(`[stop-test] 🔍 DEBUG: Sent SIGTERM to process group ${pid}`);
                } catch (groupError) {
                  // If process group doesn't work, try direct kill
                  try {
                    process.kill(pid, "SIGTERM");
                    console.log(`[stop-test] 🔍 DEBUG: Sent SIGTERM to process ${pid}`);
                  } catch (directError) {
                    console.log(`[stop-test] 🔍 DEBUG: Direct SIGTERM failed: ${directError}`);
                  }
                }
                
                // Strategy 2: Kill all child processes
                try {
                  const { stdout: children } = await execAsync(`pgrep -P ${pid} 2>/dev/null || true`);
                  if (children.trim()) {
                    const childPids = children.trim().split('\n').filter((p: string) => p);
                    console.log(`[stop-test] 🔍 DEBUG: Found ${childPids.length} child processes`);
                    for (const childPid of childPids) {
                      try {
                        process.kill(parseInt(childPid), "SIGKILL");
                        console.log(`[stop-test] 🔍 DEBUG: Killed child process ${childPid}`);
                      } catch (e) {
                        // Ignore errors
                      }
                    }
                  }
                } catch (childError) {
                  // Ignore child process errors
                }
                
                // Wait a bit, then force kill if still running
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if still running and force kill
                try {
                  await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
                  // Still running, force kill
                  console.log(`[stop-test] 🔍 DEBUG: Process still running, force killing...`);
                  
                  // Try process group kill first (most effective)
                  try {
                    process.kill(-pid, "SIGKILL");
                    console.log(`[stop-test] 🔍 DEBUG: Sent SIGKILL to process group ${pid}`);
                  } catch (e) {
                    // Fallback to direct kill
                    try {
                      process.kill(pid, "SIGKILL");
                      console.log(`[stop-test] 🔍 DEBUG: Sent SIGKILL to process ${pid}`);
                    } catch (e2) {
                      // Ignore
                    }
                  }
                  
                  // Kill all children with pkill
                  try {
                    await execAsync(`pkill -9 -P ${pid} 2>/dev/null || true`);
                    console.log(`[stop-test] 🔍 DEBUG: Killed all children of ${pid}`);
                  } catch (e) {
                    // Ignore
                  }
                  
                  // Also kill any processes matching the runId
                  try {
                    await execAsync(`pkill -9 -f "run-local-individual.*${id}" 2>/dev/null || true`);
                    console.log(`[stop-test] 🔍 DEBUG: Killed any processes matching runId`);
                  } catch (pkillError) {
                    // Ignore
                  }
                  
                  // Final check
                  await new Promise(resolve => setTimeout(resolve, 500));
                  try {
                    await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
                    console.log(`[stop-test] ⚠️  Process ${pid} may still be running`);
                  } catch {
                    console.log(`[stop-test] ✅ Process ${pid} terminated`);
                  }
                  
                } catch {
                  console.log(`[stop-test] ✅ Process ${pid} terminated`);
                }
              } catch (psError) {
                console.log(`[stop-test] ⚠️  Process ${pid} may have already exited`);
                
                // Even if process doesn't exist, try to kill any orphaned processes
                try {
                  await execAsync(`pkill -9 -f "run-local-individual.*${id}" 2>/dev/null || true`);
                  console.log(`[stop-test] 🔍 DEBUG: Attempted to kill orphaned processes`);
                } catch (pkillError) {
                  // Ignore
                }
              }
            }
          } catch (killError: any) {
            console.error(`[stop-test] ❌ ERROR: Failed to kill process ${pid}:`, killError.message);
            
            // Last resort: try to kill by process name pattern
            if (process.platform !== "win32") {
              try {
                const { exec } = require("child_process");
                const { promisify } = require("util");
                const execAsync = promisify(exec);
                await execAsync(`pkill -9 -f "run-local-individual.*${id}" 2>/dev/null || true`);
                console.log(`[stop-test] 🔍 DEBUG: Attempted fallback kill by process name`);
              } catch (fallbackError) {
                // Ignore
              }
            }
          }

          // Clean up PID file
          try {
            fs.unlinkSync(pidFilePath);
            console.log(`[stop-test] 🗑️  Removed PID file`);
          } catch (unlinkError) {
            console.log(`[stop-test] ⚠️  Could not remove PID file: ${unlinkError}`);
          }
        } else {
          console.log(`[stop-test] ⚠️  No PID in file`);
        }
      } else {
        console.log(`[stop-test] ⚠️  PID file not found: ${pidFilePath}`);
        
        // Try to find the process by searching for the runId in command line
        if (process.platform !== "win32") {
          try {
            const { exec } = require("child_process");
            const { promisify } = require("util");
            const execAsync = promisify(exec);
            
            console.log(`[stop-test] 🔍 DEBUG: Searching for process with runId: ${id}`);
            
            // Look for node processes running run-local-individual with this specific runId
            // The command will be: node run-local-individual.js <runId> ...
            // Use ps with -f flag to see full command line, and search for the runId
            const { stdout } = await execAsync(`ps -ef | grep "run-local-individual" | grep "${id}" | grep -v grep || true`);
            
            if (stdout.trim()) {
              console.log(`[stop-test] 🔍 DEBUG: Found test process:`);
              console.log(stdout);
              
              // Extract PID from the ps output (second column)
              const lines = stdout.trim().split('\n');
              for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) {
                  const pid = parseInt(parts[1]);
                  if (!isNaN(pid)) {
                    console.log(`[stop-test] 🔍 DEBUG: Attempting to kill process ${pid} found by search`);
                    
                    // Try to kill this process
                    try {
                      process.kill(pid, "SIGTERM");
                      console.log(`[stop-test] 🔍 DEBUG: Sent SIGTERM to process ${pid}`);
                      
                      // Wait and force kill
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      try {
                        await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
                        // Still running, force kill
                        process.kill(pid, "SIGKILL");
                        console.log(`[stop-test] ✅ Force killed process ${pid}`);
                      } catch {
                        console.log(`[stop-test] ✅ Process ${pid} terminated`);
                      }
                      
                      // Kill child processes
                      try {
                        await execAsync(`pkill -9 -P ${pid} 2>/dev/null || true`);
                        console.log(`[stop-test] 🔍 DEBUG: Killed children of ${pid}`);
                      } catch (e) {
                        // Ignore
                      }
                    } catch (killError: any) {
                      console.log(`[stop-test] ⚠️  Could not kill process ${pid}: ${killError.message}`);
                    }
                  }
                }
              }
              
              // Also try pkill as a fallback (more aggressive)
              try {
                const killResult = await execAsync(`pkill -9 -f "run-local-individual.*${id}" 2>&1 || true`);
                if (killResult.stdout || killResult.stderr) {
                  console.log(`[stop-test] 🔍 DEBUG: pkill result: ${killResult.stdout || killResult.stderr}`);
                } else {
                  console.log(`[stop-test] 🔍 DEBUG: Used pkill to kill processes matching runId`);
                }
              } catch (pkillError: any) {
                console.log(`[stop-test] 🔍 DEBUG: pkill error (may be normal if no process found): ${pkillError.message}`);
              }
              
              // Also kill any Playwright Chrome processes that might be orphaned
              try {
                await execAsync(`pkill -9 -f "Google Chrome for Testing.*playwright" 2>/dev/null || true`);
                console.log(`[stop-test] 🔍 DEBUG: Killed orphaned Playwright Chrome processes`);
              } catch (chromeError) {
                // Ignore
              }
            } else {
              console.log(`[stop-test] 🔍 DEBUG: No process found matching runId ${id}`);
              
              // Try multiple search strategies
              // Strategy 1: Search by runId in any process arguments
              try {
                const { stdout: runIdProcesses } = await execAsync(`ps aux | grep "${id}" | grep -v grep || true`);
                if (runIdProcesses.trim()) {
                  console.log(`[stop-test] 🔍 DEBUG: Found processes with runId in arguments:`);
                  console.log(runIdProcesses);
                  
                  // Extract and kill all PIDs
                  const lines = runIdProcesses.trim().split('\n');
                  for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 2) {
                      const pid = parseInt(parts[1]);
                      if (!isNaN(pid) && pid > 1) {
                        try {
                          process.kill(pid, "SIGKILL");
                          console.log(`[stop-test] 🔍 DEBUG: Killed process ${pid} found by runId search`);
                        } catch (e) {
                          // Ignore
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Ignore
              }
              
              // Strategy 2: Try pkill with runId pattern
              try {
                await execAsync(`pkill -9 -f ".*${id}.*" 2>/dev/null || true`);
                console.log(`[stop-test] 🔍 DEBUG: Attempted pkill with runId pattern`);
              } catch (pkillError) {
                // Ignore
              }
              
              // Strategy 3: Kill all Playwright test-server processes (nuclear option for dev)
              // This is safe in dev mode since there should only be one test run at a time
              try {
                const { stdout: playwrightProcesses } = await execAsync(`ps aux | grep -E "playwright.*test-server|@playwright/test.*test-server" | grep -v grep || true`);
                if (playwrightProcesses.trim()) {
                  console.log(`[stop-test] 🔍 DEBUG: Found Playwright test-server processes, killing them:`);
                  console.log(playwrightProcesses);
                  
                  const lines = playwrightProcesses.trim().split('\n');
                  for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 2) {
                      const pid = parseInt(parts[1]);
                      if (!isNaN(pid) && pid > 1) {
                        try {
                          // Kill the process and its children
                          process.kill(pid, "SIGKILL");
                          await execAsync(`pkill -9 -P ${pid} 2>/dev/null || true`);
                          console.log(`[stop-test] 🔍 DEBUG: Killed Playwright process ${pid} and children`);
                        } catch (e) {
                          // Ignore
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Ignore
              }
              
              // Strategy 4: Show all test-related processes for debugging
              try {
                const { stdout: allProcesses } = await execAsync(`ps aux | grep -E "run-local-individual|playwright.*test|node.*playwright" | grep -v grep || true`);
                if (allProcesses.trim()) {
                  console.log(`[stop-test] 🔍 DEBUG: All test-related processes:`);
                  console.log(allProcesses);
                } else {
                  console.log(`[stop-test] 🔍 DEBUG: No test-related processes found`);
                }
              } catch (e) {
                // Ignore
              }
            }
          } catch (searchError: any) {
            console.error(`[stop-test] ❌ ERROR: Search failed:`, searchError.message);
          }
        }
      }
    } catch (fileError: any) {
      console.error(`[stop-test] ❌ ERROR: Could not find or kill test process:`, fileError.message);
      // Don't fail the request if we can't kill the process
      // The database update is what matters most
    }

    return NextResponse.json({
      success: true,
      message: "Test run cancelled",
    });
  } catch (error: any) {
    console.error("Error in stop-test API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

