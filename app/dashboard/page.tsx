import { createClient } from "@/lib/supabase/server";
import TestSuiteCard from "@/components/TestSuiteCard";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: testSuites, error } = await supabase
    .from("test_suites")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

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

