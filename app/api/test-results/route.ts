import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

// GET - Fetch test results for a test run
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testRunId = searchParams.get("testRunId");

    if (!testRunId) {
      return NextResponse.json(
        { error: "Test run ID is required" },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabaseServer = await createServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS - test results visibility is controlled at the test_run level
    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .eq("test_run_id", testRunId)
      .order("test_file", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching test results:", error);
      return NextResponse.json(
        { error: "Failed to fetch test results" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("Error in test-results GET:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create test result records for a test run
export async function POST(request: NextRequest) {
  try {
    console.log(`[test-results] 🔍 DEBUG: POST request received`);
    const body = await request.json();
    const { testRunId, tests } = body;

    console.log(`[test-results] 🔍 DEBUG: testRunId: ${testRunId}`);
    console.log(`[test-results] 🔍 DEBUG: tests array length: ${tests?.length || 0}`);

    if (!testRunId || !tests || !Array.isArray(tests)) {
      console.error(`[test-results] ❌ ERROR: Invalid request - testRunId: ${testRunId}, tests: ${tests ? 'array' : 'not array'}`);
      return NextResponse.json(
        { error: "Test run ID and tests array are required" },
        { status: 400 }
      );
    }

    // Create test_results records
    const testResults = tests.map((test: any) => ({
      test_run_id: testRunId,
      test_name: test.testName,
      test_file: test.testFile,
      status: "pending",
    }));

    console.log(`[test-results] 🔍 DEBUG: Creating ${testResults.length} test result records`);
    if (testResults.length > 0) {
      console.log(`[test-results] 🔍 DEBUG: First test: ${testResults[0].test_name} (${testResults[0].test_file})`);
    }

    const { data, error } = await supabase
      .from("test_results")
      .insert(testResults)
      .select();

    if (error) {
      console.error(`[test-results] ❌ ERROR: Failed to create test results:`, error);
      console.error(`[test-results] 🔍 DEBUG: Error details: ${JSON.stringify(error, null, 2)}`);
      return NextResponse.json(
        { error: "Failed to create test results" },
        { status: 500 }
      );
    }

    console.log(`[test-results] ✅ DEBUG: Successfully created ${data?.length || 0} test result records`);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in test-results POST:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update a specific test result
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      testRunId,
      testName,
      status,
      duration_ms,
      error_message,
      video_url,
      screenshot_url,
    } = body;

    if (!testRunId || !testName) {
      return NextResponse.json(
        { error: "Test run ID and test name are required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "running") {
        updateData.started_at = new Date().toISOString();
      } else if (status === "passed" || status === "failed") {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (duration_ms !== undefined) updateData.duration_ms = duration_ms;
    if (error_message !== undefined) updateData.error_message = error_message;
    if (video_url !== undefined) updateData.video_url = video_url;
    if (screenshot_url !== undefined) updateData.screenshot_url = screenshot_url;

    const { error } = await supabase
      .from("test_results")
      .update(updateData)
      .eq("test_run_id", testRunId)
      .eq("test_name", testName);

    if (error) {
      console.error("Error updating test result:", error);
      return NextResponse.json(
        { error: "Failed to update test result" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in test-results PATCH:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

