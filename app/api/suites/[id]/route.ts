import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify the suite belongs to the user
    const { data: existingSuite, error: suiteError } = await supabase
      .from("test_suites")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (suiteError || !existingSuite) {
      return NextResponse.json(
        { error: "Test suite not found" },
        { status: 404 }
      );
    }

    // Get update data from request
    const body = await request.json();
    const { name, description, github_repo, is_active } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Suite name is required" },
        { status: 400 }
      );
    }

    // Update the suite
    const { data: updatedSuite, error: updateError } = await supabase
      .from("test_suites")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        github_repo: github_repo?.trim() || null,
        is_active: is_active !== undefined ? is_active : existingSuite.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update suite" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      suite: updatedSuite,
    });
  } catch (error: any) {
    console.error("Error updating suite:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify the suite belongs to the user
    const { data: existingSuite, error: suiteError } = await supabase
      .from("test_suites")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (suiteError || !existingSuite) {
      return NextResponse.json(
        { error: "Test suite not found" },
        { status: 404 }
      );
    }

    // Delete the suite (cascade will handle test_runs)
    const { error: deleteError } = await supabase
      .from("test_suites")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete suite" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Suite deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting suite:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

