'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StopCircle, Loader2 } from 'lucide-react';

interface StopTestButtonProps {
  runId: string;
  status: string;
}

export default function StopTestButton({ runId, status }: StopTestButtonProps) {
  const router = useRouter();
  const [isStopping, setIsStopping] = useState(false);

  // Only show button if test is running
  if (status !== 'running' && status !== 'pending') {
    return null;
  }

  const handleStop = async () => {
    if (!confirm('Are you sure you want to stop this test run?')) {
      return;
    }

    setIsStopping(true);

    try {
      const response = await fetch(`/api/stop-test/${runId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the page to show updated status
        router.refresh();
      } else {
        alert('Failed to stop test run: ' + (data.error || 'Unknown error'));
        setIsStopping(false);
      }
    } catch (error) {
      console.error('Error stopping test:', error);
      alert('Failed to stop test run. Please try again.');
      setIsStopping(false);
    }
  };

  return (
    <button
      onClick={handleStop}
      disabled={isStopping}
      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
      title="Stop running tests"
    >
      {isStopping ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Stopping...</span>
        </>
      ) : (
        <>
          <StopCircle className="w-5 h-5" />
          <span>Stop Tests</span>
        </>
      )}
    </button>
  );
}

