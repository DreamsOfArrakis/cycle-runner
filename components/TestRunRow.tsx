import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, Clock, Loader } from "lucide-react";

interface TestRun {
  id: string;
  status: string;
  duration_ms: number | null;
  tests_passed: number | null;
  tests_failed: number | null;
  created_at: string;
  test_suites?: { name: string };
}

export default function TestRunRow({ run }: { run: TestRun }) {
  const getStatusIcon = () => {
    switch (run.status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "running":
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      running: "bg-blue-100 text-blue-800",
      pending: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${
          colors[run.status] || colors.pending
        }`}
      >
        {run.status}
      </span>
    );
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          {getStatusBadge()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium" style={{ color: '#0e545e' }}>
          {run.test_suites?.name || "Unknown Suite"}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDuration(run.duration_ms)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {run.tests_passed !== null && run.tests_failed !== null ? (
          <div className="flex space-x-4">
            <span className="text-green-600">✓ {run.tests_passed}</span>
            <span className="text-red-600">✗ {run.tests_failed}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Link
          href={`/dashboard/runs/${run.id}`}
          className="transition hover:opacity-80"
          style={{ color: '#FD5D1C' }}
        >
          View Details
        </Link>
      </td>
    </tr>
  );
}

