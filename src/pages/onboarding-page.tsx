import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";

import { Button, Logo } from "@/components/kinship-ui";
import { familyApi, invitationApi, profileApi } from "@/lib/api";

const inputClass = "mt-2 w-full rounded-md border border-foreground/15 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

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
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    try {
      setLoading(true); setError("");
      await profileApi.update({ gender, phone, birthday });
      if (next?.startsWith("/invite?")) {
        navigate(next, { replace: true });
        return;
      }
      setStep("family");
    } catch (exception) { setError((exception as Error).message); } finally { setLoading(false); }
  };

  const finish = async () => {
    try {
      setLoading(true); setError("");
      if (mode === "create") await familyApi.create(familyName);
      else await invitationApi.accept(inviteCode.trim().toUpperCase());
      navigate("/family", { replace: true });
    } catch (exception) { setError((exception as Error).message); } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-primary p-4 sm:p-8">
      <section className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl rounded-[2rem] bg-[#f5f5f2] p-6 sm:p-10">
        <Logo />
        <div className="mx-auto mt-16 max-w-xl">
          <p className="text-xs font-bold uppercase text-primary">Step {step === "profile" ? "1 of 2" : "2 of 2"}</p>
          <h1 className="mt-3 text-4xl font-semibold">{step === "profile" ? "Complete your profile" : "Find your family"}</h1>
          {step === "profile" ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">Gender<select value={gender} onChange={(event) => setGender(event.target.value)} className={inputClass}><option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="non-binary">Non-binary</option><option value="prefer-not-to-say">Prefer not to say</option></select></label>
              <label className="text-sm font-medium">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" className={inputClass} placeholder="+234 800 000 0000" /></label>
              <label className="text-sm font-medium sm:col-span-2">Birthday<input value={birthday} onChange={(event) => setBirthday(event.target.value)} type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass} /></label>
            </div>
          ) : (
            <div className="mt-8">
              <div className="grid grid-cols-2 rounded-md bg-white p-1"><button onClick={() => setMode("create")} className={`rounded-md px-4 py-3 text-sm font-semibold ${mode === "create" ? "bg-primary text-white" : ""}`}>Create a family</button><button onClick={() => setMode("join")} className={`rounded-md px-4 py-3 text-sm font-semibold ${mode === "join" ? "bg-primary text-white" : ""}`}>Join with code</button></div>
              {mode === "create" ? <label className="mt-7 block text-sm font-medium">Family name<input value={familyName} onChange={(event) => setFamilyName(event.target.value)} className={inputClass} placeholder="The Bayode Family" /></label> : <label className="mt-7 block text-sm font-medium">Invite code<input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} className={`${inputClass} uppercase`} placeholder="AB12CD34" /></label>}
              <div className="mt-6 flex items-center gap-3 rounded-md bg-white p-4 text-sm text-muted-foreground"><Users className="size-5 text-primary" />You can add a family photo and more relatives later.</div>
            </div>
          )}
          {error && <p className="mt-5 text-sm text-destructive">{error}</p>}
          <Button primary disabled={loading || (step === "profile" ? !gender || phone.length < 7 || !birthday : mode === "create" ? familyName.trim().length < 2 : inviteCode.trim().length < 6)} onClick={step === "profile" ? saveProfile : finish} className="mt-8 w-full">{loading ? "Please wait..." : "Continue"}<ArrowRight className="size-4" /></Button>
        </div>
      </section>
    </main>
  );
}
