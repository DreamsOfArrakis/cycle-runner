'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TestSelector from './TestSelector';

interface TestSuiteActionsProps {
  suiteId: string;
}

export default function TestSuiteActions({ suiteId }: TestSuiteActionsProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTests = async (selectedTests: { testName: string; testFile: string }[]) => {
    if (selectedTests.length === 0) {
      alert('Please select at least one test to run');
      return;
    }

    setIsRunning(true);

    try {
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
        // Navigate to the test run details page
        router.push(`/dashboard/runs/${data.runId}`);
      } else {
        alert('Failed to start test run: ' + (data.error || 'Unknown error'));
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Error triggering test:', error);
      alert('Failed to start test run. Please try again.');
      setIsRunning(false);
    }
  };

  return (
    <TestSelector
      suiteId={suiteId}
      onRunTests={handleRunTests}
      isRunning={isRunning}
    />
  );
}

