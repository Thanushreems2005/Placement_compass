import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Award, Trophy, History, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dsa-buddy")({
  component: DSABuddyLayout,
});

const SUB_NAV_ITEMS = [
  { to: "/dsa-buddy", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dsa-buddy/assessment", label: "Diagnostics & Assessment", icon: Award },
  { to: "/dsa-buddy/arena", label: "Coding Arena", icon: Trophy },
  { to: "/dsa-buddy/mock-oa", label: "Mock OA Simulator", icon: BrainCircuit },
  { to: "/dsa-buddy/submissions", label: "Submissions Telemetry", icon: History },
];

function DSABuddyLayout() {
  const location = useLocation();

  return (
    <div className="dsa-buddy-light-theme flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden pb-12">
      {/* Premium CSS Overrides for a Stunning Light Theme */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Light theme overrides for DSA Buddy nested route workspace */
        .dsa-buddy-light-theme {
          background-color: #f8fafc !important; /* bg-slate-50 */
          color: #0f172a !important; /* text-slate-900 */
        }
        
        /* Card & general block backgrounds */
        .dsa-buddy-light-theme [class*="bg-slate-900"],
        .dsa-buddy-light-theme [class*="bg-slate-950"],
        .dsa-buddy-light-theme [class*="bg-slate-800/80"] {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        
        .dsa-buddy-light-theme [class*="bg-slate-900/"],
        .dsa-buddy-light-theme [class*="bg-slate-950/"] {
          background-color: rgba(255, 255, 255, 0.75) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03), inset 0 1px 0 0 rgba(255, 255, 255, 0.8) !important;
        }

        /* Card and item borders */
        .dsa-buddy-light-theme [class*="border-white/"],
        .dsa-buddy-light-theme [class*="border-primary/20"],
        .dsa-buddy-light-theme [class*="border-indigo-500/20"] {
          border-color: rgba(226, 232, 240, 0.85) !important; /* border-slate-200 */
        }

        /* Text colors */
        .dsa-buddy-light-theme [class*="text-slate-100"],
        .dsa-buddy-light-theme [class*="text-slate-200"],
        .dsa-buddy-light-theme [class*="text-slate-300"],
        .dsa-buddy-light-theme [class*="text-slate-50"] {
          color: #1e293b !important; /* text-slate-800 */
        }

        .dsa-buddy-light-theme [class*="text-slate-400"] {
          color: #64748b !important; /* text-slate-500 */
        }

        .dsa-buddy-light-theme [class*="text-muted-foreground"] {
          color: #475569 !important; /* text-slate-600 */
        }

        /* Gradients overrides */
        .dsa-buddy-light-theme h1[class*="bg-gradient-to-r"] {
          background-image: linear-gradient(to right, #0f172a, #312e81, #4f46e5) !important;
          background-clip: text !important;
          -webkit-background-clip: text !important;
          color: transparent !important;
        }

        /* Dynamic telemetry tag / badges */
        .dsa-buddy-light-theme [class*="bg-white/[0.02]"],
        .dsa-buddy-light-theme [class*="bg-white/\[0\.02\]"] {
          background-color: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
          color: #475569 !important;
        }

        /* Form Controls */
        .dsa-buddy-light-theme select,
        .dsa-buddy-light-theme input,
        .dsa-buddy-light-theme textarea {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important; /* border-slate-300 */
          color: #0f172a !important;
        }

        .dsa-buddy-light-theme select::placeholder,
        .dsa-buddy-light-theme input::placeholder,
        .dsa-buddy-light-theme textarea::placeholder {
          color: #94a3b8 !important; /* placeholder-slate-400 */
        }

        .dsa-buddy-light-theme select:focus,
        .dsa-buddy-light-theme input:focus,
        .dsa-buddy-light-theme textarea:focus {
          border-color: #6366f1 !important; /* primary indigo-500 */
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15) !important;
        }

        /* Sticky down navigation bar */
        .dsa-buddy-light-theme .fixed.bottom-6 > div {
          background-color: rgba(255, 255, 255, 0.85) !important;
          border-color: rgba(226, 232, 240, 0.95) !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04) !important;
        }

        .dsa-buddy-light-theme .fixed.bottom-6 [class*="text-slate-400"] {
          color: #64748b !important;
        }

        .dsa-buddy-light-theme .fixed.bottom-6 [class*="text-slate-400"]:hover {
          color: #0f172a !important;
          background-color: rgba(241, 245, 249, 0.8) !important;
        }

        /* Active navigation links state */
        .dsa-buddy-light-theme .fixed.bottom-6 [class*="bg-primary"] {
          background-color: #4f46e5 !important; /* primary indigo-600 */
          color: #ffffff !important;
        }

        .dsa-buddy-light-theme .fixed.bottom-6 [class*="bg-primary"] [class*="text-slate-400"] {
          color: #ffffff !important;
        }

        /* Progress circular track */
        .dsa-buddy-light-theme circle[class*="text-white/[0.04]"] {
          color: rgba(0, 0, 0, 0.05) !important;
        }

        /* Code compiler console block remains optimized and dark for structural syntax contrast */
        .dsa-buddy-light-theme .font-mono {
          background-color: #0f172a !important; 
          color: #f8fafc !important;
          border-color: #1e293b !important;
        }
        .dsa-buddy-light-theme .font-mono * {
          color: inherit !important;
        }

        /* Dialog modals and backdrop popups */
        .dsa-buddy-light-theme [class*="bg-slate-950/80"] {
          background-color: rgba(15, 23, 42, 0.5) !important;
        }

        /* Toast popups styling */
        .dsa-buddy-light-theme [class*="bg-slate-900/95"] {
          background-color: rgba(255, 255, 255, 0.95) !important;
          color: #0f172a !important;
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05) !important;
        }
      `}} />

      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-500/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Banner */}
      <div className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 bg-clip-text text-transparent">
              DSA Buddy Workspace
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Placement Decision-grade Calibration
            </p>
          </div>
        </div>

        {/* Dynamic Telemetry Status Tag */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-[9px] font-bold text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time Telemetry Pipeline Active</span>
        </div>
      </div>

      {/* Nested Route Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6">
        <Outlet />
      </div>

      {/* Gorgeous Sticky Glassmorphic Down Navigation Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl">
        <div className="bg-slate-900/70 border border-white/10 backdrop-blur-xl rounded-2xl px-3 py-2 flex justify-between items-center gap-1 shadow-2xl shadow-slate-950/50">
          {SUB_NAV_ITEMS.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.to 
              : location.pathname.startsWith(item.to);
            
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className={cn(
                  "flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2 px-2.5 py-2 md:py-2.5 rounded-xl text-center text-xs font-semibold transition-all duration-300 relative group",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                )}
              >
                <item.icon className={cn(
                  "w-4 h-4 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-300"
                )} />
                <span className="text-[10px] md:text-xs truncate tracking-wide">{item.label.split(" ")[0]}</span>

                {/* Subtle active glow dot */}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
