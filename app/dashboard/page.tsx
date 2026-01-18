import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import TestSuiteCard from "@/components/TestSuiteCard";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cookies } from "next/headers";

export default async function DashboardPage() {
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

  let testSuites: any[] = [];
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
      
      // Use admin client to bypass RLS when querying test_suites (admin needs to see all suites for selected company)
      const result = await supabaseAdmin
        .from("test_suites")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });
      testSuites = result.data || [];
      error = result.error;
    } else {
      // No users with this company, return empty array
      testSuites = [];
    }
  } else {
    // No company selected in dropdown
    if (isAdmin) {
      // Admin users see all test suites when no company is selected
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const result = await supabaseAdmin
        .from("test_suites")
        .select("*")
        .order("created_at", { ascending: false });
      testSuites = result.data || [];
      error = result.error;
    } else {
      // Non-admin users see only their own test suites
      const result = await supabase
        .from("test_suites")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      testSuites = result.data || [];
      error = result.error;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#0e545e' }}>Test Suites</h1>
          <p className="text-gray-600 mt-1">
            Manage and run your automated tests
          </p>
        </div>
        <Link
          href="/dashboard/suites/new"
          className="flex items-center space-x-2 text-white px-4 py-2 rounded-lg transition hover:opacity-90"
          style={{ backgroundColor: '#FD5D1C' }}
        >
          <Plus className="w-5 h-5" />
          <span>New Suite</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          Error loading test suites: {error.message}
        </div>
      )}

      {testSuites && testSuites.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <h3 className="text-xl font-semibold mb-2" style={{ color: '#0e545e' }}>
            No test suites yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first test suite to get started
          </p>
          <Link
            href="/dashboard/suites/new"
            className="inline-flex items-center space-x-2 text-white px-6 py-3 rounded-lg transition hover:opacity-90"
            style={{ backgroundColor: '#FD5D1C' }}
          >
            <Plus className="w-5 h-5" />
            <span>Create Test Suite</span>
          </Link>
        </div>
      )}

      {testSuites && testSuites.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testSuites.map((suite) => (
            <TestSuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
      )}
    </div>
  );
}

