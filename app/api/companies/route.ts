import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key to bypass RLS and get all companies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch all unique company names using service role (bypasses RLS)
    const { data: allProfiles, error } = await supabaseAdmin
      .from("profiles")
      .select("company_name")
      .not("company_name", "is", null);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!allProfiles) {
      return NextResponse.json({
        success: true,
        companies: [],
      });
    }

    // Extract unique company names, trim whitespace and filter out empty/null values
    const uniqueCompanies = Array.from(
      new Set(
        allProfiles
          .map((p: any) => p.company_name?.trim())
          .filter(Boolean) // Remove null, undefined, and empty strings
      )
    ).sort() as string[];

    return NextResponse.json({
      success: true,
      companies: uniqueCompanies,
    });
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

