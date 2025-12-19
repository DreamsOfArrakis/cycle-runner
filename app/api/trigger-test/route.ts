import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { suiteId, selectedTests } = body;

    if (!suiteId) {
      return NextResponse.json(
        { error: "Suite ID is required" },
        { status: 400 }
      );
    }

    // Verify the suite belongs to the user
    const { data: suite, error: suiteError } = await supabase
      .from("test_suites")
      .select("*")
      .eq("id", suiteId)
      .eq("user_id", user.id)
      .single();

    if (suiteError || !suite) {
      return NextResponse.json(
        { error: "Test suite not found" },
        { status: 404 }
      );
    }

    // Create a new test run record
    const { data: testRun, error: runError } = await supabase
      .from("test_runs")
      .insert({
        user_id: user.id,
        suite_id: suiteId,
        status: "pending",
        triggered_by: "manual",
      })
      .select()
      .single();

    if (runError || !testRun) {
      return NextResponse.json(
        { error: "Failed to create test run" },
        { status: 500 }
      );
    }

    // TODO: In Phase 1, we'll trigger Fly.io here
    // For now, we'll simulate it by updating status to "running"
    await supabase
      .from("test_runs")
      .update({ 
        status: "running",
        started_at: new Date().toISOString()
      })
      .eq("id", testRun.id);

    // Trigger Fly.io machine (simplified for Phase 1)
    // In production, this would call Fly.io API
    triggerFlyioRunner(testRun.id, suite, selectedTests);

    return NextResponse.json({
      success: true,
      runId: testRun.id,
      message: "Test run initiated",
    });
  } catch (error: any) {
    console.error("Error triggering test:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Function to trigger test runner
async function triggerFlyioRunner(runId: string, suite: any, selectedTests?: { testName: string; testFile: string }[]) {
  console.log(`Triggering test runner for run ${runId}, suite: ${suite.name}`);
  if (selectedTests && selectedTests.length > 0) {
    console.log(`Running ${selectedTests.length} selected tests`);
  } else {
    console.log(`Running all tests`);
  }
  
  if (process.env.NODE_ENV === "development") {
    // Run Playwright tests locally in development
    const { spawn } = await import("child_process");
    const path = await import("path");
    const fs = await import("fs");
    
    const runnerPath = path.join(process.cwd(), "playwright-runner", "run-local-individual.js");
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    console.log(`Spawning local test runner: ${runnerPath}`);
    
    // Pass selected tests as JSON argument
    const args = [runnerPath, runId, apiUrl];
    if (selectedTests && selectedTests.length > 0) {
      args.push(JSON.stringify(selectedTests));
    }
    
    // Run in background with output visible
    // Use process group for easier cleanup
    const child = spawn("node", args, {
      detached: true,
      stdio: "inherit", // Show output in terminal for debugging
      cwd: path.join(process.cwd(), "playwright-runner"),
    });
    
    child.unref(); // Allow parent to exit independently
    
    console.log(`✅ Test runner spawned with PID: ${child.pid}`);
    
    // Store PID for later cleanup
    try {
      const pidDir = path.join(process.cwd(), ".cursor", "test-pids");
      await fs.promises.mkdir(pidDir, { recursive: true });
      const pidFile = path.join(pidDir, `${runId}.json`);
      await fs.promises.writeFile(
        pidFile,
        JSON.stringify({ pid: child.pid, runId, timestamp: Date.now() })
      );
    } catch (pidError) {
      console.log("⚠️  Could not save PID:", pidError);
    }
  } else {
    // TODO: In production, trigger Fly.io API
    console.log("Production mode: Would trigger Fly.io here");
  }
}

