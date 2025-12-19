import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Create test result records for a test run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testRunId, tests } = body;

    if (!testRunId || !tests || !Array.isArray(tests)) {
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

    const { data, error } = await supabase
      .from("test_results")
      .insert(testResults)
      .select();

    if (error) {
      console.error("Error creating test results:", error);
      return NextResponse.json(
        { error: "Failed to create test results" },
        { status: 500 }
      );
    }

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

