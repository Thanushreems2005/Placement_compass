import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Shield, LockKeyhole, Mail, KeyRound, Loader2, UserPlus, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/components/dsa-buddy/store/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In · SRM Placement Intelligence" },
      {
        name: "description",
        content: "Secure student credential gateway to access your recruitment profile and live company intelligence.",
      },
    ],
  }),
  component: LoginPage,
});

interface Company {
  id: number | string;
  name: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAppStore();
  
  // Auth States
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [tempToken, setTempToken] = useState<string | null>(null);

  // Onboarding Wizard States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [skillLevel, setSkillLevel] = useState("Intermediate");
  const [prepGoal, setPrepGoal] = useState("Standard Placement exam");
  const [weeklyHours, setWeeklyHours] = useState(20);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companiesList, setCompaniesList] = useState<Company[]>([]);

  // Fetch companies list for target tagging directly from Supabase staging_company or companies table
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // 1. Try querying name column from staging_company
        let { data, error } = await supabase
          .from("staging_company")
          .select("name");

        // 2. Resilient fallback to companies table if staging is empty
        if (error || !data || data.length === 0) {
          const { data: compData, error: compError } = await supabase
            .from("companies")
            .select("name");
          
          if (!compError && compData && compData.length > 0) {
            data = compData;
          }
        }

        if (data && data.length > 0) {
          // Remove duplicates and map to { id, name } structure
          const uniqueNames = Array.from(new Set(data.map((c: any) => c.name).filter(Boolean))) as string[];
          const mapped = uniqueNames.map((name, index) => ({
            id: index,
            name: name
          }));
          setCompaniesList(mapped);
        } else {
          throw new Error("No companies found in database.");
        }
      } catch (err) {
        console.error("Supabase company query error, loading static fallbacks:", err);
        // High quality static seeds if backend or connection is syncing
        setCompaniesList([
          { id: 1, name: "Google" },
          { id: 2, name: "Meta" },
          { id: 3, name: "Amazon" },
          { id: 4, name: "Apple" },
          { id: 5, name: "Netflix" },
          { id: 6, name: "Microsoft" },
          { id: 7, name: "Stripe" },
          { id: 8, name: "Uber" },
          { id: 9, name: "Airbnb" },
          { id: 10, name: "OpenAI" }
        ]);
      }
    };
    if (showOnboarding) {
      fetchCompanies();
    }
  }, [showOnboarding]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Sign In Flow
        const form = new URLSearchParams();
        form.set("username", email);
        form.set("password", password);

        const res = await fetch("http://localhost:8000/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
        });

        if (!res.ok) {
          throw new Error("Incorrect email or password. Please try again.");
        }

        const data = await res.json();
        const token = data.access_token;

        const userObj = {
          id: "student-user",
          email: email,
          is_active: true,
          is_superuser: role === "admin",
        };

        // Check if student profile already exists in Supabase
        const { data: profiles } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", userObj.id);

        setAuth(userObj, token);

        if (!profiles || profiles.length === 0) {
          // If no profile, trigger onboarding wizard
          setTempUser(userObj);
          setTempToken(token);
          setShowOnboarding(true);
        } else {
          toast.success("Welcome back! Secure session initialized.");
          navigate({ to: "/career-intelligence" });
        }
      } else {
        // Sign Up Flow
        const res = await fetch("http://localhost:8000/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            role,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Registration failed. Account might already exist.");
        }

        toast.success("Account provisioned successfully! Let's complete your onboarding wizard.");
        
        // Purge previous user's localStorage telemetry to guarantee a completely fresh student workspace
        localStorage.removeItem("portal_submissions");
        localStorage.removeItem("portal_assessments");
        localStorage.removeItem("portal_diagnostics");
        localStorage.removeItem("placement_resume_optimizer_analysis");

        // Auto-login after successful registration to begin onboarding wizard smoothly
        const form = new URLSearchParams();
        form.set("username", email);
        form.set("password", password);

        const loginRes = await fetch("http://localhost:8000/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
        });

        if (loginRes.ok) {
          const loginData = await loginRes.json();
          const token = loginData.access_token;
          const userObj = {
            id: "student-user",
            email: email,
            is_active: true,
            is_superuser: role === "admin",
          };
          
          setTempUser(userObj);
          setTempToken(token);
          setShowOnboarding(true);
        } else {
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyToggle = (companyName: string) => {
    if (selectedCompanies.includes(companyName)) {
      setSelectedCompanies(selectedCompanies.filter((c) => c !== companyName));
    } else {
      if (selectedCompanies.length >= 10) {
        toast.error("You can select up to 10 preferred companies.");
        return;
      }
      setSelectedCompanies([...selectedCompanies, companyName]);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const preferredCompaniesStr = selectedCompanies.join(",");
      
      // 1. Save profile to Supabase student_profiles
      const { error } = await supabase
        .from("student_profiles")
        .insert([
          {
            user_id: tempUser?.id || "student-user",
            skill_level: skillLevel,
            prep_goal: prepGoal,
            weekly_hours: Number(weeklyHours),
            preferred_companies: preferredCompaniesStr,
          }
        ]);

      if (error) {
        console.warn("Supabase profiles write warning, logging local profile state.");
      }

      // 2. Double-persist to local backend SQLite database for full alignment
      try {
        await fetch("http://localhost:8000/api/v1/profiles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tempToken}`
          },
          body: JSON.stringify({
            skill_level: skillLevel,
            prep_goal: prepGoal,
            weekly_hours: Number(weeklyHours),
            preferred_companies: preferredCompaniesStr,
          })
        });
      } catch (err) {
        console.error("Local backend profile sync failed:", err);
      }

      // Finalize global store authentication
      setAuth(tempUser, tempToken);
      
      toast.success("Onboarding profile created! Your placement workspace is ready.");
      navigate({ to: "/career-intelligence" });
    } catch (err: any) {
      toast.error("Failed to store onboarding details. Initializing default profile.");
      setAuth(tempUser, tempToken);
      navigate({ to: "/career-intelligence" });
    } finally {
      setLoading(false);
    }
  };

  if (showOnboarding) {
    return (
      <div className="relative flex min-h-[85vh] items-center justify-center p-4 overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="w-full max-w-xl relative z-10">
          <Card className="border-border/60 bg-surface/80 backdrop-blur-xl shadow-2xl rounded-2xl p-6">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center text-primary mb-4 border border-primary/20">
                <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
                Student Profile Onboarding
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs mt-2">
                Personalize your algorithmic tracking and placement target benchmarks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOnboardingSubmit} className="flex flex-col gap-5">
                
                {/* 1. Skill & Goals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Current Skill Level
                    </label>
                    <select
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border/40 bg-surface text-muted-foreground text-xs focus:ring-0 focus:outline-none"
                    >
                      <option value="Beginner">Beginner (Basic Syntax)</option>
                      <option value="Intermediate">Intermediate (Data Structures)</option>
                      <option value="Advanced">Advanced (Dynamic Programming)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Preparation Goals
                    </label>
                    <select
                      value={prepGoal}
                      onChange={(e) => setPrepGoal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-border/40 bg-surface text-muted-foreground text-xs focus:ring-0 focus:outline-none"
                    >
                      <option value="FAANG Interview Prep">FAANG Placement Prep</option>
                      <option value="Standard Placement exam">Campus Placements</option>
                      <option value="General Skills Building">General Problem Solving</option>
                    </select>
                  </div>
                </div>

                {/* 2. Preparation Hours Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span className="uppercase tracking-wide">Weekly Prep Committment</span>
                    <span className="text-primary">{weeklyHours} hours</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="5"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                    className="w-full accent-primary bg-secondary h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground font-semibold px-1">
                    <span>5 hrs (Casual)</span>
                    <span>20 hrs (Rigorous)</span>
                    <span>40 hrs (Maximum)</span>
                  </div>
                </div>

                {/* 3. Preferred Companies Target */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                    <span className="uppercase tracking-wide">Preferred Target Companies</span>
                    <span className="text-primary font-black">{selectedCompanies.length}/10 Selected</span>
                  </div>
                  
                  {/* Search Bar */}
                  <Input 
                    type="text"
                    placeholder="Search or add custom company tags (e.g. Uber, Stripe)..."
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    className="rounded-xl bg-secondary/20 border-border/40 focus-visible:ring-primary"
                  />

                  {/* Matching Tag List */}
                  <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-2 pb-2 scrollbar-thin">
                    {(companySearchQuery.trim() === ""
                      ? companiesList.slice(0, 15)
                      : companiesList.filter((c) => c.name.toLowerCase().includes(companySearchQuery.toLowerCase()))
                    ).map((company) => {
                      const isSelected = selectedCompanies.includes(company.name);
                      return (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => handleCompanyToggle(company.name)}
                          className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
                            isSelected 
                              ? "bg-primary/20 border-primary text-primary shadow-sm"
                              : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border hover:text-foreground"
                          }`}
                        >
                          {company.name}
                        </button>
                      );
                    })}
                    
                    {/* Add Custom Tag option */}
                    {companySearchQuery.trim() !== "" && 
                     !companiesList.some(c => c.name.toLowerCase() === companySearchQuery.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={() => {
                          handleCompanyToggle(companySearchQuery.trim());
                          setCompanySearchQuery("");
                        }}
                        className="px-3 py-1.5 rounded-xl border border-dashed border-primary/50 bg-primary/5 text-[11px] font-semibold tracking-wide text-primary hover:bg-primary/10 transition-colors"
                      >
                        + Add "{companySearchQuery.trim()}"
                      </button>
                    )}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full py-2.5 rounded-xl font-bold mt-4 shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Initialize Placement Portal <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center p-4 overflow-hidden font-sans">
      {/* Dynamic Backdrops */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 transition-all duration-500 hover:scale-[1.01]">
        <Card className="border-border/60 bg-surface/80 backdrop-blur-xl shadow-2xl rounded-2xl p-6">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs mt-2">
              {isLogin 
                ? "Log in to access your recruitment profile and live company intelligence" 
                : "Create a student account to initiate recruitment onboarding"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </label>
                <Input
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl bg-secondary/20 border-border/40 focus-visible:ring-primary"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl bg-secondary/20 border-border/40 focus-visible:ring-primary"
                />
              </div>

              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Account Role Focus
                  </label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border/40 bg-surface text-muted-foreground text-xs focus:ring-0 focus:outline-none"
                  >
                    <option value="student">Student Profile</option>
                    <option value="admin">Administrator Mode</option>
                  </select>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-primary/10 mt-2 flex items-center justify-center gap-2 cursor-pointer"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLogin ? (
                  <>
                    <LockKeyhole className="w-4 h-4" /> Sign In Securely
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Register Profile
                  </>
                )}
              </Button>
            </form>

            <div className="text-center mt-6 border-t border-border/40 pt-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium flex items-center justify-center gap-1 mx-auto"
              >
                {isLogin ? (
                  <>
                    Don't have an account? <span className="text-primary font-bold">Sign Up</span> <ArrowRight className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    Already have an account? <span className="text-primary font-bold">Sign In</span>
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
