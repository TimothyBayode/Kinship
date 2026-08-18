import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, Sparkles, Users } from "lucide-react";

import { Logo } from "@/components/kinship-ui";

const linkButton =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold";

export default function HomePage() {
  return (
    <main id="top" className="min-h-screen bg-white">
      <section className="mx-auto max-w-[1500px] px-5 py-5 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a
              href="#about"
              className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 hover:after:scale-x-100"
            >
              About
            </a>
            <a
              href="#product"
              className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 hover:after:scale-x-100"
            >
              How It Works
            </a>
            <a
              href="#stories"
              className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 hover:after:scale-x-100"
            >
              Stories
            </a>
            <a
              href="#documentation"
              className="relative py-1 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 hover:after:scale-x-100"
            >
              Documentation
            </a>
          </nav>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-105"
          >
            Get Started <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-10 pb-16 pt-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20 lg:py-28">
          <div>
            <h1 className="max-w-xl text-balance text-5xl font-semibold tracking-[-.06em] sm:text-7xl">
              The people and moments that make you, you.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">
              Kinship brings your family memories, stories, and relationships
              into one private place, so the important things stay close.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className={`${linkButton} bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(23,21,29,0.08)] hover:brightness-105`}
              >
                Preserve Your Family&apos;s Story <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border bg-secondary shadow-2xl shadow-primary/10">
            <img
               src="/dash.png"
               alt="Kinship dashboard"
              className="h-[420px] w-full object-cover object-top sm:h-[560px]"
            />
          </div>
        </div>
      </section>

      <section
        id="product"
        className="border-y bg-card px-5 py-20 sm:px-10 lg:px-16"
      >
        <div className="mx-auto max-w-[1100px] text-center">
          <p className="font-mono text-xs uppercase tracking-[.22em] text-primary">
            A shared archive
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.04em] sm:text-6xl">
            Remember more together.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            From the everyday updates to the stories that get passed down,
            Kinship gives your family a thoughtful space to keep it all.
          </p>
          <div className="mt-12 grid gap-4 text-left md:grid-cols-3">
            <Feature
              icon={<Users className="size-6 text-primary" />}
              title="Know where you come from"
              copy="Build a living family tree that grows with every generation."
              color="bg-[#f8efe9]"
            />
            <Feature
              icon={<Sparkles className="size-6 text-[#53704e]" />}
              title="Keep the little things"
              copy="Save photos, recipes, voices, and the details you never want to lose."
              color="bg-[#f2f5ed]"
            />
            <Feature
              icon={<MessageCircle className="size-6 text-[#a06b4d]" />}
              title="Ask your archive"
              copy="Find the thread in your family history with a private, helpful guide."
              color="bg-[#f8efe9]"
            />
          </div>
        </div>
      </section>

      <section
        id="stories"
        className="mx-auto max-w-[1100px] px-5 py-20 sm:px-10"
      >
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-4xl font-semibold tracking-[-.04em]">
              A quieter kind of social.
            </h2>
            <p className="mt-5 leading-8 text-muted-foreground">
              No feeds to keep up with. No pressure to perform. Just a private,
              beautiful place for the people you love.
            </p>
            <Link
              to="/auth"
              className={`${linkButton} mt-7 bg-primary text-primary-foreground`}
            >
              Create your account <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-3xl">
            <img
               src="/dashn.png"
               alt="Kinship family archive dashboard"
              className="w-full"
            />
          </div>
        </div>
      </section>

      <footer id="about" className="bg-[#17151d] px-5 py-12 text-white sm:px-10">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-10 border-b border-white/20 pb-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Link to="/" aria-label="Kinship home">
                <img
                  src="/logo-dark.svg"
                  alt="Kinship"
                  className="h-10 w-auto max-w-[9rem] object-contain"
                />
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/70">
                A private place to preserve the memories, stories, and
                relationships that make your family unique.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Shortcuts</h2>
              <nav className="mt-4 flex flex-col items-start gap-3 text-sm text-white/70">
                <a href="#about" className="hover:text-white">About</a>
                <a href="#product" className="hover:text-white">How It Works</a>
                <a href="#stories" className="hover:text-white">Stories</a>
                <a href="#documentation" className="hover:text-white">Documentation</a>
              </nav>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Kinship</h2>
              <nav className="mt-4 flex flex-col items-start gap-3 text-sm text-white/70">
                <Link to="/auth" className="hover:text-white">Get Started</Link>
                <a href="mailto:hello@kinship.com" className="hover:text-white">Contact</a>
                <a href="#privacy" className="hover:text-white">Privacy</a>
                <a href="#terms" className="hover:text-white">Terms</a>
              </nav>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Kinship. All rights reserved.</span>
            <span>Your family, remembered.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  copy,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  color: string;
}) {
  return (
    <div className={`rounded-3xl p-7 ${color}`}>
      {icon}
      <h3 className="mt-16 text-2xl font-semibold">{title}</h3>
      <p className="mt-3 leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}
