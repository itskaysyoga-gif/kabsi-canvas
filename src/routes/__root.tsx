import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import {
  reportError,
  startAnalytics,
  syncReplayWithPath,
  telemetryHeadScripts,
} from "@/lib/telemetry";
import { AuthProvider } from "@/components/auth/auth-provider";
import { GlobalErrorBoundary } from "@/components/shared/error-boundary";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <main className="grid min-h-screen place-items-center bg-kb-sand px-5">
      <title>Page not found | Kabsi</title>
      <meta name="robots" content="noindex" />
      <div className="text-center">
        <p className="font-display text-8xl leading-none">404</p>
        <h1 className="mt-3 font-display text-4xl">Page not found</h1>
        <p className="mt-3 text-kb-stone">The page you requested is not here.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/guides">Read the guides</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <main className="grid min-h-screen place-items-center bg-kb-sand px-5">
      <div className="w-full max-w-md rounded-large bg-kb-white p-8 text-center shadow-kb">
        <h1 className="font-display text-4xl">Something went wrong.</h1>
        <p className="mt-3 text-kb-stone">Reload the page.</p>
        <Button
          className="mt-7 w-full"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Reload
        </Button>
      </div>
    </main>
  );
}
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Kabsi" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Marketing photos are served from Supabase Storage (D256).
      { rel: "preconnect", href: "https://ynjdqjlmdwjgbfezevxy.supabase.co" },
      {
        rel: "preload",
        href: "/fonts/lalezar-latin-400.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/readex-pro-latin-400.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/kabsi-mark.svg", type: "image/svg+xml" },
      { rel: "alternate icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: telemetryHeadScripts,
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});
function RootShell({ children }: { children: ReactNode }) {
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
  const pathname = useLocation({ select: (location) => location.pathname });
  useEffect(() => {
    startAnalytics();
    syncReplayWithPath(pathname);
  }, [pathname]);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalErrorBoundary>
          <Outlet />
        </GlobalErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
