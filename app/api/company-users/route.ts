import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");

    if (!company) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // Get all user IDs for the specified company
    const { data: companyProfiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("company_name", company);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = companyProfiles?.map((p) => p.id) || [];

    return NextResponse.json({
      success: true,
      userIds,
    });
  } catch (error: any) {
    console.error("Error fetching company users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch company users" },
      { status: 500 }
    );
  }
}

