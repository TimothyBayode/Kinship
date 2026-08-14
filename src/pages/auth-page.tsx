import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { Button, Logo } from "@/components/kinship-ui";
import { authService, imageRefs } from "@/lib/types";

const inputClass =
  "mt-1.5 w-full rounded-md border border-foreground/15 bg-card px-4 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

function GoogleButton() {
  return (
    <Button className="w-full !py-3">
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z" />
        <path fill="#EA4335" d="M12 6c1.47 0 2.79.51 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z" />
      </svg>
      Continue with Google
    </Button>
  );
}

function AuthImage() {
  return (
    <img
      src={imageRefs.auth}
      alt="Family spending time together"
      className="h-full w-full object-cover"
    />
  );
}

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const signup = activeMode === "signup";

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  function switchMode(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const nextMode = signup ? "login" : "signup";
    setError("");
    setActiveMode(nextMode);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setError("");
      if (signup) await authService.signUp(name, email, password);
      else await authService.signIn(email, password);
      navigate("/activity");
    } catch (exception) {
      setError((exception as Error).message);
    }
  }

  const form = (
    <div className="flex h-full min-h-0 flex-col rounded-[2rem] bg-card px-6 py-6 sm:px-12 sm:py-8 lg:px-16">
      <Logo />
      <div className="m-auto w-full max-w-sm">
        <p className="text-xs text-muted-foreground">
          {signup ? "Create your account" : "Welcome back"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {signup
            ? "Start preserving your family's stories and memories."
            : "Sign in and get started on your family story."}
        </p>
        <form onSubmit={submit} className={`${signup ? "mt-5 gap-3" : "mt-6 gap-3.5"} flex flex-col`}>
          {signup && (
            <label className="text-sm font-medium">
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                placeholder="Your full name"
                autoComplete="name"
              />
            </label>
          )}
          <label className="text-sm font-medium">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="Example@email.com"
              type="email"
              autoComplete="email"
            />
          </label>
          <label className="text-sm font-medium">
            Password
            <span className="relative block">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} pr-11`}
                placeholder="At least 8 characters"
                type={showPassword ? "text" : "password"}
                autoComplete={signup ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button primary type="submit" className="w-full !py-3">
            {signup ? "Create account" : "Sign in"}
          </Button>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-px flex-1 bg-border" />Or<span className="h-px flex-1 bg-border" />
          </div>
          <GoogleButton />
          <p className="text-center text-xs text-muted-foreground">
            {signup ? "Already have an account? " : "Don't have an account? "}
            <Link
              to="/auth"
              onClick={switchMode}
              className="font-semibold text-primary"
            >
              {signup ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-primary p-4 sm:p-8">
      <div className="grid h-full max-h-[680px] w-full max-w-[1100px] gap-4 lg:grid-cols-2">
        <div className="min-h-0 lg:hidden">{form}</div>
        <div className="auth-perspective hidden min-h-0 lg:block">
          <div className={`auth-flip ${signup ? "auth-flip-active" : ""}`}>
            <div className="auth-face">{form}</div>
            <div className="auth-face auth-face-back overflow-hidden rounded-[2rem]"><AuthImage /></div>
          </div>
        </div>
        <div className="auth-perspective hidden min-h-0 lg:block">
          <div className={`auth-flip ${signup ? "auth-flip-active" : ""}`}>
            <div className="auth-face overflow-hidden rounded-[2rem]"><AuthImage /></div>
            <div className="auth-face auth-face-back">{form}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
