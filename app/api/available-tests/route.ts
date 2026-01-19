import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { createClient } from "@/lib/supabase/server";

const execAsync = promisify(exec);

// Force dynamic rendering (uses cookies and request.url)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's company name
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin (cyclerunner@example.com) - admins see all tests
    const isAdmin = user.email === "cyclerunner@example.com";

    // Get company name from query parameter (selected from dropdown) or user's profile
    const { searchParams } = new URL(request.url);
    const selectedCompany = searchParams.get("company");
    
    // Admin users can see all tests regardless of company
    // For regular users, show tests when any company is selected in the dropdown
    // If no company is selected, check user's profile and only show if it includes "ecommerce"
    if (!isAdmin && !selectedCompany) {
      // Fallback to user's profile company name
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", user.id)
        .single();
      const companyName = profile?.company_name?.toLowerCase().trim() || "";
      const normalizedCompanyName = companyName.replace(/[-_\s]/g, "");

      // Only show tests for companies with "ecommerce" if no company is selected
      if (!companyName || !normalizedCompanyName.includes("ecommerce")) {
        return NextResponse.json({
          success: true,
          categories: [],
        });
      }
    }

    // If a company is selected in dropdown (or admin user), show all tests

    // Map company name to folder name
    // Normalize company name to match folder structure
    let companyFolder = null;
    if (selectedCompany) {
      // Convert company name to folder name format
      // "E-commerce Store" -> "ecommerce-store"
      // "The Furniture Store" -> "the-furniture-store"
      const normalized = selectedCompany
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with single
      
      // Map known company names to folder names
      if (normalized.includes('ecommerce') || normalized.includes('e-commerce')) {
        companyFolder = 'ecommerce-store';
      } else if (normalized.includes('furniture')) {
        companyFolder = 'the-furniture-store';
      }
    }

    // Run the test discovery script with optional company folder filter
    const runnerPath = path.join(process.cwd(), "playwright-runner");
    const command = companyFolder 
      ? `node discover-tests.js ${companyFolder}`
      : "node discover-tests.js";
    const { stdout } = await execAsync(command, {
      cwd: runnerPath,
    });

    // Extract just the JSON part (after "Discovered tests:")
    const jsonMatch = stdout.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // If no JSON found, assume no tests available (empty array)
      return NextResponse.json({
        success: true,
        categories: [],
      });
    }
    
    const tests = JSON.parse(jsonMatch[0]);

    // If no tests found, return empty array
    if (!Array.isArray(tests) || tests.length === 0) {
      return NextResponse.json({
        success: true,
        categories: [],
      });
    }

    // Group tests by category (file)
    // testFile now includes folder path (e.g., "ecommerce-store/authentication.spec.js")
    const categories = tests.reduce((acc: any, test: any) => {
      // Extract just the filename without folder path for category name
      const fileName = test.testFile.split('/').pop() || test.testFile;
      const category = fileName.replace(".spec.js", "");
      if (!acc[category]) {
        acc[category] = {
          name: category,
          displayName: category
            .split("-")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
          tests: [],
        };
      }
      acc[category].tests.push({
        name: test.testName,
        file: test.testFile, // Keep full path including folder
      });
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      categories: Object.values(categories),
    });
  } catch (error: any) {
    console.error("Error fetching available tests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tests" },
      { status: 500 }
    );
  }
}

