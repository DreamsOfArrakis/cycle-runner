'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

interface AutoRefreshWrapperProps {
  runId: string;
  initialStatus: string;
  children: React.ReactNode;
}

export default function AutoRefreshWrapper({
  runId,
  initialStatus,
  children,
}: AutoRefreshWrapperProps) {
  const router = useRouter();
  const [isPolling, setIsPolling] = useState(
    initialStatus === 'running' || initialStatus === 'pending'
  );

  useEffect(() => {
    // Only poll if the test is still running
    if (initialStatus !== 'running' && initialStatus !== 'pending') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/test-run-status/${runId}`);
        const data = await response.json();

        // If status changed to completed or failed, refresh the page
        if (data.status === 'completed' || data.status === 'failed') {
          setIsPolling(false);
          router.refresh();
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling test status:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [runId, initialStatus, router]);

  return (
    <>
      {isPolling && (
        <div className="fixed top-4 right-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">
            Tests running... Page will auto-refresh when complete
          </span>
        </div>
      )}
      {children}
    </>
  );
}

