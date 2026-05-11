import { Link } from "@tanstack/react-router";
import { ArrowUpRight, TrendingUp, Users, MapPin } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Badge } from "@/components/ui/badge";
import { fmtText } from "@/lib/format";
import type { CompanyListItem } from "@/lib/company-types";
import { cn } from "@/lib/utils";

export function CompanyCard({ c }: { c: CompanyListItem }) {
  return (
    <Link
      to="/company/$companyId"
      params={{ companyId: c.id }}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5",
        "active:scale-[0.98]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogo
            name={c.name}
            url={c.logo_url}
            website={c.website_url}
            size={48}
            className="ring-4 ring-secondary/30"
          />
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold tracking-tight text-foreground group-hover:text-accent transition-colors">
              {c.name}
            </h3>
            <p className="truncate text-xs font-medium text-muted-foreground/80">
              {fmtText(c.category)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(c.focus_sectors ?? []).slice(0, 2).map((s) => (
          <Badge
            key={s}
            variant="secondary"
            className="font-medium bg-secondary/40 text-[10px] px-2 py-0"
          >
            {s}
          </Badge>
        ))}
        {(c.focus_sectors?.length ?? 0) > 2 && (
          <Badge variant="outline" className="font-normal text-[10px] px-2 py-0">
            +{(c.focus_sectors?.length ?? 0) - 2}
          </Badge>
        )}
      </div>

      {/* Overview */}
      {c.overview_text && (
        <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/80 italic">
          {c.overview_text}
        </p>
      )}

      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-border/50 pt-4 text-[11px]">
        <div className="flex items-center gap-2 text-muted-foreground/90 font-medium">
          <MapPin className="h-3.5 w-3.5 text-info/70" />
          <span className="truncate">{fmtText(c.location)}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground/90 font-medium">
          <TrendingUp className="h-3.5 w-3.5 text-success/70" />
          <span className="truncate">{fmtText(c.profitability_status)}</span>
        </div>
      </div>
    </Link>
  );
}
