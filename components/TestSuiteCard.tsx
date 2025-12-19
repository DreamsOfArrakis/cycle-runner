"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Clock } from "lucide-react";

interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  github_repo: string | null;
  is_active: boolean;
  created_at: string;
}

export default function TestSuiteCard({ suite }: { suite: TestSuite }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/dashboard/suites/${suite.id}`);
  };

  const handleRunTest = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setRunning(true);
    setError("");

    try {
      const response = await fetch("/api/trigger-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suiteId: suite.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to trigger test");
      }

      const data = await response.json();
      
      // Redirect to the test run page
      window.location.href = `/dashboard/runs/${data.runId}`;
    } catch (err: any) {
      setError(err.message || "Failed to trigger test");
      setRunning(false);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer" 
      style={{ borderColor: '#A7C1C5', borderWidth: '1px' }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold transition" style={{ color: '#0e545e' }}>
            {suite.name}
          </h3>
          {suite.description && (
            <p className="text-sm mt-1" style={{ color: '#0e545e' }}>{suite.description}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            suite.is_active
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {suite.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {suite.github_repo && (
        <p className="text-sm mb-4" style={{ color: '#0e545e' }}>
          📦 {suite.github_repo}
        </p>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-2 rounded text-sm mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col space-y-2">
        <button
          onClick={handleRunTest}
          disabled={running || !suite.is_active}
          className="w-full flex items-center justify-center space-x-2 text-white px-4 py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          style={{ backgroundColor: '#FD5D1C' }}
          onMouseEnter={(e) => !running && suite.is_active && (e.currentTarget.style.backgroundColor = '#F47D56')}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FD5D1C'}
        >
          {running ? (
            <>
              <Clock className="w-5 h-5 animate-spin" />
              <span>Running All Tests...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Run All Tests</span>
            </>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/suites/${suite.id}`);
          }}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition font-medium"
          style={{ borderColor: '#FD5D1C', borderWidth: '2px', color: '#FD5D1C' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FFF5F2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span>Select & Run Tests</span>
        </button>
      </div>
    </div>
  );
}

