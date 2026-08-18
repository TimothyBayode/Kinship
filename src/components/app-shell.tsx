import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { Avatar, Logo } from "@/components/kinship-ui";
import { authApi, notificationApi, setAccessToken, type ApiNotification, type ApiUser } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const nav = [
  { label: "Activity", icon: LayoutDashboard, href: "/activity" },
  { label: "Family", icon: Users, href: "/family" },
  { label: "Memories", icon: Sparkles, href: "/memories" },
  { label: "Events", icon: CalendarDays, href: "/events" },
  { label: "Files", icon: FileText, href: "/files" },
  { label: "Ask Kinship", icon: MessageCircle, href: "/ask" },
];

export function AppShell() {
  const [mobile, setMobile] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return navigate(`/auth?next=${encodeURIComponent(`${pathname}${window.location.search}`)}`, { replace: true });
      setAccessToken(session.access_token);
      try {
        const synced = (await authApi.sync()).user;
        setUser(synced);
        if (!synced.profileComplete && pathname !== "/onboarding") navigate(`/onboarding?next=${encodeURIComponent(`${pathname}${window.location.search}`)}`, { replace: true });
      } catch {
        navigate("/auth", { replace: true });
      } finally {
        setCheckingSession(false);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setAccessToken(session?.access_token ?? null));
    return () => subscription.unsubscribe();
  }, [navigate, pathname]);

  useEffect(() => {
    if (!user) return;
    const load = () => notificationApi.list().then((result) => { setNotifications(result.notifications); setUnreadCount(result.unreadCount); }).catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  const markAllRead = async () => { await notificationApi.markAllRead(); setNotifications((current) => current.map((item) => ({ ...item, read: true }))); setUnreadCount(0); };

  useEffect(() => {
    if (!accountOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const close = (event: PointerEvent) => { if (!notificationMenuRef.current?.contains(event.target as Node)) setNotificationsOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setNotificationsOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [notificationsOpen]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAccessToken(null);
    } finally {
      navigate("/auth", { replace: true });
    }
  };

  if (checkingSession) return <div className="grid min-h-screen place-items-center bg-[#f5f5f2] text-sm text-muted-foreground">Loading Kinship...</div>;
  if (!user) return null;

  return (
    <div className="dashboard-shell min-h-screen bg-[#f5f5f2]">
      <header className="sticky top-0 z-30 bg-[#f5f5f2] px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <button
            className="rounded-md md:hidden"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <Logo />
          <nav className="surface hidden items-center gap-2 rounded-md p-1 lg:flex">
            {nav.map(({ label, icon: Icon, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={label}
                  to={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:text-foreground ${active ? "bg-primary/10 font-black text-primary hover:text-primary" : ""}`}
                >
                  <Icon
                    className={`size-4 ${active ? "text-primary" : ""}`}
                    strokeWidth={active ? 3.25 : 2}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block" ref={notificationMenuRef}>
              <button
                className="relative rounded-md p-2 text-muted-foreground hover:bg-muted"
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
              </button>
              {notificationsOpen && <NotificationPanel notifications={notifications} unreadCount={unreadCount} onClose={() => setNotificationsOpen(false)} onReadAll={markAllRead} onOpen={(target) => { setNotificationsOpen(false); navigate(target); }} />}
            </div>
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-primary/5"
                onClick={() => setAccountOpen((open) => !open)}
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
              >
                <Avatar src={user.avatarUrl || undefined} name={user.name} />
                <span className="hidden text-sm font-semibold sm:block">
                  {user.name}
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 transition-transform ${accountOpen ? "rotate-180" : ""}`}
                />
              </button>
              {accountOpen && (
                <div
                  className="surface absolute right-0 top-full z-40 mt-2 w-52 rounded-2xl p-2"
                  role="menu"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-primary/5 sm:hidden"
                    onClick={() => { setAccountOpen(false); setNotificationsOpen(true); }}
                    role="menuitem"
                  >
                    <Bell className="size-4" />
                    Notifications
                  </button>
                  <Link
                    to="/account"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-primary/5"
                    onClick={() => setAccountOpen(false)}
                    role="menuitem"
                  >
                    <Settings className="size-4" />
                    Account Settings
                  </Link>
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/5"
                    onClick={logout}
                    role="menuitem"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
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
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground hover:bg-primary/5 hover:text-foreground ${active ? "bg-primary/10 font-black text-primary hover:text-primary" : ""}`}
                  >
                    <Icon
                      className={`size-5 ${active ? "text-primary" : ""}`}
                      strokeWidth={active ? 3.25 : 2}
                    />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <main className={pathname === "/ask" ? "mt-4 bg-[#f5f5f2]" : "mx-auto mt-4 max-w-[1500px] px-4 py-8 md:px-8 lg:px-12"}>
        <Outlet />
      </main>
    </div>
  );
}

function NotificationPanel({ notifications, unreadCount, onClose, onReadAll, onOpen }: { notifications: ApiNotification[]; unreadCount: number; onClose: () => void; onReadAll: () => Promise<void>; onOpen: (target: string) => void }) { return <aside className="absolute right-0 top-full z-50 mt-3 flex max-h-[min(680px,calc(100vh-6rem))] w-[min(92vw,420px)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl" role="dialog" aria-label="Notifications"><div className="flex items-center justify-between border-b border-foreground/5 px-5 py-4"><div><h2 className="text-lg font-semibold">Notifications</h2><p className="text-xs text-muted-foreground">{unreadCount} unread</p></div><div className="flex items-center gap-2">{unreadCount > 0 && <button type="button" onClick={() => void onReadAll()} className="rounded-md px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5">Mark all as read</button>}<button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-[#f5f5f2]"><X className="size-4" /></button></div></div><div className="min-h-0 overflow-y-auto">{notifications.length ? notifications.map((item) => <button type="button" key={item.id} onClick={() => onOpen(item.target)} className={`flex w-full gap-3 border-b border-foreground/5 px-5 py-4 text-left hover:bg-primary/[.03] ${item.read ? "" : "bg-primary/[.05]"}`}><span className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-primary"}`} /><div className="min-w-0"><div className="flex items-start justify-between gap-3"><p className="font-semibold">{item.title}</p><span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(item.createdAt)}</span></div><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.message}</p></div></button>) : <div className="grid min-h-56 place-items-center p-6 text-center"><div><Bell className="mx-auto size-7 text-primary/50" /><p className="mt-3 font-semibold">No notifications yet</p><p className="mt-1 text-sm text-muted-foreground">Family activity will appear here.</p></div></div>}</div></aside>; }

function relativeTime(value: string) { const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "now"; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h`; return `${Math.floor(hours / 24)}d`; }
