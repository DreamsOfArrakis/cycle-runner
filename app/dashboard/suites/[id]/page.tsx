import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TestRunRow from "@/components/TestRunRow";
import TestSuiteActions from "@/components/TestSuiteActions";
import TestSuiteHeader from "@/components/TestSuiteHeader";

export default async function TestSuitePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: suite, error } = await supabase
    .from("test_suites")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !suite) {
    notFound();
  }

  // Get recent test runs for this suite
  const { data: testRuns } = await supabase
    .from("test_runs")
    .select("*")
    .eq("suite_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-2 mb-4 transition hover:opacity-80"
          style={{ color: '#FD5D1C' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <TestSuiteHeader suite={suite} />
        <p className="text-lg text-gray-600 mt-2">Select which tests to run, or run all tests at once</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            GitHub Repository
          </h3>
          {suite.github_repo ? (
            <a
              href={`https://github.com/${suite.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline transition hover:opacity-80"
              style={{ color: '#FD5D1C' }}
            >
              {suite.github_repo}
            </a>
          ) : (
            <p className="text-gray-400">Not configured</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            Total Test Runs
          </h3>
          <p className="text-2xl font-bold" style={{ color: '#0e545e' }}>
            {testRuns?.length || 0}
          </p>
        </div>
      </div>

      <TestSuiteActions suiteId={params.id} />

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Test Run History</h2>
          <Link
            href="/dashboard/runs"
            className="text-sm font-medium transition hover:opacity-80"
            style={{ color: '#FD5D1C' }}
          >
            View All Runs →
          </Link>
        </div>

        {testRuns && testRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2 text-lg">No test runs yet</p>
            <p className="text-sm text-gray-400">
              Select and run tests above to see your test history here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

