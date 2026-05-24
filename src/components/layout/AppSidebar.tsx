import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Brain,
  Building2,
  GitCompareArrows,
  GraduationCap,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  Sparkles,
  Zap,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Activity, exact: true },
  { to: "/explore", label: "Explore", icon: Building2 },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/compare", label: "Compare", icon: GitCompareArrows },
  { to: "/hiring-process", label: "Hiring Process", icon: ListChecks },
  { to: "/skill-mapping", label: "Skill Mapping", icon: Sparkles },
  { to: "/career-intelligence", label: "Career Intelligence", icon: GraduationCap },
  { to: "/innovx", label: "InnovX", icon: Lightbulb },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/intelligence", label: "Intelligence", icon: Zap },
  { to: "/aptitude", label: "Aptitude", icon: Brain },
  { to: "/missionx", label: "MissionX Labs", icon: FlaskConical },
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMounted) return null;

  return (
    <aside
      className={cn(
        "sticky top-0 z-40 hidden h-screen flex-col border-r border-border/60 bg-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70 shadow-sm transition-all duration-300 ease-in-out lg:flex",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header / Logo */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 font-display group transition-opacity duration-200",
            isCollapsed && "justify-center w-full"
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold tracking-tight shadow-lg shadow-primary/20 transition-transform group-hover:scale-105 active:scale-95">
            PES
          </span>
          {!isCollapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="truncate text-sm font-bold tracking-tight text-foreground/90">
                Placement Intel
              </span>
              <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Decision-grade
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <TooltipProvider delayDuration={100}>
          {NAV_ITEMS.map((item) => {
            const linkContent = (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                activeProps={{
                  className: "bg-primary/10 text-primary font-bold dark:bg-primary/20 dark:text-primary-foreground shadow-sm ring-1 ring-primary/20",
                }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 outline-none",
                  "text-muted-foreground hover:bg-secondary/80 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary",
                  isCollapsed ? "justify-center px-2" : "justify-start"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    "group-active:scale-95"
                  )}
                />
                {!isCollapsed && (
                  <span className="truncate transition-opacity duration-200">
                    {item.label}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    <div className="w-full">{linkContent}</div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={16} className="font-semibold">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </TooltipProvider>
      </nav>

      {/* Footer / Toggle */}
      <div className="border-t border-border/40 p-3 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 rounded-full hover:bg-secondary/80 text-muted-foreground"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
