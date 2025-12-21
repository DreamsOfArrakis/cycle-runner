'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TestResult {
  id: string;
  test_name: string;
  test_file: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration_ms: number | null;
  error_message: string | null;
  video_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at?: string;
}

interface IndividualTestResultsProps {
  runId: string;
  runStatus: string;
}

export default function IndividualTestResults({ runId, runStatus }: IndividualTestResultsProps) {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('test_run_id', runId)
        .order('test_file', { ascending: true });

      if (error) {
        console.error('Error fetching test results:', error);
        return;
      }

      if (data) {
        setTests(data);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();

    // Poll for updates if test run is still running
    if (runStatus === 'running' || runStatus === 'pending') {
      const interval = setInterval(fetchTests, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [runId, runStatus]);

  const toggleVideo = (testId: string) => {
    const newExpanded = new Set(expandedVideos);
    if (newExpanded.has(testId)) {
      newExpanded.delete(testId);
    } else {
      newExpanded.add(testId);
    }
    setExpandedVideos(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 animate-spin" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status}
      </span>
    );
  };

  // Group tests by file and sort within each file by execution order
  const testsByFile = tests.reduce((acc, test) => {
    if (!acc[test.test_file]) {
      acc[test.test_file] = [];
    }
    acc[test.test_file].push(test);
    return acc;
  }, {} as Record<string, TestResult[]>);

  // Sort tests within each file by creation/execution order to maintain consistent position
  // This ensures tests stay in the same order they were created/run, regardless of pass/fail status
  Object.keys(testsByFile).forEach(fileName => {
    testsByFile[fileName].sort((a, b) => {
      // First, try to sort by started_at (execution order) if both have it
      if (a.started_at && b.started_at) {
        return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
      }
      // If one has started_at and the other doesn't, prioritize the one with started_at
      if (a.started_at && !b.started_at) return -1;
      if (!a.started_at && b.started_at) return 1;
      // Fallback to created_at (insertion order) if available
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // If one has created_at and the other doesn't, prioritize the one with created_at
      if (a.created_at && !b.created_at) return -1;
      if (!a.created_at && b.created_at) return 1;
      // Final fallback: use ID for consistent ordering (maintains insertion order)
      return a.id.localeCompare(b.id);
    });
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading test results...</span>
        </div>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600 text-center">No test results available yet.</p>
      </div>
    );
  }

  const stats = tests.reduce(
    (acc, test) => {
      acc[test.status]++;
      return acc;
    },
    { pending: 0, running: 0, passed: 0, failed: 0 }
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Individual Test Results ({tests.length} tests)
        </h2>
        <div className="flex items-center space-x-4 text-sm">
          {stats.pending > 0 && (
            <span className="text-gray-600">⏳ {stats.pending} pending</span>
          )}
          {stats.running > 0 && (
            <span className="text-blue-600">🔵 {stats.running} running</span>
          )}
          {stats.passed > 0 && (
            <span className="text-green-600">✅ {stats.passed} passed</span>
          )}
          {stats.failed > 0 && (
            <span className="text-red-600">❌ {stats.failed} failed</span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(testsByFile).map(([fileName, fileTests]) => (
          <div key={fileName}>
            <h3 className="text-sm font-medium text-gray-700 mb-2 px-2">
              📁 {fileName}
            </h3>
            <div className="space-y-2">
              {fileTests.map((test) => (
                <div key={test.id}>
                  <div className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition" style={{ border: '1px solid #0e545e33' }}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getStatusIcon(test.status)}
                      <span className="font-medium truncate" style={{ color: '#0e545e' }}>
                        {test.test_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      {test.duration_ms && (
                        <span className="text-sm text-gray-500">
                          {(test.duration_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                      {getStatusBadge(test.status)}
                      {test.video_url && (
                        <button
                          onClick={() => toggleVideo(test.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View screen recording"
                        >
                          <Video
                            className="w-5 h-5"
                            style={{ color: expandedVideos.has(test.id) ? '#FD5D1C' : '#9ca3af' }}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Error message */}
                  {test.error_message && (
                    <div className="mt-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800 font-mono whitespace-pre-wrap">
                        {test.error_message}
                      </p>
                    </div>
                  )}

                  {/* Video player */}
                  {test.video_url && expandedVideos.has(test.id) && (
                    <div className="mt-2 px-4 pb-2">
                      <video
                        controls
                        autoPlay
                        className="w-full rounded-lg bg-black"
                        preload="metadata"
                        style={{ maxHeight: '400px' }}
                      >
                        <source src={test.video_url} type="video/webm" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

