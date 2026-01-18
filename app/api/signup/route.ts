import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for signup to bypass RLS when creating profile
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, companyName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    let authData;
    
    if (existingUser) {
      // User exists, use existing user
      authData = { user: existingUser };
    } else {
      // Create the auth user using admin API (more reliable for service role)
      const signupResult = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for service role
      });

      if (signupResult.error) {
        return NextResponse.json(
          { error: signupResult.error.message },
          { status: 400 }
        );
      }

      if (!signupResult.data.user) {
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }

      authData = signupResult.data;
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to get user" },
        { status: 500 }
      );
    }

    // Small delay to ensure user is committed to auth.users table
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if profile already exists, then upsert (update or insert)
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", authData.user.id)
      .single();

    if (existingProfile) {
      // Profile exists, update it with new company name
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          company_name: companyName || null,
        })
        .eq("id", authData.user.id);
      
      if (profileError) {
        return NextResponse.json(
          { error: `Profile update failed: ${profileError.message}` },
          { status: 500 }
        );
      }
    } else {
      // Profile doesn't exist, create it
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: authData.user.id,
        company_name: companyName || null,
        plan_tier: "free",
        monthly_run_limit: 100,
      });

      if (profileError) {
        return NextResponse.json(
          { error: `Profile creation failed: ${profileError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: authData.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

