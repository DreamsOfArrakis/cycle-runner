"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { LogOut, Home, Play } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import Footer from "@/components/Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7FCFC' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#97BEC5' }}></div>
          <p className="mt-4" style={{ color: '#97BEC5' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

          return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7FCFC' }}>
              {/* Combined Navigation with Futuristic Gradient Blend */}
              <div 
                className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
                style={{ 
                  background: `
                    linear-gradient(180deg, 
                      rgba(4, 116, 131, 0.9) 0%, 
                      rgba(30, 140, 155, 0.85) 40%,
                      rgba(70, 170, 185, 0.8) 70%,
                      rgba(119, 188, 199, 0.75) 100%
                    )
                  `,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(4, 116, 131, 0.2)'
                }}
              >
                {/* Main Navigation */}
                <div className="container mx-auto px-4">
                  <div className="flex justify-between items-center h-16">
                    <Link href="/dashboard" className="flex items-center text-2xl font-bold text-white hover:opacity-80 transition">
                      <span 
                        style={{
                          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                          letterSpacing: '-0.02em',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        CYCLE-RUNNER
                      </span>
                    </Link>
                  </div>
                </div>

                {/* Subtle Divider with Glow */}
                <div 
                  style={{ 
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 80%, transparent 100%)',
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.2)'
                  }}
                ></div>

                {/* Sub Navigation */}
                <div className="container mx-auto px-4">
                  <div className="flex justify-between items-center" style={{ height: '36px' }}>
                    <div className="flex space-x-6">
                      <Link
                        href="/dashboard"
                        className="flex items-center space-x-2 transition font-medium text-white hover:text-[#FD5D1C]"
                      >
                        <Home className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/dashboard/runs"
                        className="flex items-center space-x-2 transition font-medium text-white hover:text-[#FD5D1C]"
                      >
                        <Play className="w-4 h-4" />
                        <span>Test Runs</span>
                      </Link>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-white">{user.email}</span>
                      <LogoutButton />
                    </div>
                  </div>
                </div>
              </div>

      {/* Add padding-top to account for fixed navigation with extra breathing room */}
      <main className="flex-1 container mx-auto px-4 py-8" style={{ paddingTop: '150px' }}>{children}</main>
      
      <Footer />
    </div>
  );
}

