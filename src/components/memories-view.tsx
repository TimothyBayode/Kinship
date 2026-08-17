import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Filter, ImagePlus, Plus, X } from "lucide-react";

import { Button, SectionTitle } from "@/components/kinship-ui";
import { familyApi, memoryApi, uploadApi, type ApiMemory } from "@/lib/api";
import { memories } from "@/lib/types";

type DisplayMemory = { id: string; title: string; description: string; memoryDate: string; photos: string[]; demo: boolean };

export function MemoriesView() {
  const [live, setLive] = useState<ApiMemory[]>([]);
  const [familyId, setFamilyId] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<DisplayMemory | null>(null);
  const [error, setError] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  const albums: DisplayMemory[] = [
    ...live.map((memory) => ({ id: memory.id, title: memory.title, description: memory.description, memoryDate: memory.memoryDate, photos: memory.photos, demo: false })),
    ...memories.map((memory, index) => ({ id: memory.id, title: memory.title, description: demoDescriptions[index] ?? "A preserved family memory.", memoryDate: memory.uploadedAt, photos: [memory.image, demoExtras[index % demoExtras.length], demoExtras[(index + 1) % demoExtras.length]], demo: true })),
  ];
  const visible = filterDate ? albums.filter((album) => album.memoryDate === filterDate) : albums;

  useEffect(() => {
    familyApi.list().then(async (families) => {
      if (!families[0]) return;
      setFamilyId(families[0].id);
      setLive(await memoryApi.list(families[0].id));
    }).catch((exception: Error) => setError(exception.message));
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (event: PointerEvent) => { if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [filterOpen]);

  return <section>
    <div className="mb-12"><SectionTitle title="Memories"><div className="flex flex-wrap gap-2"><div ref={filterRef} className="relative"><button type="button" onClick={() => setFilterOpen((open) => !open)} className="surface inline-flex min-h-12 min-w-56 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold"><Filter className="size-4" />{filterDate ? formatLongDate(filterDate) : "All memories"}<ChevronDown className={`size-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} /></button>{filterOpen && <div className="surface absolute right-0 top-full z-20 mt-2 w-72 rounded-xl p-3"><button type="button" onClick={() => { setFilterDate(""); setFilterOpen(false); }} className="w-full rounded-lg px-4 py-3 text-left text-sm font-semibold hover:bg-primary/5">All memories</button><div className="mt-2"><DatePicker value={filterDate} onChange={(value) => { setFilterDate(value); setFilterOpen(false); }} embedded /></div></div>}</div><Button primary disabled={!familyId} onClick={() => setFormOpen(true)}><Plus className="size-4" />New Memory</Button></div></SectionTitle>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</div>

    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{visible.map((memory) => <button type="button" key={memory.id} onClick={() => setSelected(memory)} className="surface group rounded-3xl p-3 text-left"><AlbumStack memory={memory} /><div className="px-2 pb-2 pt-3"><p className="text-xs uppercase text-muted-foreground">{formatLongDate(memory.memoryDate)}</p><h2 className="mt-2 text-xl font-semibold">{memory.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{memory.description}</p></div></button>)}{!visible.length && <div className="surface grid min-h-72 place-items-center rounded-3xl p-6 text-center sm:col-span-2"><div><p className="font-semibold">No memories found</p><p className="mt-1 text-sm text-muted-foreground">Try another date or add a new memory.</p></div></div>}<button type="button" onClick={() => setFormOpen(true)} className="surface grid min-h-72 place-items-center rounded-3xl p-6 text-center"><div><ImagePlus className="mx-auto size-8 text-primary" /><p className="mt-3 font-semibold">Add a new memory</p><p className="mt-1 text-sm text-muted-foreground">Preserve a date, story, and photo collection.</p></div></button></div>

    {formOpen && <MemoryForm familyId={familyId} onClose={() => setFormOpen(false)} onCreated={(memory) => { setLive((current) => [memory, ...current]); setFormOpen(false); }} />}
    {selected && <MemoryDetails memory={selected} onClose={() => setSelected(null)} />}
  </section>;
}

function MemoryForm({ familyId, onClose, onCreated }: { familyId: string; onClose: () => void; onCreated: (memory: ApiMemory) => void }) {
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [date, setDate] = useState("");
  const [photos, setPhotos] = useState<string[]>([]); const [uploading, setUploading] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const upload = async (files: FileList) => { try { setUploading(true); setError(""); const urls = await Promise.all([...files].map(uploadApi.upload)); setPhotos((current) => [...current, ...urls]); } catch (exception) { setError((exception as Error).message); } finally { setUploading(false); } };
  const save = async () => { try { setSaving(true); setError(""); onCreated(await memoryApi.create({ familyId, title, description, memoryDate: date, photos })); } catch (exception) { setError((exception as Error).message); } finally { setSaving(false); } };
  return <Modal onClose={onClose}><div className="flex items-center justify-between"><div><h2 className="text-2xl font-semibold">New memory</h2><p className="mt-1 text-sm text-muted-foreground">Add the story and every photo that belongs to it.</p></div><button onClick={onClose} aria-label="Close"><X /></button></div><div className="mt-7 grid gap-5"><label className="text-sm font-medium">Title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-14 w-full rounded-md border-0 bg-[#f5f5f2] px-4" placeholder="Summer at Grandma's" /></label><label className="text-sm font-medium">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 min-h-28 w-full resize-y rounded-md border-0 bg-[#f5f5f2] p-4" placeholder="What happened, who was there, and why this matters..." /></label><div><span className="text-sm font-medium">Memory date</span><DatePicker value={date} onChange={setDate} /></div><div><span className="text-sm font-medium">Pictures</span><input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { if (event.target.files) void upload(event.target.files); event.target.value = ""; }} /><button type="button" onClick={() => input.current?.click()} className="mt-2 flex min-h-20 w-full items-center justify-center gap-2 rounded-md bg-[#f5f5f2] text-sm font-semibold text-primary"><ImagePlus className="size-5" />{uploading ? "Uploading pictures..." : "Choose pictures"}</button>{photos.length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{photos.map((photo, index) => <div key={photo} className="relative aspect-square"><img src={photo} alt="" className="size-full rounded-md object-cover" /><button type="button" onClick={() => setPhotos((current) => current.filter((_, item) => item !== index))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-white"><X className="size-3" /></button></div>)}</div>}</div></div>{error && <p className="mt-4 text-sm text-destructive">{error}</p>}<Button primary disabled={saving || uploading || title.trim().length < 2 || !date || photos.length === 0} onClick={save} className="mt-7 min-h-14 w-full">{saving ? "Saving memory..." : "Save memory"}</Button></Modal>;
}

function MemoryDetails({ memory, onClose }: { memory: DisplayMemory; onClose: () => void }) {
  return <Modal onClose={onClose} wide><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">{formatLongDate(memory.memoryDate)}</p><h2 className="mt-2 text-3xl font-semibold">{memory.title}</h2></div><button onClick={onClose} aria-label="Close"><X /></button></div><p className="mt-5 max-w-3xl leading-7 text-muted-foreground">{memory.description}</p><div className="mt-7 grid gap-4 sm:grid-cols-2">{memory.photos.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`${memory.title} ${index + 1}`} className="max-h-[420px] w-full rounded-xl object-cover" />)}</div></Modal>;
}

function AlbumStack({ memory }: { memory: DisplayMemory }) { const cover = memory.photos[0]; const second = memory.photos[1] ?? cover; const third = memory.photos[2] ?? second; return <div className="relative mx-auto h-64 max-w-[90%] px-6 pb-3 pt-5"><img src={third} alt="" className="absolute inset-x-8 bottom-3 top-5 h-[calc(100%-1.25rem)] w-[calc(100%-4rem)] origin-bottom-left -rotate-7 rounded-xl border-4 border-white object-cover" /><img src={second} alt="" className="absolute inset-x-8 bottom-3 top-5 h-[calc(100%-1.25rem)] w-[calc(100%-4rem)] origin-bottom-right rotate-7 rounded-xl border-4 border-white object-cover" /><img src={cover} alt={memory.title} className="relative z-10 h-full w-full rounded-xl border-4 border-white object-cover transition group-hover:scale-[1.02]" /><span className="absolute bottom-6 left-9 z-20 rounded-full bg-white/95 px-3 py-1 text-xs font-medium">{memory.photos.length} {memory.photos.length === 1 ? "photo" : "photos"}</span></div>; }

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) { return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/25 p-4 backdrop-blur-sm" onClick={onClose}><div className={`my-6 w-full rounded-2xl bg-white p-6 shadow-xl sm:p-8 ${wide ? "max-w-5xl" : "max-w-xl"}`} onClick={(event) => event.stopPropagation()}>{children}</div></div>; }

function DatePicker({ value, onChange, embedded = false }: { value: string; onChange: (value: string) => void; embedded?: boolean }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date(); const [open, setOpen] = useState(embedded); const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1)); const [monthOpen, setMonthOpen] = useState(false); const [yearOpen, setYearOpen] = useState(false); const days = getCalendarDays(month); const calendar = <div className={`${embedded ? "" : "absolute left-0 top-full z-30 mt-2"} w-full min-w-[320px] rounded-xl bg-white p-5 shadow-[0_10px_30px_rgba(23,21,29,0.12)]`}><div className="flex items-center justify-between"><button type="button" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft /></button><div className="flex gap-2"><div className="relative"><button type="button" onClick={() => { setMonthOpen(!monthOpen); setYearOpen(false); }} className="flex items-center gap-2 rounded-md bg-[#f5f5f2] px-3 py-2 text-sm font-bold">{monthNames[month.getMonth()]}<ChevronDown className="size-4" /></button>{monthOpen && <Menu>{monthNames.map((name, index) => <button type="button" key={name} onClick={() => { setMonth(new Date(month.getFullYear(), index, 1)); setMonthOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-primary/10">{name}</button>)}</Menu>}</div><div className="relative"><button type="button" onClick={() => { setYearOpen(!yearOpen); setMonthOpen(false); }} className="flex items-center gap-2 rounded-md bg-[#f5f5f2] px-3 py-2 text-sm font-bold">{month.getFullYear()}<ChevronDown className="size-4" /></button>{yearOpen && <Menu right>{years.map((year) => <button type="button" key={year} onClick={() => { setMonth(new Date(year, month.getMonth(), 1)); setYearOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-primary/10">{year}</button>)}</Menu>}</div></div><button type="button" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight /></button></div><div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{days.map((day) => { const date = formatDate(day); return <button type="button" key={date} onClick={() => { onChange(date); if (!embedded) setOpen(false); }} className={`aspect-square rounded-md text-sm ${day.getMonth() === month.getMonth() ? "" : "text-muted-foreground/30"} ${value === date ? "bg-primary font-bold text-white" : "hover:bg-primary/10"}`}>{day.getDate()}</button>; })}</div></div>; return <div className="relative">{!embedded && <button type="button" onClick={() => setOpen(!open)} className="mt-2 flex h-14 w-full items-center justify-between rounded-md bg-[#f5f5f2] px-4 text-sm"><span className={value ? "" : "text-muted-foreground"}>{value ? formatLongDate(value) : "Select date"}</span><CalendarDays className="size-5 text-primary" /></button>}{open && calendar}</div>;
}

function Menu({ children, right = false }: { children: React.ReactNode; right?: boolean }) { return <div className={`absolute top-full z-40 mt-2 max-h-52 w-36 overflow-auto rounded-xl bg-[#f5f5f2] p-2 shadow-lg ${right ? "right-0" : "left-0"}`}>{children}</div>; }
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const years = Array.from({ length: 81 }, (_, index) => new Date().getFullYear() - 70 + index);
const demoExtras = ["https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1472162072942-cd5147eb3902?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80"];
const demoDescriptions = ["An evening of stories, laughter, and food around the summer campfire.", "A bright weekend by the water with the whole family together.", "The first days in a home that became part of the family's story.", "Relatives across generations gathered again for a long-awaited reunion."];
function shiftMonth(date: Date, offset: number) { return new Date(date.getFullYear(), date.getMonth() + offset, 1); }
function formatDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function formatLongDate(value: string) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function getCalendarDays(month: Date) { const start = new Date(month.getFullYear(), month.getMonth(), 1 - new Date(month.getFullYear(), month.getMonth(), 1).getDay()); return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)); }
