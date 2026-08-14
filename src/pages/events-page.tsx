import { CalendarDays } from "lucide-react";

import { SectionTitle } from "@/components/kinship-ui";

export default function EventsPage() {
  return (
    <section>
      <SectionTitle title="Events" eyebrow="Time together" />
      <div className="surface mt-8 grid min-h-80 place-items-center rounded-3xl p-8 text-center">
        <CalendarDays className="size-10 text-primary" />
        <h2 className="mt-4 text-xl font-semibold">Your family calendar</h2>
        <p className="mt-2 text-muted-foreground">
          Events will live here as this frontend grows.
        </p>
      </div>
    </section>
  );
}
