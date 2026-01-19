import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    const isAdmin = user.email === "cyclerunner@example.com";
    const body = await request.json();
    const { name, description, github_repo, company } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Suite name is required" },
        { status: 400 }
      );
    }

    let userIdToUse = user.id;

    // If admin and a company is selected, find a user_id for that company
    if (isAdmin && company) {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: companyProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("company_name", company)
        .limit(1);

      if (companyProfiles && companyProfiles.length > 0) {
        userIdToUse = companyProfiles[0].id;
      }
    }

    // Use admin client for insert if admin is creating for another company
    const clientForInsert = isAdmin ? createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ) : supabase;

    const { data: newSuite, error: insertError } = await clientForInsert
      .from("test_suites")
      .insert({
        user_id: userIdToUse,
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

