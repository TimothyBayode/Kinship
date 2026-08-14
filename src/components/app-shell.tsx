import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { Avatar, Logo } from "@/components/kinship-ui";
import { user } from "@/lib/types";

const nav = [
  { label: "Activity", icon: LayoutDashboard, href: "/activity" },
  { label: "Family", icon: Users, href: "/family" },
  { label: "Memories", icon: Sparkles, href: "/memories" },
  { label: "Events", icon: CalendarDays, href: "/events" },
  { label: "Files", icon: FileText, href: "/files" },
  { label: "Ask", icon: MessageCircle, href: "/ask" },
];

export function AppShell() {
  const [mobile, setMobile] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/90 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <button
            className="rounded-md md:hidden"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <Logo />
          <nav className="hidden items-center gap-1 rounded-full border bg-card p-1 shadow-sm lg:flex">
            {nav.map(({ label, icon: Icon, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={label}
                  to={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground ${active ? "bg-secondary font-semibold text-foreground" : ""}`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <button
              className="hidden rounded-md p-2 text-muted-foreground hover:bg-muted sm:block"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
            </button>
            <Avatar src={user.avatar} name={user.name} />
            <span className="hidden text-sm font-semibold sm:block">
              {user.name}
            </span>
            <ChevronDown className="hidden size-4 sm:block" />
          </div>
        </div>
      </header>

      {mobile && (
        <div
          className="fixed inset-0 z-50 bg-foreground/20 md:hidden"
          onClick={() => setMobile(false)}
        >
          <aside
            className="h-full w-72 bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-10 flex items-center justify-between">
              <Logo />
              <button
                className="rounded-md"
                onClick={() => setMobile(false)}
                aria-label="Close navigation"
              >
                <X />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              {nav.map(({ label, icon: Icon, href }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={label}
                    to={href}
                    onClick={() => setMobile(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground hover:bg-secondary hover:text-foreground ${active ? "bg-secondary font-semibold text-foreground" : ""}`}
                  >
                    <Icon className="size-5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-[1500px] px-4 py-8 md:px-8 lg:px-12">
        <Outlet />
      </main>
    </div>
  );
}
