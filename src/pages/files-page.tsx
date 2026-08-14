import { FileText } from "lucide-react";

import { SectionTitle } from "@/components/kinship-ui";

export default function FilesPage() {
  return (
    <section>
      <SectionTitle title="Files" eyebrow="The family archive" />
      <div className="surface mt-8 grid min-h-80 place-items-center rounded-3xl p-8 text-center">
        <FileText className="size-10 text-primary" />
        <h2 className="mt-4 text-xl font-semibold">Family files</h2>
        <p className="mt-2 text-muted-foreground">
          Documents and recordings will live here as this frontend grows.
        </p>
      </div>
    </section>
  );
}
