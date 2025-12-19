import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint receives results from Fly.io test runner
export async function POST(request: NextRequest) {
  try {
    // Use service role key for webhook (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const {
      runId,
      status,
      duration_ms,
      tests_passed,
      tests_failed,
      screenshots,
      videos,
      logs,
      results,
    } = body;

    if (!runId) {
      return NextResponse.json(
        { error: "Run ID is required" },
        { status: 400 }
      );
    }

    // Update the test run with results
    const { error } = await supabase
      .from("test_runs")
      .update({
        status: status || "completed",
        completed_at: new Date().toISOString(),
        duration_ms: duration_ms || null,
        tests_passed: tests_passed || 0,
        tests_failed: tests_failed || 0,
        screenshots: screenshots || [],
        videos: videos || [],
        logs: logs || null,
        results: results || null,
      })
      .eq("id", runId);

    if (error) {
      console.error("Error updating test run:", error);
      return NextResponse.json(
        { error: "Failed to update test run" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test results received",
    });
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

