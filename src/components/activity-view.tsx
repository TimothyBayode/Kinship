import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";

import { Avatar, Button, SectionTitle } from "@/components/kinship-ui";
import { activities, events, family, imageRefs, members } from "@/lib/types";

export function ActivityView() {
  return (
    <section>
      <SectionTitle title="Latest activities" eyebrow="A home for your family">
        <Button primary>
          <Plus className="size-4" />
          Add relative
        </Button>
      </SectionTitle>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {activities.map((activity) => (
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
          <div className="surface overflow-hidden rounded-3xl">
            <img
              src={imageRefs.family}
              alt="Family tree preview"
              className="h-44 w-full object-cover object-top"
            />
            <div className="p-5">
              <h2 className="text-xl font-semibold">{family.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {members.length} members connected
              </p>
              <Link to="/family" className="mt-5 inline-flex w-full items-center justify-center rounded-md border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted">Explore family</Link>
            </div>
          </div>
          <div className="surface rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              <h2 className="font-semibold">Upcoming events</h2>
            </div>
            {events.map((event) => (
              <div
                key={event.id}
                className="mt-4 flex items-center justify-between border-t pt-4"
              >
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.date}</p>
                </div>
                <span className="text-xs text-primary">{event.meta}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
