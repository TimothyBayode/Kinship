import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, ChevronDown, Plus } from "lucide-react";

import { Avatar, Button, SectionTitle } from "@/components/kinship-ui";
import { activities, events, family, imageRefs, members } from "@/lib/types";

const activityFilters = ["Recent", "Most Relevant", "All"] as const;
type ActivityFilter = (typeof activityFilters)[number];

export function ActivityView() {
  const [filter, setFilter] = useState<ActivityFilter>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const visibleActivities =
    filter === "Recent"
      ? activities.slice(0, 1)
      : filter === "Most Relevant"
        ? [...activities].sort((a, b) => b.images.length - a.images.length)
        : activities;

  useEffect(() => {
    if (!filterOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterOpen]);

  return (
    <section>
      <SectionTitle title="Latest activities">
        <div className="flex flex-wrap gap-3">
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              className="surface inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold text-foreground"
              onClick={() => setFilterOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={filterOpen}
            >
              {filter === "All" ? "All Activities" : filter}
              <ChevronDown
                className={`size-4 transition-transform ${filterOpen ? "rotate-180" : ""}`}
              />
            </button>
            {filterOpen && (
              <div
                className="surface absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl p-2"
                role="menu"
              >
                {activityFilters.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm hover:bg-primary/5 ${filter === option ? "font-bold text-primary" : "font-medium"}`}
                    onClick={() => {
                      setFilter(option);
                      setFilterOpen(false);
                    }}
                    role="menuitemradio"
                    aria-checked={filter === option}
                  >
                    {option}
                    {filter === option && <Check className="size-4" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button primary>
            <Plus className="size-4" />
            Add Relative
          </Button>
        </div>
      </SectionTitle>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {visibleActivities.map((activity) => (
            <article
              key={activity.id}
              className="surface rounded-3xl p-5 sm:p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={activity.author}
                    src={
                      activity.id === "a1"
                        ? "https://i.pravatar.cc/100?img=45"
                        : undefined
                    }
                  />
                  <div>
                    <p className="font-semibold">{activity.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.title}
                    </p>
                  </div>
                </div>
                <button className="hidden rounded-md text-sm font-semibold text-primary sm:block">
                  View details <ArrowRight className="ml-1 inline size-4" />
                </button>
              </div>
              <div
                className={`mt-5 grid gap-3 ${activity.images.length > 1 ? "sm:grid-cols-2" : ""}`}
              >
                {activity.images.map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    alt="Family memory"
                    className={`${index === 0 && activity.images.length > 1 ? "sm:row-span-2 sm:h-full" : ""} h-52 w-full rounded-2xl object-cover`}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
        <aside className="flex flex-col gap-6">
          <div className="surface mb-2 overflow-hidden rounded-3xl">
            <img
              src={imageRefs.family}
              alt="Family tree preview"
              className="h-44 w-full object-cover object-top"
            />
            <div className="bg-[linear-gradient(to_top,var(--primary)_0%,#8d9784_30%,#bcc3b6_58%,#e6e9e3_82%,white_100%)] p-5">
              <h2 className="text-xl font-semibold">{family.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {members.length} members connected
              </p>
              <Link to="/family" className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-card px-5 py-3 text-sm font-semibold hover:bg-muted">Explore Family</Link>
            </div>
          </div>
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="size-5" />
              <h2 className="text-xl font-semibold">Upcoming Events</h2>
            </div>
            <div className="surface rounded-3xl p-5">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className={`flex items-center justify-between ${index > 0 ? "mt-4 border-t-[0.5px] border-foreground/10 pt-4" : ""}`}
                >
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.date}</p>
                  </div>
                  <span className="text-xs text-primary">{event.meta}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
