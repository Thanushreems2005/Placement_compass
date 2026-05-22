import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCompanyStats, useCompanies } from "@/hooks/use-companies";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { CompanyCard } from "@/components/CompanyCard";
import { Layers, ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories · SRM Placement Intelligence" },
      {
        name: "description",
        content: "Browse hiring companies grouped by category, with live counts from the database.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const stats = useCompanyStats();
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const toggle = (label: string) => setOpenCategory((prev) => (prev === label ? null : label));

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6">
      <span className="label-eyebrow">Categories</span>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Companies by category
      </h1>
      <p className="text-sm text-muted-foreground">
        Click a category to see its companies.{" "}
        <code className="rounded bg-secondary px-1 font-mono">category</code> counts are derived
        live.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {stats.isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (stats.data?.byCategory.length ?? 0) === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Once company records exist, this view will group them automatically."
          />
        ) : (
          <>
            {/* Category tile grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.data!.byCategory.map((c) => {
                const isOpen = openCategory === c.label;
                return (
                  <button
                    key={c.label}
                    onClick={() => toggle(c.label)}
                    className={cn(
                      "group flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200",
                      "hover:-translate-y-0.5 hover:shadow-md",
                      isOpen
                        ? "border-accent/60 bg-accent/5 shadow-md shadow-accent/10"
                        : "border-border bg-surface hover:border-accent/50",
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-lg transition-colors",
                        isOpen ? "bg-accent/20 text-accent" : "bg-secondary text-primary",
                      )}
                    >
                      <Layers className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-display font-semibold">{c.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.count} {c.count === 1 ? "company" : "companies"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-2xl font-semibold tabular-nums transition-colors",
                          isOpen ? "text-accent" : "text-muted-foreground group-hover:text-accent",
                        )}
                      >
                        {c.count}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180 text-accent",
                        )}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Inline expanded company panel */}
            {openCategory && (
              <div
                key={openCategory}
                className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-accent/30 bg-surface p-5 shadow-lg"
              >
                {/* Panel header */}
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{openCategory}</h2>
                    <p className="text-xs text-muted-foreground">Companies in this category</p>
                  </div>
                  <Link
                    to="/explore"
                    search={{ category: openCategory, sort: "name", asc: true }}
                    className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    View all in Explore
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Company grid — lazy loaded for the selected category */}
                <CategoryCompanyGrid category={openCategory} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Lazy-loaded company grid for a specific category */
function CategoryCompanyGrid({ category }: { category: string }) {
  const list = useCompanies({
    q: undefined,
    category,
    focusSector: null,
    profitability: null,
    remotePolicy: null,
    hiringVelocity: null,
    sort: "name",
    ascending: true,
  });

  if (list.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  if (list.error) {
    return (
      <EmptyState title="Couldn't load companies" description={(list.error as Error).message} />
    );
  }

  if ((list.data?.length ?? 0) === 0) {
    return (
      <EmptyState
        title="No companies"
        description="No companies are assigned to this category yet."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.data!.map((c) => (
        <CompanyCard key={c.id} c={c} />
      ))}
    </div>
  );
}
