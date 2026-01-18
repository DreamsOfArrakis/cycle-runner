"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          companyName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7FCFC' }}>
      <main 
        className="flex-1 flex items-center justify-center px-4 py-16 backdrop-blur-sm"
        style={{
          background: `
            linear-gradient(to bottom, 
              rgba(119, 188, 199, 1) 0%,
              rgba(130, 190, 205, 0.85) 25%,
              rgba(140, 195, 210, 0.75) 40%,
              rgba(160, 205, 220, 0.6) 55%,
              rgba(180, 215, 225, 0.4) 70%,
              rgba(200, 225, 230, 0.2) 85%,
              transparent 100%
            )
          `,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <span 
                className="text-4xl font-bold text-white"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                  letterSpacing: '-0.03em',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                CYCLE-RUNNER
              </span>
            </div>
            <p className="text-white text-lg" style={{ opacity: 0.95 }}>Create your account</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div 
              className="backdrop-blur-md rounded-lg shadow-lg p-6 space-y-4"
              style={{ 
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              {error && (
                <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#0e545e' }}
                >
                  Company Name *
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="The Furniture Store"
                  style={{ borderColor: '#0e545e33' }}
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#0e545e' }}
                >
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="thefurniturestore@example.com"
                  style={{ borderColor: '#0e545e33' }}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1"
                  style={{ color: '#0e545e' }}
                >
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="••••••••"
                  style={{ borderColor: '#0e545e33' }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-lg"
                style={{ 
                  backgroundColor: '#FD5D1C',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium transition hover:opacity-80"
                    style={{ color: '#FD5D1C' }}
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

