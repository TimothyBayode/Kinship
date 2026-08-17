import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import AuthPage from "@/pages/auth-page";
import ActivityPage from "@/pages/activity-page";
import AskPage from "@/pages/ask-page";
import EventsPage from "@/pages/events-page";
import FamilyPage from "@/pages/family-page";
import FilesPage from "@/pages/files-page";
import HomePage from "@/pages/home-page";
import MemoriesPage from "@/pages/memories-page";
import InvitePage from "@/pages/invite-page";
import OnboardingPage from "@/pages/onboarding-page";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/auth", element: <AuthPage mode="login" /> },
  {
    element: <AppShell />,
    children: [
      { path: "/activity", element: <ActivityPage /> },
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/invite", element: <InvitePage /> },
      { path: "/family", element: <FamilyPage /> },
      { path: "/memories", element: <MemoriesPage /> },
      { path: "/events", element: <EventsPage /> },
      { path: "/files", element: <FilesPage /> },
      { path: "/ask", element: <AskPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
