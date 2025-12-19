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
      
      if (fs.existsSync(pidFilePath)) {
        const pidData = JSON.parse(fs.readFileSync(pidFilePath, "utf-8"));
        const { pid } = pidData;

        if (pid) {
          try {
            // Kill the process tree (parent and children)
            if (process.platform === "win32") {
              // Windows
              require("child_process").exec(`taskkill /pid ${pid} /T /F`);
            } else {
              // Unix-like (Mac, Linux)
              process.kill(-pid, "SIGTERM"); // Negative PID kills process group
            }
            console.log(`✅ Killed test process with PID: ${pid}`);
          } catch (killError) {
            console.log(`⚠️  Process ${pid} may have already exited`);
          }

          // Clean up PID file
          fs.unlinkSync(pidFilePath);
        }
      }
    } catch (fileError) {
      console.log("⚠️  Could not find or kill test process:", fileError);
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

