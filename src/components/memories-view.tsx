import { useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Upload } from "lucide-react";

import { Button, SectionTitle } from "@/components/kinship-ui";
import {
  memories,
  stageLabels,
  storageService,
  type UploadStage,
} from "@/lib/types";

export function MemoriesView() {
  const [year, setYear] = useState("2025");
  const [stage, setStage] = useState<UploadStage>("idle");
  const visible = memories.filter((memory) => memory.year === year);
  const upload = () => storageService.upload(setStage);

  return (
    <section>
      <SectionTitle title="Memories" eyebrow="The archive">
        <div className="flex gap-2">
          <Button onClick={() => setYear(year === "2025" ? "2024" : "2025")}>
            <ChevronLeft className="size-4" />
            {year}
            <ChevronRight className="size-4" />
          </Button>
          <Button primary onClick={upload}>
            <Upload className="size-4" />
            {stageLabels[stage]}
          </Button>
        </div>
      </SectionTitle>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((memory) => (
          <article
            key={memory.id}
            className="group overflow-hidden rounded-3xl border bg-card shadow-sm"
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
        <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed bg-card p-6 text-center">
          <div>
            <ImagePlus className="mx-auto size-8 text-primary" />
            <p className="mt-3 font-semibold">Add a new memory</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload photos, audio, or notes to your family archive.
            </p>
            <Button onClick={upload} className="mt-4">
              {stageLabels[stage]}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
