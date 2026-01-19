import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cloneOrGetRepo, findTestDirectory } from "@/lib/git-utils";

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

    // Get company name or suiteId from query parameters
    const { searchParams } = new URL(request.url);
    const selectedCompany = searchParams.get("company");
    const suiteId = searchParams.get("suiteId");
    
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

    // Check if suite has a github_repo configured
    let githubRepo: string | null = null;
    let testSourcePath: string | null = null;

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If suiteId is provided, get github_repo directly from that suite
    if (suiteId) {
      const { data: suite } = await supabaseAdmin
        .from("test_suites")
        .select("github_repo")
        .eq("id", suiteId)
        .single();
      
      if (suite && suite.github_repo) {
        githubRepo = suite.github_repo;
      }
    } else if (selectedCompany) {
      // Fallback: Find suites for this company
      // Get user IDs for this company
      const { data: companyProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("company_name", selectedCompany);

      if (companyProfiles && companyProfiles.length > 0) {
        const userIds = companyProfiles.map((p) => p.id);
        
        // Find active suite with github_repo for this company
        const { data: suites } = await supabaseAdmin
          .from("test_suites")
          .select("github_repo")
          .in("user_id", userIds)
          .eq("is_active", true)
          .not("github_repo", "is", null)
          .limit(1);

        if (suites && suites.length > 0 && suites[0].github_repo) {
          githubRepo = suites[0].github_repo;
        }
      }
    }

    // If github_repo is configured, ONLY use that repo (don't fall back to local)
    if (githubRepo) {
      try {
        console.log(`[available-tests] Cloning repository: ${githubRepo}`);
        const clonedRepoPath = await cloneOrGetRepo(githubRepo);
        console.log(`[available-tests] Cloned to: ${clonedRepoPath}`);
        
        testSourcePath = await findTestDirectory(clonedRepoPath);
        console.log(`[available-tests] Test directory: ${testSourcePath}`);
        
        // Update discover-tests.js to accept external path
        const runnerPath = path.join(process.cwd(), "playwright-runner");
        const command = `node discover-tests.js --external "${testSourcePath}"`;
        console.log(`[available-tests] Running: ${command}`);
        
        let stdout = "";
        let stderr = "";
        try {
          const result = await execAsync(command, {
            cwd: runnerPath,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          });
          stdout = result.stdout || "";
          stderr = result.stderr || "";
        } catch (execError: any) {
          console.error(`[available-tests] Error executing discover-tests:`, execError);
          stdout = execError.stdout || "";
          stderr = execError.stderr || execError.message || "";
        }

        if (stderr) {
          console.error(`[available-tests] stderr: ${stderr}`);
        }
        console.log(`[available-tests] stdout length: ${stdout.length}, first 1000 chars: ${stdout.substring(0, 1000)}`);

        const jsonMatch = stdout.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.log(`[available-tests] No JSON found in output. Full output: ${stdout}`);
          console.log(`[available-tests] stderr output: ${stderr}`);
          // No tests found in external repo - return empty (don't fall back to local)
          return NextResponse.json({
            success: true,
            categories: [],
            error: `No tests discovered. stdout: ${stdout.substring(0, 200)}, stderr: ${stderr.substring(0, 200)}`,
          });
        }

        let tests;
        try {
          tests = JSON.parse(jsonMatch[0]);
        } catch (parseError: any) {
          console.error(`[available-tests] Error parsing JSON:`, parseError);
          console.error(`[available-tests] JSON string: ${jsonMatch[0].substring(0, 500)}`);
          return NextResponse.json({
            success: true,
            categories: [],
            error: `Failed to parse test results: ${parseError.message}`,
          });
        }
        
        console.log(`[available-tests] Found ${tests.length} tests`);
        if (tests.length > 0) {
          console.log(`[available-tests] First test example:`, JSON.stringify(tests[0], null, 2));
        }
        
        if (!Array.isArray(tests) || tests.length === 0) {
          // No tests found in external repo - return empty (don't fall back to local)
          return NextResponse.json({
            success: true,
            categories: [],
          });
        }

        // Group tests by category
        const categories = tests.reduce((acc: any, test: any) => {
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
            file: test.testFile,
          });
          return acc;
        }, {});

        return NextResponse.json({
          success: true,
          categories: Object.values(categories),
        });
      } catch (error: any) {
        console.error(`[available-tests] Error cloning repository ${githubRepo}:`, error);
        console.error(`[available-tests] Error stack:`, error.stack);
        // If github_repo is configured but cloning fails, return empty (don't show local tests)
        return NextResponse.json({
          success: true,
          categories: [],
          error: `Failed to clone repository ${githubRepo}: ${error.message}`,
        });
      }
    }

    // Only use local tests if NO github_repo is configured
    // Map company name to folder name for local tests
    let companyFolder = null;
    if (selectedCompany) {
      const normalized = selectedCompany
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      
      // Only show local tests for ecommerce-store (which doesn't have github_repo)
      if (normalized.includes('ecommerce') || normalized.includes('e-commerce')) {
        companyFolder = 'ecommerce-store';
      } else {
        // For other companies without github_repo, return empty
        return NextResponse.json({
          success: true,
          categories: [],
        });
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

