import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Users } from "lucide-react";

import { Button, Logo, SelectMenu } from "@/components/kinship-ui";
import { familyApi, profileApi, uploadApi } from "@/lib/api";

const inputClass = "mt-2 h-14 w-full rounded-md border-0 bg-[#f5f5f2] px-4 text-sm outline-none focus:border-0 focus:outline-none focus:ring-0";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next");
  const [step, setStep] = useState<"profile" | "family">("profile");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyPicture, setFamilyPicture] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const pictureInput = useRef<HTMLInputElement>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    try {
      setLoading(true);
      setError("");
      await profileApi.update({ gender, phone, birthday });
      if (next?.startsWith("/invite?")) {
        navigate(next, { replace: true });
        return;
      }
      setStep("family");
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    try {
      setLoading(true);
      setError("");
      if (mode === "create") await familyApi.create(familyName, familyPicture);
      else await familyApi.join(inviteCode.trim().toUpperCase());
      navigate("/family", { replace: true });
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const invalid = step === "profile"
    ? !gender || phone.length < 7 || !birthday
    : mode === "create" ? familyName.trim().length < 2 : inviteCode.trim().length < 6;

  const uploadPicture = async (file: File) => {
    try {
      setUploadingPicture(true);
      setError("");
      setFamilyPicture(await uploadApi.upload(file));
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setUploadingPicture(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f5f2] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl"><Logo /></div>
      <section className="mx-auto mt-10 max-w-2xl rounded-2xl bg-white px-6 py-10 sm:mt-16 sm:px-12 sm:py-12">
        <p className="text-xs font-bold uppercase text-primary">Step {step === "profile" ? "1 of 2" : "2 of 2"}</p>
        <h1 className="mt-3 text-4xl font-semibold">{step === "profile" ? "Complete your profile" : "Find your family"}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{step === "profile" ? "A few details help your relatives recognize and connect with you." : "Create a new family archive or use a code shared by a family steward."}</p>

        {step === "profile" ? (
          <div className="mt-9 grid gap-6 sm:grid-cols-2">
            <div><span className="text-sm font-medium">Gender</span><SelectMenu value={gender} options={genderOptions} placeholder="Select gender" onChange={setGender} className="mt-2" /></div>
            <label className="text-sm font-medium">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" className={inputClass} placeholder="+234 800 000 0000" /></label>
            <div className="sm:col-span-2"><span className="text-sm font-medium">Birthday</span><BirthdayPicker value={birthday} onChange={setBirthday} /></div>
          </div>
        ) : (
          <div className="mt-9">
            <div className="grid grid-cols-2 rounded-md bg-[#f5f5f2] p-1.5"><button type="button" onClick={() => setMode("create")} className={`h-13 rounded-md px-4 text-sm font-semibold ${mode === "create" ? "bg-primary text-white" : "text-muted-foreground"}`}>Create a family</button><button type="button" onClick={() => setMode("join")} className={`h-13 rounded-md px-4 text-sm font-semibold ${mode === "join" ? "bg-primary text-white" : "text-muted-foreground"}`}>Join with code</button></div>
            {mode === "create" ? <div className="mt-7"><label className="block text-sm font-medium">Family name<input value={familyName} onChange={(event) => setFamilyName(event.target.value)} className={inputClass} placeholder="The Bayode Family" /></label><span className="mt-6 block text-sm font-medium">Family picture <span className="font-normal text-muted-foreground">(optional)</span></span><input ref={pictureInput} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPicture(file); event.target.value = ""; }} /><button type="button" onClick={() => pictureInput.current?.click()} className="mt-2 flex min-h-24 w-full items-center gap-4 rounded-md bg-[#f5f5f2] p-4 text-left">{familyPicture ? <img src={familyPicture} alt="Family preview" className="size-16 rounded-md object-cover" /> : <span className="grid size-16 place-items-center rounded-md bg-white text-primary"><ImagePlus className="size-6" /></span>}<span><strong className="block text-sm">{uploadingPicture ? "Uploading..." : familyPicture ? "Change family picture" : "Add family picture"}</strong><span className="mt-1 block text-xs text-muted-foreground">JPG, PNG or WebP</span></span></button></div> : <label className="mt-7 block text-sm font-medium">Invite code<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} className={`${inputClass} uppercase`} placeholder="AB12CD34" /></label>}
            <div className="mt-6 flex min-h-14 items-center gap-3 rounded-md bg-[#f5f5f2] px-4 text-sm text-muted-foreground"><Users className="size-5 text-primary" />You can add a family photo and more relatives later.</div>
          </div>
        )}
        {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
        <Button primary disabled={loading || uploadingPicture || invalid} onClick={step === "profile" ? saveProfile : finish} className="mt-9 min-h-14 w-full">{loading ? "Please wait..." : "Continue"}<ArrowRight className="size-4" /></Button>
      </section>
    </main>
  );
}

function BirthdayPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => selected ?? new Date(new Date().getFullYear() - 30, 0, 1));
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const today = new Date();
  const days = getCalendarDays(month);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${inputClass} flex items-center justify-between text-left ${value ? "text-foreground" : "text-muted-foreground"}`}><span>{selected ? new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(selected) : "Select birthday"}</span><CalendarDays className="size-5 text-primary" /></button>
      {open && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/15 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_16px_48px_rgba(23,21,29,0.14)]" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Select birthday">
        <div className="flex items-center justify-between">
          <button type="button" className="rounded-md p-2 hover:bg-primary/5" onClick={() => setMonth((current) => shiftMonth(current, -1))} aria-label="Previous month"><ChevronLeft className="size-5" /></button>
          <div className="flex items-center gap-2">
            <div className="relative"><button type="button" className="flex min-w-32 items-center justify-between gap-2 rounded-md bg-[#f5f5f2] px-3 py-2 text-sm font-bold" onClick={() => { setMonthOpen((current) => !current); setYearOpen(false); }}>{monthNames[month.getMonth()]}<ChevronDown className="size-4" /></button>{monthOpen && <div className="absolute left-0 top-full z-10 mt-2 max-h-64 w-40 overflow-auto rounded-xl bg-[#f5f5f2] p-2 shadow-lg">{monthNames.map((name, index) => <button type="button" key={name} className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-primary/10 ${month.getMonth() === index ? "font-bold text-primary" : ""}`} onClick={() => { setMonth(new Date(month.getFullYear(), index, 1)); setMonthOpen(false); }}>{name}</button>)}</div>}</div>
            <div className="relative"><button type="button" className="flex min-w-24 items-center justify-between gap-2 rounded-md bg-[#f5f5f2] px-3 py-2 text-sm font-bold" onClick={() => { setYearOpen((current) => !current); setMonthOpen(false); }}>{month.getFullYear()}<ChevronDown className="size-4" /></button>{yearOpen && <div className="absolute right-0 top-full z-10 mt-2 max-h-64 w-28 overflow-auto rounded-xl bg-[#f5f5f2] p-2 shadow-lg">{birthdayYears.map((year) => <button type="button" key={year} className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-primary/10 ${month.getFullYear() === year ? "font-bold text-primary" : ""}`} onClick={() => { setMonth(new Date(year, month.getMonth(), 1)); setYearOpen(false); }}>{year}</button>)}</div>}</div>
          </div>
          <button type="button" disabled={month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()} className="rounded-md p-2 hover:bg-primary/5 disabled:opacity-30" onClick={() => setMonth((current) => shiftMonth(current, 1))} aria-label="Next month"><ChevronRight className="size-5" /></button>
        </div>
        <div className="mt-5 grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
        <div className="mt-3 grid grid-cols-7 gap-1">{days.map((day) => { const date = formatDate(day); const future = day > today; return <button type="button" key={date} disabled={future} className={`aspect-square rounded-md text-sm disabled:opacity-20 ${day.getMonth() === month.getMonth() ? "text-foreground" : "text-muted-foreground/35"} ${date === value ? "bg-primary font-bold text-white" : "hover:bg-primary/10"}`} onClick={() => { onChange(date); setOpen(false); }}>{day.getDate()}</button>; })}</div>
      </div></div>}
    </>
  );
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const genderOptions = [{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "non-binary", label: "Non-binary" }, { value: "prefer-not-to-say", label: "Prefer not to say" }];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const birthdayYears = Array.from({ length: 121 }, (_, index) => new Date().getFullYear() - index);
function shiftMonth(date: Date, offset: number) { return new Date(date.getFullYear(), date.getMonth() + offset, 1); }
function formatDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function getCalendarDays(month: Date) { const start = new Date(month.getFullYear(), month.getMonth(), 1); const first = new Date(month.getFullYear(), month.getMonth(), 1 - start.getDay()); return Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index)); }
