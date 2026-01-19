import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import IndividualTestResults from "@/components/IndividualTestResults";
import AutoRefreshWrapper from "@/components/AutoRefreshWrapper";
import StopTestButton from "@/components/StopTestButton";

export default async function TestRunDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user is admin (cyclerunner@example.com)
  const isAdmin = user?.email === "cyclerunner@example.com";

  // Use admin client for admin users to bypass RLS
  let run: any = null;
  let error: any = null;

  if (isAdmin) {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const result = await supabaseAdmin
      .from("test_runs")
      .select(`
        *,
        test_suites(name, description)
      `)
      .eq("id", params.id)
      .single();
    run = result.data;
    error = result.error;
  } else {
    const result = await supabase
      .from("test_runs")
      .select(`
        *,
        test_suites(name, description)
      `)
      .eq("id", params.id)
      .single();
    run = result.data;
    error = result.error;
  }

  if (error || !run) {
    notFound();
  }

  const getStatusIcon = () => {
    switch (run.status) {
      case "completed":
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case "failed":
        return <XCircle className="w-8 h-8 text-red-600" />;
      case "running":
        return <Clock className="w-8 h-8 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-8 h-8 text-gray-400" />;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  return (
    <AutoRefreshWrapper runId={params.id} initialStatus={run.status}>
      <div className="space-y-6">
        <div>
        <Link
          href="/dashboard/runs"
          className="inline-flex items-center space-x-2 mb-4 transition hover:opacity-80"
          style={{ color: '#FD5D1C' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Test Runs</span>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getStatusIcon()}
                  <div>
                    <h1 className="text-3xl font-bold" style={{ color: '#0e545e' }}>
                      {run.test_suites?.name || "Test Run"}
                    </h1>
              <p className="text-gray-600 mt-1">
                {formatDistanceToNow(new Date(run.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
          <StopTestButton runId={params.id} status={run.status} />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">Status</div>
          <div className="text-2xl font-bold capitalize">{run.status}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">Duration</div>
          <div className="text-2xl font-bold">
            {formatDuration(run.duration_ms)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">Passed</div>
          <div className="text-2xl font-bold text-green-600">
            {run.tests_passed || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {run.tests_failed || 0}
          </div>
        </div>
      </div>

        <IndividualTestResults runId={params.id} runStatus={run.status} />

      {run.screenshots && run.screenshots.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Screenshots</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {run.screenshots.map((screenshot: string, index: number) => (
              <div
                key={index}
                className="border rounded-lg overflow-hidden hover:shadow-md transition"
              >
                <a href={screenshot} target="_blank" rel="noopener noreferrer">
                  <img
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {run.logs && (
        <details className="bg-white rounded-lg shadow-sm">
          <summary className="p-6 cursor-pointer hover:bg-gray-50 transition">
            <h2 className="text-xl font-semibold inline">Logs</h2>
            <span className="text-sm text-gray-500 ml-2">(click to expand)</span>
          </summary>
          <div className="px-6 pb-6">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              {run.logs}
            </pre>
          </div>
        </details>
      )}
    </div>
    </AutoRefreshWrapper>
  );
}

