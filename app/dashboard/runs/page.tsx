import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import TestRunRow from "@/components/TestRunRow";
import { formatDistanceToNow } from "date-fns";
import { cookies } from "next/headers";

export default async function TestRunsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin (cyclerunner@example.com)
  const isAdmin = user?.email === "cyclerunner@example.com";

  // Get selected company from cookie (set by dropdown in layout)
  const cookieStore = await cookies();
  const selectedCompanyRaw = cookieStore.get("selectedCompany")?.value;
  // Decode the cookie value (it's URL-encoded when set)
  const selectedCompany = selectedCompanyRaw ? decodeURIComponent(selectedCompanyRaw) : null;

  let testRuns: any[] = [];
  let error: any = null;

  // If company is selected in dropdown, filter by users with that company (for all users, including admin)
  if (selectedCompany) {
    // Use admin client to bypass RLS and get all users for the company
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all user IDs for the selected company (bypasses RLS)
    const { data: companyProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("company_name", selectedCompany);

    if (companyProfiles && companyProfiles.length > 0) {
      const userIds = companyProfiles.map((p) => p.id);
      // Use admin client to bypass RLS when querying test_runs (admin needs to see all runs for selected company)
      const result = await supabaseAdmin
        .from("test_runs")
        .select(`
          *,
          test_suites(name)
        `)
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(50);
      testRuns = result.data || [];
      error = result.error;
    } else {
      // No users with this company, return empty array
      testRuns = [];
    }
  } else {
    // No company selected in dropdown
    if (isAdmin) {
      // Admin users see all test runs when no company is selected
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const result = await supabaseAdmin
        .from("test_runs")
        .select(`
          *,
          test_suites(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      testRuns = result.data || [];
      error = result.error;
    } else {
      // Non-admin users see only their own test runs
      const result = await supabase
        .from("test_runs")
        .select(`
          *,
          test_suites(name)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);
      testRuns = result.data || [];
      error = result.error;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#0e545e' }}>Test Runs</h1>
        <p className="text-gray-600 mt-1">History of all your test executions</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          Error loading test runs: {error.message}
        </div>
      )}

      {testRuns && testRuns.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#0e545e' }}>
            No test runs yet
          </h3>
          <p className="text-gray-600">
            Run your first test from the dashboard
          </p>
        </div>
      )}

      {testRuns && testRuns.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Suite
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testRuns.map((run) => (
                <TestRunRow key={run.id} run={run} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

