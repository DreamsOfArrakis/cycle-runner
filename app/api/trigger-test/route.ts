import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    const isAdmin = user.email === "cyclerunner@example.com";

    const body = await request.json();
    const { suiteId, selectedTests } = body;

    console.log(`[trigger-test] 🔍 DEBUG: Received request`);
    console.log(`[trigger-test] 🔍 DEBUG: User: ${user.email}, IsAdmin: ${isAdmin}`);
    console.log(`[trigger-test] 🔍 DEBUG: SuiteId: ${suiteId}`);
    console.log(`[trigger-test] 🔍 DEBUG: SelectedTests: ${selectedTests ? JSON.stringify(selectedTests) : 'null (running all tests)'}`);

    if (!suiteId) {
      console.error(`[trigger-test] ❌ ERROR: Suite ID is required`);
      return NextResponse.json(
        { error: "Suite ID is required" },
        { status: 400 }
      );
    }

    // Verify the suite - allow admin to access any suite
    let suite: any = null;
    let suiteError: any = null;

    if (isAdmin) {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const result = await supabaseAdmin
        .from("test_suites")
        .select("*")
        .eq("id", suiteId)
        .single();
      suite = result.data;
      suiteError = result.error;
    } else {
      const result = await supabase
        .from("test_suites")
        .select("*")
        .eq("id", suiteId)
        .eq("user_id", user.id)
        .single();
      suite = result.data;
      suiteError = result.error;
    }

    if (suiteError || !suite) {
      console.error(`[trigger-test] ❌ ERROR: Test suite not found`);
      console.error(`[trigger-test] 🔍 DEBUG: SuiteError: ${suiteError?.message || 'none'}`);
      return NextResponse.json(
        { error: "Test suite not found" },
        { status: 404 }
      );
    }

    console.log(`[trigger-test] ✅ DEBUG: Suite found: ${suite.name}`);
    console.log(`[trigger-test] 🔍 DEBUG: Suite github_repo: ${suite.github_repo || 'none'}`);
    console.log(`[trigger-test] 🔍 DEBUG: Suite user_id: ${suite.user_id}`);

    // Create a new test run record
    // Use suite's user_id (owner) when admin triggers, otherwise use current user's id
    const runUserId = isAdmin ? suite.user_id : user.id;
    
    // Use admin client for insert if admin is triggering for another company's suite
    const clientForInsert = isAdmin ? createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) : supabase;
    
    const { data: testRun, error: runError } = await clientForInsert
      .from("test_runs")
      .insert({
        user_id: runUserId,
        suite_id: suiteId,
        status: "pending",
        triggered_by: "manual",
      })
      .select()
      .single();

    if (runError || !testRun) {
      console.error(`[trigger-test] ❌ ERROR: Failed to create test run`);
      console.error(`[trigger-test] 🔍 DEBUG: RunError: ${runError?.message || 'none'}`);
      return NextResponse.json(
        { error: "Failed to create test run" },
        { status: 500 }
      );
    }

    console.log(`[trigger-test] ✅ DEBUG: Test run created: ${testRun.id}`);
    console.log(`[trigger-test] 🔍 DEBUG: RunUserId: ${runUserId}`);

    // TODO: In Phase 1, we'll trigger Fly.io here
    // For now, we'll simulate it by updating status to "running"
    // Use admin client for update if admin triggered
    const clientForUpdate = isAdmin ? createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) : supabase;
    
    await clientForUpdate
      .from("test_runs")
      .update({ 
        status: "running",
        started_at: new Date().toISOString()
      })
      .eq("id", testRun.id);

    // Trigger Fly.io machine (simplified for Phase 1)
    // In production, this would call Fly.io API
    // Use the request URL to determine the correct API URL (handles different ports)
    const requestUrl = new URL(request.url);
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || `${requestUrl.protocol}//${requestUrl.host}`;
    console.log(`[trigger-test] 🔍 DEBUG: API URL: ${apiUrl}`);
    console.log(`[trigger-test] 🔍 DEBUG: NODE_ENV: ${process.env.NODE_ENV}`);
    triggerFlyioRunner(testRun.id, suite, selectedTests, apiUrl);

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
async function triggerFlyioRunner(runId: string, suite: any, selectedTests?: { testName: string; testFile: string }[], apiUrl?: string) {
  console.log(`[trigger-test] 🚀 Triggering test runner for run ${runId}, suite: ${suite.name}`);
  if (selectedTests && selectedTests.length > 0) {
    console.log(`[trigger-test] 🔍 DEBUG: Running ${selectedTests.length} selected tests`);
    selectedTests.forEach((test, idx) => {
      console.log(`[trigger-test] 🔍 DEBUG:   Test ${idx + 1}: ${test.testName} (${test.testFile})`);
    });
  } else {
    console.log(`[trigger-test] 🔍 DEBUG: Running all tests`);
  }
  
  if (process.env.NODE_ENV === "development") {
    console.log(`[trigger-test] 🔍 DEBUG: Development mode - using local test runner`);
    // Run Playwright tests locally in development
    const { spawn } = await import("child_process");
    const path = await import("path");
    const fs = await import("fs");
    
    const runnerPath = path.join(process.cwd(), "playwright-runner", "run-local-individual.js");
    // Use provided API URL or fallback to default
    const finalApiUrl = apiUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    console.log(`[trigger-test] 🔍 DEBUG: Runner path: ${runnerPath}`);
    console.log(`[trigger-test] 🔍 DEBUG: Using API URL: ${finalApiUrl}`);
    console.log(`[trigger-test] 🔍 DEBUG: Current working directory: ${process.cwd()}`);
    
    // Pass selected tests and github_repo as JSON argument
    const args = [runnerPath, runId, finalApiUrl];
    const runnerConfig = {
      selectedTests: selectedTests || [],
      githubRepo: suite.github_repo || null,
    };
    args.push(JSON.stringify(runnerConfig));
    console.log(`[trigger-test] 🔍 DEBUG: Runner config: ${JSON.stringify(runnerConfig, null, 2)}`);
    console.log(`[trigger-test] 🔍 DEBUG: Command: node ${args.join(' ')}`);
    
    // Run in background with output visible
    // Use detached: true so it runs independently
    // We'll kill it by PID directly since detached processes are harder to kill by process group
    const child = spawn("node", args, {
      detached: true,
      stdio: "inherit", // Show output in terminal for debugging
      cwd: path.join(process.cwd(), "playwright-runner"),
    });
    
    console.log(`✅ Test runner spawned with PID: ${child.pid}`);
    
    // Store PID for later cleanup - do this BEFORE unref to ensure it's saved
    try {
      const pidDir = path.join(process.cwd(), ".cursor", "test-pids");
      await fs.promises.mkdir(pidDir, { recursive: true });
      const pidFile = path.join(pidDir, `${runId}.json`);
      const pidData = {
        pid: child.pid,
        runId: runId,
        timestamp: Date.now(),
        command: `node ${args.join(' ')}`
      };
      await fs.promises.writeFile(
        pidFile,
        JSON.stringify(pidData, null, 2)
      );
      console.log(`[trigger-test] ✅ DEBUG: Saved PID file: ${pidFile}`);
      console.log(`[trigger-test] 🔍 DEBUG: PID data: ${JSON.stringify(pidData)}`);
    } catch (pidError: any) {
      console.error(`[trigger-test] ❌ ERROR: Could not save PID:`, pidError.message);
      console.error(`[trigger-test] 🔍 DEBUG: PID was: ${child.pid}, runId: ${runId}`);
    }
    
    child.unref(); // Allow parent to exit independently
  } else {
    // TODO: In production, trigger Fly.io API
    console.log("Production mode: Would trigger Fly.io here");
  }
}

