import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, github_repo } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Suite name is required" },
        { status: 400 }
      );
    }

    const { data: newSuite, error: insertError } = await supabase
      .from("test_suites")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        github_repo: github_repo?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating test suite:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to create test suite" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, suite: newSuite });
  } catch (error: any) {
    console.error("Error in suites POST:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

