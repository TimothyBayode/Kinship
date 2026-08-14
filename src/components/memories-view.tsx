import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, ImagePlus, Plus } from "lucide-react";

import { Button, SectionTitle } from "@/components/kinship-ui";
import {
  memories,
  stageLabels,
  storageService,
  type UploadStage,
} from "@/lib/types";

export function MemoriesView() {
  const [filter, setFilter] = useState("Immediate Family Members");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2025, 6, 1));
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const [stage, setStage] = useState<UploadStage>("idle");
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const visible = memories.filter((memory) =>
    filter === "Pick Date" && selectedDate
      ? memory.uploadedAt === selectedDate
      : true,
  );
  const upload = () => storageService.upload(setStage);
  const filterLabel =
    filter === "Pick Date" && selectedDate
      ? new Intl.DateTimeFormat("en", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${selectedDate}T00:00:00Z`))
      : filter;
  const calendarDays = getCalendarDays(calendarMonth);

  useEffect(() => {
    if (!filterOpen && !calendarOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterOpen(false);
        setCalendarOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [calendarOpen, filterOpen]);

  return (
    <section>
      <SectionTitle title="Memories">
        <div className="flex flex-wrap gap-2">
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              className="surface inline-flex min-w-72 items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 py-3 text-sm font-semibold text-foreground"
              onClick={() => setFilterOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={filterOpen}
            >
              <Filter className="size-4" />
              {filterLabel}
            </button>
            {filterOpen && (
              <div
                className="surface absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl p-2"
                role="menu"
              >
                {["Pick Date", "Children", "Extended Family", "Immediate Family Members"].map(
                  (option) => (
                    <button
                      type="button"
                      key={option}
                      className={`block w-full whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm hover:bg-primary/5 ${filter === option ? "font-bold text-primary" : "font-medium"}`}
                      onClick={() => {
                        setFilter(option);
                        setFilterOpen(false);
                        if (option === "Pick Date") {
                          setCalendarOpen(true);
                        }
                      }}
                      role="menuitemradio"
                      aria-checked={filter === option}
                    >
                      {option}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
          <Button primary onClick={upload}>
            <Plus className="size-4" />
            {stage === "idle" ? "New Memory" : stageLabels[stage]}
          </Button>
        </div>
      </SectionTitle>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((memory) => (
          <article
            key={memory.id}
            className="surface group overflow-hidden rounded-3xl"
          >
            <div className="relative">
              <img
                src={memory.image}
                alt={memory.title}
                className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute bottom-4 left-4 rounded-full bg-card/90 px-3 py-1 text-xs font-medium">
                {memory.count} memories
              </span>
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-[.16em] text-muted-foreground">
                {memory.year}
              </p>
              <h2 className="mt-2 text-xl font-semibold">{memory.title}</h2>
            </div>
          </article>
        ))}
        {filter === "Pick Date" && selectedDate && visible.length === 0 && (
          <div className="surface grid min-h-72 place-items-center rounded-3xl p-6 text-center sm:col-span-2">
            <div>
              <p className="font-semibold">No memories found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                There are no memories uploaded on this date.
              </p>
            </div>
          </div>
        )}
        <div className="surface grid min-h-72 place-items-center rounded-3xl p-6 text-center">
          <div>
            <ImagePlus className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-semibold">Add a new memory</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload photos, audio, or notes to your family archive.
            </p>
            <Button onClick={upload} className="mt-4">
              <Plus className="size-4" />
              {stage === "idle" ? "New Memory" : stageLabels[stage]}
            </Button>
          </div>
        </div>
      </div>
      {calendarOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/15 p-4 backdrop-blur-sm"
          onClick={() => setCalendarOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_16px_48px_rgba(23,21,29,0.14)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Pick a memory date"
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="rounded-md p-2 hover:bg-primary/5"
                onClick={() => setCalendarMonth((month) => shiftMonth(month, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    className="flex min-w-32 items-center justify-between gap-2 rounded-md bg-[#f5f5f2] px-3 py-2 text-sm font-bold hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/15"
                    onClick={() => {
                      setMonthMenuOpen((open) => !open);
                      setYearMenuOpen(false);
                    }}
                    aria-label="Select month"
                    aria-haspopup="listbox"
                    aria-expanded={monthMenuOpen}
                  >
                    {monthNames[calendarMonth.getMonth()]}
                    <ChevronDown className={`size-4 transition-transform ${monthMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {monthMenuOpen && (
                    <div
                      className="absolute left-0 top-full z-10 mt-2 max-h-64 w-40 overflow-auto rounded-xl bg-[#f5f5f2] p-2 shadow-[0_10px_30px_rgba(23,21,29,0.12)]"
                      role="listbox"
                      aria-label="Month"
                    >
                      {monthNames.map((month, index) => (
                        <button
                          type="button"
                          key={month}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-primary/10 ${calendarMonth.getMonth() === index ? "font-bold text-primary" : "font-medium"}`}
                          onClick={() => {
                            setCalendarMonth(new Date(calendarMonth.getFullYear(), index, 1));
                            setMonthMenuOpen(false);
                          }}
                          role="option"
                          aria-selected={calendarMonth.getMonth() === index}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    className="flex min-w-24 items-center justify-between gap-2 rounded-md bg-[#f5f5f2] px-3 py-2 text-sm font-bold hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/15"
                    onClick={() => {
                      setYearMenuOpen((open) => !open);
                      setMonthMenuOpen(false);
                    }}
                    aria-label="Select year"
                    aria-haspopup="listbox"
                    aria-expanded={yearMenuOpen}
                  >
                    {calendarMonth.getFullYear()}
                    <ChevronDown className={`size-4 transition-transform ${yearMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {yearMenuOpen && (
                    <div
                      className="absolute right-0 top-full z-10 mt-2 max-h-64 w-28 overflow-auto rounded-xl bg-[#f5f5f2] p-2 shadow-[0_10px_30px_rgba(23,21,29,0.12)]"
                      role="listbox"
                      aria-label="Year"
                    >
                      {calendarYears.map((year) => (
                        <button
                          type="button"
                          key={year}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-primary/10 ${calendarMonth.getFullYear() === year ? "font-bold text-primary" : "font-medium"}`}
                          onClick={() => {
                            setCalendarMonth(new Date(year, calendarMonth.getMonth(), 1));
                            setYearMenuOpen(false);
                          }}
                          role="option"
                          aria-selected={calendarMonth.getFullYear() === year}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-2 hover:bg-primary/5"
                onClick={() => setCalendarMonth((month) => shiftMonth(month, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
              {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const date = formatDate(day);
                const selected = date === selectedDate;
                return (
                  <button
                    type="button"
                    key={date}
                    className={`aspect-square rounded-md text-sm ${day.getMonth() === calendarMonth.getMonth() ? "text-foreground" : "text-muted-foreground/35"} ${selected ? "bg-primary font-bold text-primary-foreground" : "hover:bg-primary/10"}`}
                    onClick={() => {
                      setSelectedDate(date);
                      setFilter("Pick Date");
                      setCalendarOpen(false);
                    }}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const calendarYears = Array.from({ length: 21 }, (_, index) => new Date().getFullYear() - 10 + index);

function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getCalendarDays(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1 - start.getDay());
  return Array.from({ length: 42 }, (_, index) =>
    new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + index),
  );
}
