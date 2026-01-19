"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTestSuitePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get selected company from localStorage (set by dropdown)
      const selectedCompany = localStorage.getItem("selectedCompany");
      
      // Use API route to create test suite (handles RLS for admin users)
      const createResponse = await fetch("/api/suites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          github_repo: githubRepo || null,
          company: selectedCompany || null,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || "Failed to create test suite");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create test suite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-2 mb-4 transition hover:opacity-80"
          style={{ color: '#FD5D1C' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-3xl font-bold" style={{ color: '#0e545e' }}>New Test Suite</h1>
        <p className="text-gray-600 mt-1">
          Create a new test suite to run your Playwright tests
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</div>
        )}

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Suite Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Homepage Tests, Checkout Flow"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional description of what this test suite covers"
          />
        </div>

        <div>
          <label
            htmlFor="githubRepo"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            GitHub Repository
          </label>
          <input
            id="githubRepo"
            type="text"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., username/repo-name"
          />
          <p className="text-sm text-gray-500 mt-1">
            Optional: Link to the GitHub repository containing your tests
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition font-medium hover:opacity-90"
            style={{ backgroundColor: '#FD5D1C' }}
          >
            {loading ? "Creating..." : "Create Test Suite"}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition text-gray-700 font-medium"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

