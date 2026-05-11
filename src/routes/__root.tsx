import {
  Outlet,
  HeadContent,
  Scripts,
  Link,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";

import appCss from "../styles.css?url";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Toaster } from "@/components/ui/sonner";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Error 404
        </span>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Route not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This URL does not map to any view in the placement intelligence platform.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1b2a4e" },
      { title: "SRM Placement Intelligence" },
      {
        name: "description",
        content:
          "Decision-grade placement intelligence for SRM University — deeply structured intelligence across hiring, culture, financials and technology.",
      },
      { name: "author", content: "SRM Placement Cell" },
      { property: "og:title", content: "SRM Placement Intelligence" },
      {
        property: "og:description",
        content: "Analyze placement-bound companies across deeply structured intelligence signals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      {
        rel: "preconnect",
        href: "https://rsms.me",
      },
      {
        rel: "stylesheet",
        href: "https://rsms.me/inter/inter.css",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <AppFooter />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
