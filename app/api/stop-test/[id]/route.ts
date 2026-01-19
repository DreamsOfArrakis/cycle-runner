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
    const { error: updateError } = await supabase
      .from("test_runs")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating test run status:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel test run" },
        { status: 500 }
      );
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
                
                // Try SIGTERM first (graceful)
                try {
                  process.kill(-pid, "SIGTERM");
                  console.log(`[stop-test] 🔍 DEBUG: Sent SIGTERM to process group ${pid}`);
                  
                  // Wait a bit, then force kill if still running
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  try {
                    await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
                    // Still running, force kill
                    process.kill(-pid, "SIGKILL");
                    console.log(`[stop-test] 🔍 DEBUG: Force killed process group ${pid}`);
                  } catch {
                    console.log(`[stop-test] ✅ Process ${pid} terminated gracefully`);
                  }
                } catch (killError: any) {
                  console.log(`[stop-test] ⚠️  Error killing process: ${killError.message}`);
                  // Try direct kill as fallback
                  try {
                    process.kill(pid, "SIGKILL");
                    console.log(`[stop-test] ✅ Force killed process ${pid}`);
                  } catch (fallbackError) {
                    console.log(`[stop-test] ⚠️  Could not kill process ${pid}`);
                  }
                }
              } catch (psError) {
                console.log(`[stop-test] ⚠️  Process ${pid} may have already exited`);
              }
            }
          } catch (killError: any) {
            console.error(`[stop-test] ❌ ERROR: Failed to kill process ${pid}:`, killError.message);
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
        
        // Try to find any node/playwright processes that might be related
        if (process.platform !== "win32") {
          try {
            const { exec } = require("child_process");
            const { promisify } = require("util");
            const execAsync = promisify(exec);
            
            // Look for node processes running playwright
            const { stdout } = await execAsync(`ps aux | grep -E "node.*run-local-individual|playwright" | grep -v grep || true`);
            if (stdout.trim()) {
              console.log(`[stop-test] 🔍 DEBUG: Found potential test processes:`);
              console.log(stdout);
            }
          } catch (searchError) {
            // Ignore search errors
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

