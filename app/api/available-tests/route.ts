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
    
    // Get suiteId from query parameters
    const { searchParams } = new URL(request.url);
    const suiteId = searchParams.get("suiteId");

    // Check if suite has a github_repo configured
    let githubRepo: string | null = null;
    let testSourcePath: string | null = null;

    // Map suite name to folder name for filtering (used for both GitHub and local tests)
    const suiteNameToFolder: Record<string, string> = {
      "The Furniture Store": "furniture-store",
      "Furniture Store": "furniture-store",
      "E-commerce Demo Tests": "ecommerce-store",
      "Ecommerce Demo Tests": "ecommerce-store",
      "E-commerce": "ecommerce-store",
      "Ecommerce": "ecommerce-store",
    };
    
    // Helper function to determine folder filter from suite name
    const getFolderFilter = (name: string | null): string | null => {
      if (!name) return null;
      
      // Try exact match first
      let folderFilter = suiteNameToFolder[name];
      
      // If no exact match, try case-insensitive partial match
      if (!folderFilter) {
        const lowerSuiteName = name.toLowerCase();
        for (const [key, folder] of Object.entries(suiteNameToFolder)) {
          if (lowerSuiteName.includes(key.toLowerCase())) {
            folderFilter = folder;
            break;
          }
        }
      }
      
      return folderFilter || null;
    };

    // If suiteId is provided, get github_repo and name directly from that suite
    let suiteName: string | null = null;
    if (suiteId) {
      // Use admin client if admin, otherwise use regular client with user_id filter
      const clientForQuery = isAdmin 
        ? createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
        : supabase;
      
      let query = clientForQuery
        .from("test_suites")
        .select("github_repo, name")
        .eq("id", suiteId);
      
      // Only filter by user_id if not admin
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }
      
      const { data: suite } = await query.single();
      
      if (suite) {
        if (suite.github_repo) {
          githubRepo = suite.github_repo;
        }
        suiteName = suite.name;
        console.log(`[available-tests] Suite "${suiteName}" - GitHub repo: ${githubRepo || 'none'}, folder filter: ${getFolderFilter(suiteName) || 'none'}`);
      }
    } else {
      // Fallback: Find user's active suite with github_repo
      const { data: suites } = await supabase
        .from("test_suites")
        .select("github_repo")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .not("github_repo", "is", null)
        .limit(1);

      if (suites && suites.length > 0 && suites[0].github_repo) {
        githubRepo = suites[0].github_repo;
      }
    }

    // If github_repo is configured, ONLY use that repo (don't fall back to local)
    // Don't apply folder filtering for GitHub repos - show all tests from the repo
    if (githubRepo) {
      try {
        console.log(`[available-tests] Cloning repository: ${githubRepo}`);
        const clonedRepoPath = await cloneOrGetRepo(githubRepo);
        console.log(`[available-tests] Cloned to: ${clonedRepoPath}`);
        
        testSourcePath = await findTestDirectory(clonedRepoPath);
        console.log(`[available-tests] Test directory: ${testSourcePath}`);
        
        // Discover all tests from the external repository (no folder filtering)
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

        // Parse JSON from stdout - should be a clean JSON array now
        // Try to find JSON array in output (may have some stderr mixed in)
        let jsonMatch = stdout.match(/^\s*\[[\s\S]*\]\s*$/m);
        if (!jsonMatch) {
          // Try to find any JSON array in the output
          jsonMatch = stdout.match(/\[[\s\S]*\]/);
        }
        
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
          // Parse the JSON array
          tests = JSON.parse(jsonMatch[0]);
        } catch (parseError: any) {
          console.error(`[available-tests] Error parsing JSON:`, parseError);
          console.error(`[available-tests] JSON string (first 500 chars): ${jsonMatch[0].substring(0, 500)}`);
          console.error(`[available-tests] Full stdout: ${stdout}`);
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

        // Group tests by category (no folder filtering for GitHub repos - show all tests)
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
    // Use the same folder filter logic (already defined above)
    const localFolderFilter = getFolderFilter(suiteName);
    
    // Run the test discovery script with optional folder filter
    const runnerPath = path.join(process.cwd(), "playwright-runner");
    const command = localFolderFilter 
      ? `node discover-tests.js ${localFolderFilter}`
      : "node discover-tests.js";
    
    console.log(`[available-tests] Discovering tests with folder filter: ${localFolderFilter || 'none'}`);
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
    
    // Additional filtering: if localFolderFilter is set, ensure tests are from that folder
    let filteredTests = tests;
    if (localFolderFilter) {
      filteredTests = tests.filter((test: any) => {
        // testFile should be like "furniture-store/homepage.spec.js" or "ecommerce-store/authentication.spec.js"
        return test.testFile.startsWith(`${localFolderFilter}/`);
      });
      console.log(`[available-tests] Filtered ${tests.length} tests to ${filteredTests.length} tests in folder: ${localFolderFilter}`);
    }
    
    // Group tests by category (file)
    // testFile now includes folder path (e.g., "ecommerce-store/authentication.spec.js")
    const categories = filteredTests.reduce((acc: any, test: any) => {
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

