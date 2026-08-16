import { useEffect, useRef, useState } from "react";
import { ChevronDown, Filter, Plus } from "lucide-react";

import { Button, SectionTitle } from "@/components/kinship-ui";
import { uploadApi } from "@/lib/api";
import { familyFiles, type FamilyFile } from "@/lib/types";

const filters = ["All Files", "Documents", "Audio", "Spreadsheets", "PDFs"] as const;
type FileFilter = (typeof filters)[number];

const fileExtensions = {
  PDF: "PDF",
  Audio: "MP3",
  Spreadsheet: "XLSX",
  Document: "DOCX",
};

const fileBandColors = {
  PDF: "bg-[#d84d4d]",
  Audio: "bg-[#66735a]",
  Spreadsheet: "bg-[#3f8b66]",
  Document: "bg-[#4d78b8]",
};

export default function FilesPage() {
  const [filter, setFilter] = useState<FileFilter>("All Files");
  const [filterOpen, setFilterOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FamilyFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const visibleFiles = [...uploadedFiles, ...familyFiles].filter((file) => {
    if (filter === "Documents") return file.type === "Document";
    if (filter === "Audio") return file.type === "Audio";
    if (filter === "Spreadsheets") return file.type === "Spreadsheet";
    if (filter === "PDFs") return file.type === "PDF";
    return true;
  });

  useEffect(() => {
    if (!filterOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) setFilterOpen(false);
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

  const upload = async (file: File) => {
    try {
      setUploading(true);
      setUploadError("");
      await uploadApi.upload(file);
      setUploadedFiles((current) => [{
        id: crypto.randomUUID(),
        name: file.name,
        type: fileType(file),
        size: formatFileSize(file.size),
        updated: "Uploaded just now",
        author: "You",
      }, ...current]);
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section>
      <div className="mb-12">
        <SectionTitle title="Files">
          <div className="flex flex-wrap gap-2">
            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                className="surface inline-flex min-w-44 items-center justify-center gap-2 whitespace-nowrap rounded-md px-5 py-3 text-sm font-semibold text-foreground"
                onClick={() => setFilterOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={filterOpen}
              >
                <Filter className="size-4" />
                {filter}
                <ChevronDown className={`size-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
              {filterOpen && (
                <div className="surface absolute right-0 top-full z-20 mt-2 w-52 rounded-xl p-2" role="menu">
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
            <input
              ref={uploadInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
            <Button primary disabled={uploading} onClick={() => uploadInputRef.current?.click()}>
              <Plus className="size-4" />
              {uploading ? "Uploading..." : "Upload New File"}
            </Button>
          </div>
        </SectionTitle>
        {uploadError && <p role="alert" className="mt-3 text-sm text-destructive">{uploadError}</p>}
      </div>

      <div className="surface overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-[minmax(0,1.7fr)_150px_130px_180px] gap-4 border-b-[0.25px] border-[rgba(245,245,242,0.35)] px-6 py-4 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground sm:grid">
          <span>Name</span>
          <span>Type</span>
          <span>Size</span>
          <span>Last Updated</span>
        </div>
        <div className="divide-y-[0.25px] divide-[rgba(245,245,242,0.35)]">
          {visibleFiles.map((file) => {
            return (
              <article key={file.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1.7fr)_150px_130px_180px] sm:items-center sm:px-6">
                <div className="flex min-w-0 items-center gap-4">
                  <FileTypeIcon type={file.type} />
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{file.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Added by {file.author}</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{file.type}</span>
                <span className="text-sm text-muted-foreground">{file.size}</span>
                <span className="text-sm text-muted-foreground">{file.updated}</span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function fileType(file: File): FamilyFile["type"] {
  if (file.type === "application/pdf") return "PDF";
  if (file.type.startsWith("audio/")) return "Audio";
  if (/spreadsheet|excel|csv/.test(file.type)) return "Spreadsheet";
  return "Document";
}

function formatFileSize(bytes: number) {
  return bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function FileTypeIcon({ type }: { type: keyof typeof fileExtensions }) {
  return (
    <span className="relative grid size-11 shrink-0 place-items-end overflow-hidden rounded-md border border-foreground/15 bg-white shadow-[0_2px_8px_rgba(23,21,29,0.08)]">
      <span className="absolute right-0 top-0 size-3 border-b border-l border-[#f5f5f2] bg-[#f5f5f2] [clip-path:polygon(0_0,100%_100%,0_100%)]" />
      <span className={`absolute inset-x-0 bottom-2 grid h-4 place-items-center ${fileBandColors[type]} text-[7px] font-black tracking-[.04em] text-white`}>
        {fileExtensions[type]}
      </span>
      <span className="mb-0.5 mr-1 text-[6px] font-bold text-muted-foreground/60">
        FILE
      </span>
    </span>
  );
}
