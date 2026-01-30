'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StopCircle, Loader2 } from 'lucide-react';

interface StopTestButtonProps {
  runId: string;
  status: string;
}

export default function StopTestButton({ runId, status }: StopTestButtonProps) {
  const router = useRouter();
  const [isStopping, setIsStopping] = useState(false);
  const [hasStopped, setHasStopped] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  // Update current status when prop changes
  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  // Poll status after stopping to detect cancellation
  useEffect(() => {
    if (isStopping || hasStopped) {
      const pollStatus = async () => {
        try {
          const response = await fetch(`/api/test-run-status/${runId}`);
          const data = await response.json();
          if (data.status) {
            setCurrentStatus(data.status);
            if (data.status === 'cancelled' || data.status === 'completed' || data.status === 'failed') {
              setIsStopping(false);
              setHasStopped(false);
              router.refresh();
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      };

      const interval = setInterval(pollStatus, 500); // Poll every 500ms
      return () => clearInterval(interval);
    }
  }, [isStopping, hasStopped, runId, router]);

  // Only show button if test is running and hasn't been stopped
  if (currentStatus !== 'running' && currentStatus !== 'pending') {
    return null;
  }

  if (hasStopped) {
    return null; // Hide button immediately after stopping
  }

  const handleStop = async () => {
    if (!confirm('Are you sure you want to stop this test run?')) {
      return;
    }

    setIsStopping(true);
    setHasStopped(true); // Hide button immediately

    try {
      const response = await fetch(`/api/stop-test/${runId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Status polling will handle the refresh
        // Don't reset hasStopped here - let the polling detect the cancelled status
      } else {
        alert('Failed to stop test run: ' + (data.error || 'Unknown error'));
        setIsStopping(false);
        setHasStopped(false); // Show button again on error
      }
    } catch (error) {
      console.error('Error stopping test:', error);
      alert('Failed to stop test run. Please try again.');
      setIsStopping(false);
      setHasStopped(false); // Show button again on error
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

