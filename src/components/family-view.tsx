import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Mail, Plus, Search, X, ZoomIn, ZoomOut } from "lucide-react";

import { Avatar, Button, SectionTitle, SelectMenu } from "@/components/kinship-ui";
import { authApi, familyApi, invitationApi, type ApiFamily, type ApiFamilyMember } from "@/lib/api";

const relationshipOptions = ["Mother", "Father", "Brother", "Sister", "Son", "Daughter", "Grandfather", "Grandmother", "Niece", "Nephew", "Cousin", "Brother-in-law", "Sister-in-law", "Mother-in-law", "Father-in-law", "Aunt", "Uncle", "Spouse", "Partner", "Other"].map((value) => ({ value, label: value }));

export function FamilyView() {
  const [families, setFamilies] = useState<ApiFamily[]>([]);
  const [members, setMembers] = useState<ApiFamilyMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [setupMode, setSetupMode] = useState<"create" | "join" | null>(null);
  const family = families[0];
  const filtered = useMemo(() => members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase())), [members, query]);

  useEffect(() => {
    authApi.sync().then(({ user }) => setCurrentUserId(user.id)).catch(() => undefined);
    familyApi.list().then(async (items) => {
      if (items[0] && !items[0].inviteCode) {
        items[0] = { ...items[0], inviteCode: await familyApi.inviteCode(items[0].id) };
      }
      setFamilies(items);
      if (items[0]) setMembers(await familyApi.members(items[0].id));
    }).catch((exception: Error) => setError(exception.message));
  }, []);

  const updateRelationship = async (memberId: string, value: string) => {
    if (!family) return;
    try {
      await familyApi.setRelationship(family.id, memberId, value);
      setMembers((current) => current.map((member) => member.id === memberId ? { ...member, relationship: value } : member));
    } catch (exception) { setError((exception as Error).message); }
  };

  const copyCode = async () => {
    if (!family?.inviteCode) return;
    await navigator.clipboard.writeText(family.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  const title = <span className="flex flex-wrap items-center gap-3"><span>{family?.name ?? "Your Family"}</span>{family?.inviteCode && <button type="button" onClick={copyCode} className="inline-flex h-6 items-center gap-1 rounded-md bg-primary/10 px-1.5 font-mono text-[8px] font-bold tracking-[.04em] text-primary" title="Copy family invite code">{family.inviteCode}{copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}</button>}</span>;

  if (!family) return <EmptyFamily mode={setupMode} onMode={setSetupMode} onReady={async () => { const items = await familyApi.list(); setFamilies(items); if (items[0]) setMembers(await familyApi.members(items[0].id)); }} />;

  return <section>
    <SectionTitle title={title}><div className="flex flex-wrap gap-2">{family && <Button primary onClick={() => setInviteOpen(true)}><Plus className="size-4" />Add Relative</Button>}<Button onClick={() => setZoom((current) => Math.max(.7, current - .1))}><ZoomOut className="size-4" /></Button><Button onClick={() => setZoom((current) => Math.min(1.3, current + .1))}><ZoomIn className="size-4" /></Button><div className="surface flex items-center gap-2 rounded-md px-4 py-3 text-muted-foreground"><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" className="w-48 bg-transparent text-sm outline-none" /></div></div></SectionTitle>
    {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
    <FamilyTree members={members} currentUserId={currentUserId} zoom={zoom} />
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((member) => <article key={member.id} className="surface flex items-center gap-4 rounded-2xl p-5"><Avatar src={member.avatarUrl || undefined} name={member.name} size="size-14" /><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><p className="truncate font-semibold">{member.name}</p>{member.id === currentUserId ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">You</span> : member.relationship && <span className="shrink-0 rounded-full bg-[#f5f5f2] px-2 py-0.5 text-[10px] font-semibold text-primary">{member.relationship}</span>}</div><p className="truncate text-sm text-muted-foreground">{member.email}</p>{member.id === currentUserId ? <div className="mt-3 flex h-14 items-center rounded-md bg-[#f5f5f2] px-4 text-sm font-semibold text-primary">You</div> : <SelectMenu value={member.relationship || ""} options={relationshipOptions} placeholder="Choose relationship" onChange={(value) => void updateRelationship(member.id, value)} className="mt-3" />}</div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">{member.role === "owner" ? "Steward" : member.role}</span></article>)}
      {!filtered.length && <div className="surface rounded-2xl p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">No family members found.</div>}
    </div>{inviteOpen && family && <InviteMember family={family} onClose={() => setInviteOpen(false)} />}
  </section>;
}

function EmptyFamily({ mode, onMode, onReady }: { mode: "create" | "join" | null; onMode: (mode: "create" | "join" | null) => void; onReady: () => Promise<void> }) { const [value, setValue] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const submit = async () => { if (!mode) return; try { setLoading(true); setError(""); if (mode === "create") await familyApi.create(value); else await familyApi.join(value.trim().toUpperCase()); await onReady(); onMode(null); } catch (exception) { setError((exception as Error).message); } finally { setLoading(false); } }; return <section><SectionTitle title="Your Family" /><div className="surface mt-8 grid min-h-96 place-items-center rounded-2xl p-6 text-center"><div className="max-w-lg"><h2 className="text-2xl font-semibold">Start your family archive</h2><p className="mt-3 leading-7 text-muted-foreground">Create a new family space or join relatives using their shared family code.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Button primary onClick={() => onMode("create")}><Plus className="size-4" />Create Family</Button><Button onClick={() => onMode("join")}><Mail className="size-4" />Join Family</Button></div></div></div>{mode && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4 backdrop-blur-sm" onClick={() => onMode(null)}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h2 className="text-2xl font-semibold">{mode === "create" ? "Create family" : "Join family"}</h2><p className="mt-1 text-sm text-muted-foreground">{mode === "create" ? "Choose the name relatives will recognize." : "Enter the code shared by a family member."}</p></div><button onClick={() => onMode(null)}><X /></button></div><label className="mt-6 block text-sm font-medium">{mode === "create" ? "Family name" : "Family code"}<input value={value} onChange={(event) => setValue(mode === "join" ? event.target.value.toUpperCase() : event.target.value)} className="mt-2 h-14 w-full rounded-md border-0 bg-[#f5f5f2] px-4 outline-none focus:border-0 focus:outline-none focus:ring-0" placeholder={mode === "create" ? "The Bayode Family" : "AB12CD34"} /></label>{error && <p className="mt-4 text-sm text-destructive">{error}</p>}<Button primary disabled={loading || value.trim().length < 2} onClick={submit} className="mt-6 min-h-14 w-full">{loading ? "Please wait..." : mode === "create" ? "Create Family" : "Join Family"}</Button></div></div>}</section>; }

function FamilyTree({ members, currentUserId, zoom }: { members: ApiFamilyMember[]; currentUserId: string; zoom: number }) {
  const root = members.find((member) => member.id === currentUserId) ?? members.find((member) => member.role === "owner") ?? members[0];
  const connected = members.filter((member) => member.id !== root?.id && member.relationship);
  if (!root || !connected.length) return null;
  const grandparents = connected.filter((member) => ["Grandfather", "Grandmother"].includes(member.relationship));
  const parents = connected.filter((member) => ["Mother", "Father", "Mother-in-law", "Father-in-law", "Aunt", "Uncle"].includes(member.relationship));
  const peers = connected.filter((member) => ["Brother", "Sister", "Cousin", "Brother-in-law", "Sister-in-law"].includes(member.relationship));
  const partners = connected.filter((member) => ["Spouse", "Partner"].includes(member.relationship));
  const children = connected.filter((member) => ["Son", "Daughter", "Niece", "Nephew"].includes(member.relationship));
  const others = connected.filter((member) => ![...grandparents, ...parents, ...peers, ...partners, ...children].some((item) => item.id === member.id));
  return <section className="grid-paper surface relative mt-8 overflow-auto rounded-2xl p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Family tree</p><p className="mt-1 text-sm text-muted-foreground">Generations and connectors follow each confirmed relationship.</p></div><span className="rounded-md bg-[#f5f5f2] px-3 py-1.5 text-sm font-semibold text-muted-foreground">{Math.round(zoom * 100)}%</span></div><div className="mx-auto min-w-[820px] py-5 transition-transform" style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
    {grandparents.length > 0 && <><GenerationRow members={grandparents} /><VerticalConnector /></>}
    {parents.length > 0 && <><GenerationRow members={parents} /><VerticalConnector /></>}
    <PeerRow siblings={peers} root={root} partners={partners} currentUserId={currentUserId} />
    {(children.length > 0 || others.length > 0) && <><VerticalConnector /><GenerationRow members={[...children, ...others]} /></>}
  </div></section>;
}

function TreeNode({ member, you = false }: { member: ApiFamilyMember; you?: boolean }) { return <div className="relative z-10 flex w-36 flex-col items-center rounded-lg bg-[#f5f5f2] p-3 text-center shadow-[0_4px_18px_rgba(23,21,29,0.06)]"><Avatar src={member.avatarUrl || undefined} name={member.name} size="size-12" /><p className="mt-2 truncate max-w-full text-xs font-semibold">{member.name}</p><span className="mt-1 max-w-full truncate text-[10px] text-primary">{you ? "You" : member.relationship}</span></div>; }

function GenerationRow({ members }: { members: ApiFamilyMember[] }) { return <div className="relative mx-auto flex w-fit min-w-52 justify-center gap-6 px-10 py-2">{members.length > 1 && <span className="absolute left-[15%] right-[15%] top-1/2 h-px bg-primary/45" />}{members.map((member) => <TreeNode key={member.id} member={member} />)}</div>; }

function PeerRow({ siblings, root, partners, currentUserId }: { siblings: ApiFamilyMember[]; root: ApiFamilyMember; partners: ApiFamilyMember[]; currentUserId: string }) { const row = [...siblings, root, ...partners]; return <div className="relative mx-auto flex w-fit min-w-52 justify-center gap-6 px-10 py-2">{row.length > 1 && <span className="absolute left-[12%] right-[12%] top-1/2 h-px bg-primary/55" />}{row.map((member) => <TreeNode key={member.id} member={member} you={member.id === currentUserId} />)}</div>; }

function VerticalConnector() { return <div className="mx-auto h-12 w-px bg-primary/45" aria-hidden="true" />; }

function InviteMember({ family, onClose }: { family: ApiFamily; onClose: () => void }) { const [fullName, setFullName] = useState(""); const [relationship, setRelationship] = useState(""); const [email, setEmail] = useState(""); const [sending, setSending] = useState(false); const [code, setCode] = useState(""); const [message, setMessage] = useState(""); const send = async () => { try { setSending(true); setMessage(""); const result = await invitationApi.create({ familyId: family.id, fullName, relationship, email }); setCode(result.invitation.code); setMessage(result.delivery.delivered ? "Invitation email sent." : result.delivery.error ? `Invite created. ${result.delivery.error}` : "Invite created. Share the code below."); } catch (exception) { setMessage((exception as Error).message); } finally { setSending(false); } }; const field = "mt-2 h-14 w-full rounded-md border-0 bg-[#f5f5f2] px-4 outline-none focus:border-0 focus:outline-none focus:ring-0"; return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4 backdrop-blur-sm" onClick={onClose}><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl sm:p-8" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><h2 className="text-2xl font-semibold">Invite family member</h2><p className="mt-1 text-sm text-muted-foreground">Send an email invitation or share the generated code.</p></div><button onClick={onClose}><X /></button></div><div className="mt-7 grid gap-5"><label className="text-sm font-medium">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className={field} placeholder="Relative's full name" /></label><div><span className="text-sm font-medium">Relationship</span><SelectMenu value={relationship} options={relationshipOptions} placeholder="Choose relationship" onChange={setRelationship} className="mt-2" /></div><label className="text-sm font-medium">Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className={field} placeholder="relative@example.com" /></label></div>{message && <p className="mt-5 text-sm text-primary">{message}</p>}{code && <button type="button" onClick={() => navigator.clipboard.writeText(code)} className="mt-4 flex w-full items-center justify-between rounded-md bg-[#f5f5f2] p-4"><span className="font-mono text-xl font-bold tracking-[.2em]">{code}</span><Copy className="size-4" /></button>}<Button primary disabled={sending || fullName.trim().length < 2 || !relationship || !email.includes("@")} onClick={send} className="mt-7 min-h-14 w-full"><Mail className="size-4" />{sending ? "Creating invite..." : "Send email invite"}</Button></div></div>; }
