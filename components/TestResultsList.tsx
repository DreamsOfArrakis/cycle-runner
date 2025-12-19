'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Video } from 'lucide-react';

interface Test {
  name: string;
  status: string;
  duration: number;
  passed: boolean;
  failed: boolean;
  videoUrl?: string;
}

interface TestResultsListProps {
  tests: Test[];
}

export default function TestResultsList({ tests }: TestResultsListProps) {
  const [expandedVideos, setExpandedVideos] = useState<Set<number>>(new Set());

  const toggleVideo = (index: number) => {
    const newExpanded = new Set(expandedVideos);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedVideos(newExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">
        Individual Test Results ({tests.length} tests)
      </h2>
      <div className="space-y-3">
        {tests.map((test, index) => (
          <div key={index}>
            <div className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition" style={{ border: '1px solid #0e545e33' }}>
              <div className="flex items-center space-x-3">
                {test.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <span className="font-medium" style={{ color: '#0e545e' }}>{test.name}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {(test.duration / 1000).toFixed(1)}s
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    test.passed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {test.status}
                </span>
                {test.videoUrl && (
                  <button
                    onClick={() => toggleVideo(index)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View screen recording"
                  >
                    <Video className="w-5 h-5" style={{ color: expandedVideos.has(index) ? '#FD5D1C' : '#9ca3af' }} />
                  </button>
                )}
              </div>
            </div>
            {test.videoUrl && expandedVideos.has(index) && (
              <div className="mt-2 px-4 pb-2">
                <video
                  controls
                  autoPlay
                  className="w-full rounded-lg bg-black"
                  preload="metadata"
                  style={{ maxHeight: '400px' }}
                >
                  <source src={test.videoUrl} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

