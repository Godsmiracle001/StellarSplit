import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import HomePage from "./pages/Home";
import RootLayout from "./layouts/RootLayout";
import { WalletProvider } from "./hooks/use-wallet";
import { ThemeProvider } from "./components/ThemeContext";
import { CollaborationProvider } from "./components/Collaboration";
import RouteErrorBoundary from "./components/routing/RouteErrorBoundary";
import RoutePending from "./components/routing/RoutePending";
import { bootstrapTheme } from "./utils/themeBootstrap";
import "./i18n/config";

// Apply theme before hydration to prevent flash
bootstrapTheme();

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RoutePending />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "/dashboard",
        lazy: async () => {
          const { default: Dashboard } = await import("./pages/Dashboard");
          return { Component: Dashboard };
        },
      },
      {
        path: "/split/:id",
        lazy: async () => {
          const { SplitDetailPage } = await import("./pages/SplitView/SplitDetailPage");
          return { Component: SplitDetailPage };
        },
      },
      {
        path: "/analytics",
        lazy: async () => {
          const { default: AnalyticsDashboard } = await import("./pages/AnalyticsDashboard");
          return { Component: AnalyticsDashboard };
        },
      },
      {
        path: "/split-groups",
        lazy: async () => {
          const { default: SplitGroup } = await import("./pages/SplitGroup");
          return { Component: SplitGroup };
        },
      },
      {
        path: "/history",
        lazy: async () => {
          const { default: SplitHistoryPage } = await import("./pages/SplitHistoryPage");
          return { Component: SplitHistoryPage };
        },
      },

      {
        path: "/pay",
        lazy: async () => {
          const { default: PaymentURIPage } = await import("./pages/PaymentURIPage");
          return { Component: PaymentURIPage };
        },
      },
      {
        path: "/create-split",
        lazy: async () => {
          const { SplitCreationWizard } = await import("./components/SplitWizard");
          return { Component: SplitCreationWizard };
        },
      },
      {
        path: "/notifications",
        lazy: async () => {
          const { default: NotificationCenterPage } = await import("./pages/NotificationCenterPage");
          return { Component: NotificationCenterPage };
        },
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <WalletProvider>
        <CollaborationProvider>
          <RouterProvider router={router} />
        </CollaborationProvider>
      </WalletProvider>
    </ThemeProvider>
  </StrictMode>,
);
