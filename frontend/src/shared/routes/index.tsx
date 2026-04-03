import App from "@/app/App";
import { AtlasesPanel } from "@/features/admin/components/atlases/AtlasesPanel";
import { DataPanel } from "@/features/admin/components/data-panel/DataPanel";
import { TeamsPanel } from "@/features/admin/components/teams/TeamsPanel";
import { TileFluxPanel } from "@/features/admin/components/tile-flux/TileFluxPanel";
import { UsersPanel } from "@/features/admin/components/users/UsersPanel";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { adminLoader } from "@/features/admin/services/routes/adminLoader";
import {
    atlasesLoader,
    teamsLoader,
    usersLoader,
} from "@/features/admin/services/routes/adminPanelLoaders";
import { EmailVerificationPage } from "@/features/auth/pages/EmailVerificationPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { authLoader } from "@/features/auth/services/routes/authLoader";
import { resetPasswordLoader } from "@/features/auth/services/routes/resetPasswordLoader";
import { verifyLoader } from "@/features/auth/services/routes/verifyLoader";
import { DataHomePage } from "@/features/data/pages/DataHomePage";
import { DataLoadPage } from "@/features/data/pages/DataLoadPage";
import { ProfilePage } from "@/features/userProfile/pages/ProfilePage";
import { profileLoader } from "@/features/userProfile/services/routes/profileLoader";
import { ErrorView } from "@/shared/components/layout/ErrorView";
import { Wip } from "@/shared/components/ui/Wip";
import { navRoutes } from "@/shared/routes/RoutesDefinition";
import { createBrowserRouter, redirect } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    loader: authLoader,
    errorElement: <ErrorView />,
    children: [
      ...navRoutes
        .filter((route) => !route.requiresAdmin && route.url !== "/data")
        .map((route) => ({
          path: route.url.replace(/^\//, ""),
          element: <Wip />,
        })),
      { path: "data", element: <DataHomePage /> },
      { path: "data/load", element: <DataLoadPage /> },
      {
        path: "admin",
        loader: adminLoader,
        element: <AdminPage />,
        children: [
          {
            index: true,
            loader: () => redirect("/admin/users"),
          },
          {
            path: "users",
            loader: usersLoader,
            element: <UsersPanel />,
          },
          {
            path: "teams",
            loader: teamsLoader,
            element: <TeamsPanel />,
          },
          {
            path: "atlases",
            loader: atlasesLoader,
            element: <AtlasesPanel />,
          },
          {
            path: "tile-flux",
            element: <TileFluxPanel />,
          },
          {
            path: "data",
            element: <DataPanel />,
          },
        ],
      },
      {
        path: "profile",
        loader: profileLoader,
        element: <ProfilePage />,
      },
      {
        path: "verify",
        loader: verifyLoader,
        element: <EmailVerificationPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        loader: resetPasswordLoader,
        element: <ResetPasswordPage />,
      },
    ],
  },
]);
