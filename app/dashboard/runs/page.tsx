import { createClient } from "@/lib/supabase/server";
import TestRunRow from "@/components/TestRunRow";
import { formatDistanceToNow } from "date-fns";

export default async function TestRunsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: testRuns, error } = await supabase
    .from("test_runs")
    .select(`
      *,
      test_suites(name)
    `)
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(50);

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

