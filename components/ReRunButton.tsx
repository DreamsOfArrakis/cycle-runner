'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, RotateCcw } from 'lucide-react';

interface ReRunButtonProps {
  runId: string;
  suiteId: string;
}

export default function ReRunButton({ runId, suiteId }: ReRunButtonProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);

  const handleReRun = async () => {
    setIsRunning(true);

    try {
      // Fetch the test results from the current run to get the list of tests
      const supabase = createClient();
      const { data: testResults, error } = await supabase
        .from('test_results')
        .select('test_name, test_file')
        .eq('test_run_id', runId);

      if (error) {
        console.error('Error fetching test results:', error);
        alert('Failed to fetch test results. Please try again.');
        setIsRunning(false);
        return;
      }

      if (!testResults || testResults.length === 0) {
        alert('No tests found in this run.');
        setIsRunning(false);
        return;
      }

      // Convert to the format expected by the API
      const selectedTests = testResults.map(result => ({
        testName: result.test_name,
        testFile: result.test_file,
      }));

      // Trigger a new test run with the same tests
      const response = await fetch('/api/trigger-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suiteId,
          selectedTests,
        }),
      });

      const data = await response.json();

      if (data.success && data.runId) {
        // Navigate to the new test run details page
        router.push(`/dashboard/runs/${data.runId}`);
      } else {
        alert('Failed to start test run: ' + (data.error || 'Unknown error'));
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Error re-running tests:', error);
      alert('Failed to re-run tests. Please try again.');
      setIsRunning(false);
    }
  };

  return (
    <button
      onClick={handleReRun}
      disabled={isRunning}
      className="flex items-center space-x-2 px-4 py-2 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium hover:opacity-90"
      style={{ backgroundColor: isRunning ? '#d1d5db' : '#FD5D1C' }}
    >
      {isRunning ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Running...</span>
        </>
      ) : (
        <>
          <RotateCcw className="w-4 h-4" />
          <span>Re-Run</span>
        </>
      )}
    </button>
  );
}

