import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, Filter, Plus } from "lucide-react";

import { Button, SectionTitle } from "@/components/kinship-ui";
import { events } from "@/lib/types";

const filters = ["All Events", "Birthdays", "Gatherings", "Anniversaries"] as const;
type EventFilter = (typeof filters)[number];

export default function EventsPage() {
  const [filter, setFilter] = useState<EventFilter>("All Events");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const visibleEvents = events.filter((event) => {
    if (filter === "Birthdays") return event.category === "Birthday";
    if (filter === "Gatherings") return event.category === "Gathering";
    if (filter === "Anniversaries") return event.category === "Anniversary";
    return true;
  });

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
      <div className="mb-12">
        <SectionTitle title="Events">
          <div className="flex flex-wrap gap-2">
            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                className="surface inline-flex min-w-48 items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 py-3 text-sm font-semibold text-foreground"
                onClick={() => setFilterOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={filterOpen}
              >
                <Filter className="size-4" />
                {filter}
                <ChevronDown className={`size-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
              {filterOpen && (
                <div className="surface absolute right-0 top-full z-20 mt-2 w-56 rounded-xl p-2" role="menu">
                  {filters.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`block w-full rounded-lg px-4 py-3 text-left text-sm hover:bg-primary/5 ${filter === option ? "font-bold text-primary" : "font-medium"}`}
                      onClick={() => {
                        setFilter(option);
                        setFilterOpen(false);
                      }}
                      role="menuitemradio"
                      aria-checked={filter === option}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button primary>
              <Plus className="size-4" />
              Add New Event
            </Button>
          </div>
        </SectionTitle>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {visibleEvents.map((event) => (
          <article key={event.id} className="surface overflow-hidden rounded-2xl">
            <img src={event.image} alt="" className="h-44 w-full object-cover" />
            <div className="flex gap-5 p-5 sm:p-6">
              <time dateTime={event.date} className="flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="text-xs font-bold">{event.month}</span>
                <span className="mt-1 text-2xl font-black">{event.day}</span>
              </time>
              <div className="min-w-0 flex-1">
                <div>
                  <span className="text-xs font-bold text-primary">{event.category}</span>
                  <h2 className="mt-1 text-xl font-semibold">{event.title}</h2>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2"><CalendarDays className="size-4" />{event.date}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
