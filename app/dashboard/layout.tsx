"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { LogOut, Home, Play, ChevronDown } from "lucide-react";
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
  const [profile, setProfile] = useState<any>(null);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        
        // Fetch profile to get company name
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("id", user.id)
          .single();
        
        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }
        
        if (profileData) {
          setProfile(profileData);
        }

        // Fetch all unique company names from API (bypasses RLS)
        try {
          const companiesResponse = await fetch('/api/companies');
          const companiesData = await companiesResponse.json();
          
          if (companiesData.success && companiesData.companies) {
            const fetchedCompanies = companiesData.companies;
            setCompanies(fetchedCompanies);

            // Set selected company from localStorage or default to user's company
            const storedCompany = localStorage.getItem("selectedCompany");
            let companyToSet = "";
            
            if (storedCompany && fetchedCompanies.includes(storedCompany)) {
              companyToSet = storedCompany;
            } else if (profileData?.company_name) {
              companyToSet = profileData.company_name;
            } else if (fetchedCompanies.length > 0) {
              companyToSet = fetchedCompanies[0];
            }
            
            if (companyToSet) {
              setSelectedCompany(companyToSet);
              localStorage.setItem("selectedCompany", companyToSet);
              // Set cookie for server components to read
              document.cookie = `selectedCompany=${encodeURIComponent(companyToSet)}; path=/; max-age=31536000; SameSite=Lax`;
            }
          }
        } catch (error) {
          console.error("Error fetching companies:", error);
        }
      }
      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  const handleCompanyChange = async (companyName: string) => {
    setSelectedCompany(companyName);
    localStorage.setItem("selectedCompany", companyName);
    
    // Set cookie for server components to read
    document.cookie = `selectedCompany=${encodeURIComponent(companyName)}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Dispatch custom event for TestSelector to listen to
    window.dispatchEvent(new CustomEvent("companyChanged"));
    
    // Refresh the page to apply the new company context
    router.refresh();
  };

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

                    <div className="relative">
                      <select
                        value={selectedCompany || ""}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        className="appearance-none bg-transparent border border-white/30 rounded-md px-4 py-2 pr-8 text-white font-medium cursor-pointer hover:border-white/50 transition focus:outline-none focus:ring-2 focus:ring-white/30"
                        style={{ color: 'white' }}
                      >
                        {loading ? (
                          <option value="">Loading...</option>
                        ) : companies.length > 0 ? (
                          companies.map((company) => (
                            <option 
                              key={company} 
                              value={company}
                              style={{ color: '#0e545e', backgroundColor: 'white' }}
                            >
                              {company}
                            </option>
                          ))
                        ) : (
                          <option value="" style={{ color: '#0e545e', backgroundColor: 'white' }}>
                            Your Company
                          </option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white pointer-events-none" />
                    </div>
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

