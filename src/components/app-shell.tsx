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

import { Avatar, Button, Logo } from "@/components/kinship-ui";
import { authApi, profileApi, setAccessToken, uploadApi, type ApiUser } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { user as demoUser } from "@/lib/types";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
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
            <button
              className="hidden rounded-md p-2 text-muted-foreground hover:bg-muted sm:block"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
            </button>
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl p-1 hover:bg-primary/5"
                onClick={() => setAccountOpen((open) => !open)}
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
              >
                <Avatar src={user.avatarUrl || demoUser.avatar} name={user.name} />
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
                    onClick={() => { setAccountOpen(false); setSettingsOpen(true); }}
                    role="menuitem"
                  >
                    <Bell className="size-4" />
                    Notifications
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-primary/5"
                    onClick={() => setAccountOpen(false)}
                    role="menuitem"
                  >
                    <Settings className="size-4" />
                    Account Settings
                  </button>
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

      {settingsOpen && <AccountSettings user={user} onClose={() => setSettingsOpen(false)} onSaved={setUser} />}

      <main className={pathname === "/ask" ? "mt-4 bg-[#f5f5f2]" : "mx-auto mt-4 max-w-[1500px] px-4 py-8 md:px-8 lg:px-12"}>
        <Outlet />
      </main>
    </div>
  );
}

function AccountSettings({ user, onClose, onSaved }: { user: ApiUser; onClose: () => void; onSaved: (user: ApiUser) => void }) {
  const [name, setName] = useState(user.name); const [phone, setPhone] = useState(user.phone); const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState(""); const input = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => { try { setUploading(true); setError(""); setAvatarUrl(await uploadApi.upload(file)); } catch (exception) { setError((exception as Error).message); } finally { setUploading(false); } };
  const save = async () => { try { setSaving(true); setError(""); onSaved(await profileApi.update({ name, phone, avatarUrl })); onClose(); } catch (exception) { setError((exception as Error).message); } finally { setSaving(false); } };
  const field = "mt-2 h-14 w-full rounded-md border-0 bg-[#f5f5f2] px-4 outline-none focus:border-0 focus:outline-none focus:ring-0";
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/25 p-4 backdrop-blur-sm" onClick={onClose}><div className="my-6 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h2 className="text-2xl font-semibold">Account settings</h2><p className="mt-1 text-sm text-muted-foreground">Update how your profile appears to your family.</p></div><button onClick={onClose}><X /></button></div><div className="mt-7 flex items-center gap-4"><Avatar src={avatarUrl || demoUser.avatar} name={name} size="size-20" /><div><input ref={input} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} /><Button disabled={uploading} onClick={() => input.current?.click()}>{uploading ? "Uploading..." : "Change picture"}</Button></div></div><div className="mt-7 grid gap-5"><label className="text-sm font-medium">Full name<input value={name} onChange={(event) => setName(event.target.value)} className={field} /></label><label className="text-sm font-medium">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} className={field} /></label><label className="text-sm font-medium text-muted-foreground">Email<input value={user.email} disabled className={`${field} cursor-not-allowed opacity-70`} /></label><label className="text-sm font-medium text-muted-foreground">Gender<input value={formatGender(user.gender)} disabled className={`${field} cursor-not-allowed opacity-70`} /></label></div>{error && <p className="mt-4 text-sm text-destructive">{error}</p>}<Button primary disabled={saving || uploading || name.trim().length < 2 || phone.trim().length < 7} onClick={save} className="mt-7 min-h-14 w-full">{saving ? "Saving..." : "Save changes"}</Button></div></div>;
}

function formatGender(value: string) { return value ? value.split("-").map((item) => item[0].toUpperCase() + item.slice(1)).join(" ") : "Not specified"; }
