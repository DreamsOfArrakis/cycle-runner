"use client";

import Link from "next/link";
import { PlayCircle, CheckCircle, BarChart3 } from "lucide-react";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <main 
        className="flex-1 relative"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(4, 116, 131, 0.95) 0%, 
              rgba(119, 188, 199, 0.85) 60%, 
              rgba(14, 165, 233, 0.75) 100%
            ),
            url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100" height="100" filter="url(%23n)" opacity=".08"/></svg>') repeat,
            #047483
          `
        }}
      >
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-4 text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              Cycle Runner
            </h1>
            <p className="text-xl mb-8 text-white" style={{ opacity: 0.95, maxWidth: '600px', margin: '0 auto 2rem' }}>
              Automated testing platform for modern teams
            </p>
            <Link
              href="/login"
              className="inline-block text-white px-8 py-3 rounded-lg font-semibold transition shadow-lg"
              style={{ 
                backgroundColor: '#FD5D1C',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
            >
              Get Started
            </Link>
          </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div 
            className="p-6 rounded-lg shadow-lg backdrop-blur-md transition hover:shadow-xl"
            style={{ 
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <PlayCircle className="w-12 h-12 mb-4" style={{ color: '#FD5D1C' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#0e545e' }}>Run Tests On-Demand</h3>
            <p className="text-gray-700">
              Trigger your Playwright tests with a single click from our
              dashboard
            </p>
          </div>

          <div 
            className="p-6 rounded-lg shadow-lg backdrop-blur-md transition hover:shadow-xl"
            style={{ 
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#0e545e' }}>View Results</h3>
            <p className="text-gray-700">
              See detailed test results, screenshots, and failure logs
            </p>
          </div>

          <div 
            className="p-6 rounded-lg shadow-lg backdrop-blur-md transition hover:shadow-xl"
            style={{ 
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <BarChart3 className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#0e545e' }}>Track History</h3>
            <p className="text-gray-700">
              Monitor test trends and keep a complete history of all runs
            </p>
          </div>
        </div>
      </div>
      </main>
      
      <Footer />
    </div>
  );
}

