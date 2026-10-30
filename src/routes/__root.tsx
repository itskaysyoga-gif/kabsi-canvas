import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
// Self hosted fonts (Web 2): the two latin files are preloaded, the rest load only when a page needs them.
import bricolage from "@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url";
import manrope from "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url";
import { ErrorPage, NotFoundPage } from "@/components/kabsi/status-pages";
import {
  startAnalytics,
  syncReplayWithPath,
  telemetryHeadScripts,
  trackLanding,
} from "@/lib/telemetry";
import { captureTouch } from "@/lib/attribution";
import { pixelPageView } from "@/lib/meta-pixel";
import { AuthProvider } from "@/components/auth/auth-provider";
import { GlobalErrorBoundary } from "@/components/shared/error-boundary";
import { DeferredPrivacyBanner } from "@/components/shared/deferred-privacy-banner";
import { initConsent } from "@/lib/consent";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Kabsi" },
      // The light-led site (Design 6, Web 3): the browser bar takes the ivory ground (kb-sand in src/styles.css).
      { name: "theme-color", content: "#f6f4ef" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Marketing photos are served from Supabase Storage (D256).
      { rel: "preconnect", href: "https://ynjdqjlmdwjgbfezevxy.supabase.co" },
      { rel: "preload", href: manrope, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "preload", href: bricolage, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      // Favicon, home screen icon and manifest (Design 2, made by scripts/og.mjs)
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: telemetryHeadScripts,
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
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
    // The country rule and the stored choice are read as the page hydrates, before analytics start and whether or not
    // the banner has loaded yet (it loads after first paint).
    void initConsent();
    startAnalytics();
    syncReplayWithPath(pathname);
    captureTouch();
    trackLanding(pathname, window.location.search);
    pixelPageView(pathname);
  }, [pathname]);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalErrorBoundary>
          <Outlet />
          <DeferredPrivacyBanner />
        </GlobalErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}
