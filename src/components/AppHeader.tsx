import { Link } from "@tanstack/react-router";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./layout/AppSidebar";

export function AppHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70 shadow-sm lg:hidden">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 font-display group">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold tracking-tight shadow-lg shadow-primary/20 transition-transform group-hover:scale-105 active:scale-95">
            PES
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-foreground/90">
              Placement Intelligence
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Decision-grade · v1
            </span>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary/30 px-3 py-1 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              Live Intelligence
            </span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-secondary"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-l border-border/60">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>
                  Primary placement intelligence navigation links.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-1.5 overflow-y-auto max-h-[80vh] pb-8">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.exact }}
                    onClick={() => setOpen(false)}
                    activeProps={{
                      className: "bg-primary/10 text-primary border-r-4 border-primary",
                    }}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-muted-foreground transition-all hover:bg-secondary/70 hover:text-foreground"
                  >
                    <item.icon className="h-4.5 w-4.5" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
