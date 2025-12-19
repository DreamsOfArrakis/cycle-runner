"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Save, X, Trash2 } from "lucide-react";

interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  github_repo: string | null;
  is_active: boolean;
}

interface TestSuiteHeaderProps {
  suite: TestSuite;
}

export default function TestSuiteHeader({ suite }: TestSuiteHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: suite.name,
    description: suite.description || "",
    github_repo: suite.github_repo || "",
    is_active: suite.is_active,
  });

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/suites/${suite.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update suite");
      }

      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: suite.name,
      description: suite.description || "",
      github_repo: suite.github_repo || "",
      is_active: suite.is_active,
    });
    setError(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this test suite? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/suites/${suite.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete suite");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete suite");
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Suite Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Describe what this test suite does..."
              />
            </div>

            <div>
              <label htmlFor="github_repo" className="block text-sm font-medium text-gray-700 mb-1">
                GitHub Repository
              </label>
              <input
                type="text"
                id="github_repo"
                value={formData.github_repo}
                onChange={(e) => setFormData({ ...formData, github_repo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g., username/repo-name"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active (can run tests)
              </label>
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.name.trim()}
                className="flex items-center space-x-2 px-4 py-2 text-white rounded-md transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                style={{ backgroundColor: '#FD5D1C' }}
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 border-2 rounded-md transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                style={{ borderColor: '#0e545e', color: '#0e545e' }}
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-3xl font-bold" style={{ color: '#0e545e' }}>
            {suite.name}
          </h1>
          {suite.description && (
            <p className="text-gray-600 mt-1">{suite.description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 text-sm rounded-full ${
              suite.is_active
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {suite.is_active ? "Active" : "Inactive"}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1 px-3 py-2 rounded-md transition hover:bg-gray-100"
            style={{ color: '#FD5D1C' }}
            title="Edit suite"
          >
            <Edit2 className="w-4 h-4" />
            <span className="text-sm font-medium">Edit</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center space-x-1 px-3 py-2 text-red-600 rounded-md transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete suite"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting && <span className="text-sm font-medium">Deleting...</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

