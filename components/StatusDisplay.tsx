'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface StatusDisplayProps {
  runId: string;
  initialStatus: string;
  showIcon?: boolean;
  showText?: boolean;
}

export default function StatusDisplay({ 
  runId, 
  initialStatus, 
  showIcon = false, 
  showText = true 
}: StatusDisplayProps) {
  const [status, setStatus] = useState(initialStatus);

  // Update status when initialStatus prop changes (e.g., after page refresh)
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    // Poll for status updates if still running
    if (status === 'running' || status === 'pending') {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/test-run-status/${runId}`);
          const data = await response.json();
          if (data.status) {
            setStatus(data.status);
            // Stop polling if status changed to final state
            if (data.status !== 'running' && data.status !== 'pending') {
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 500); // Poll every 500ms for fast updates

      return () => clearInterval(pollInterval);
    }
  }, [runId, status]);

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case "failed":
        return <XCircle className="w-8 h-8 text-red-600" />;
      case "cancelled":
        return <XCircle className="w-8 h-8 text-orange-600" />;
      case "running":
        return <Clock className="w-8 h-8 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-8 h-8 text-gray-400" />;
    }
  };

  return (
    <>
      {showIcon && getStatusIcon()}
      {showText && <div className="text-2xl font-bold capitalize">{status}</div>}
    </>
  );
}

