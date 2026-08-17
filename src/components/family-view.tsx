import { useEffect, useMemo, useState } from "react";
import { Copy, Mail, Plus, Search, X } from "lucide-react";

import { Avatar, Button, SectionTitle } from "@/components/kinship-ui";
import { familyApi, invitationApi, type ApiFamily, type ApiFamilyMember } from "@/lib/api";

const relationships = ["Parent", "Child", "Sibling", "Spouse", "Grandparent", "Grandchild", "Aunt", "Uncle", "Cousin", "Relative"];

export function FamilyView() {
  const [families, setFamilies] = useState<ApiFamily[]>([]);
  const [members, setMembers] = useState<ApiFamilyMember[]>([]);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState("");
  const family = families[0];
  const filtered = useMemo(() => members.filter((member) => member.name.toLowerCase().includes(query.toLowerCase())), [members, query]);

  useEffect(() => {
    familyApi.list().then(async (items) => {
      setFamilies(items);
      if (items[0]) setMembers(await familyApi.members(items[0].id));
    }).catch((error: Error) => setStatus(error.message));
  }, []);

  const invite = async () => {
    if (!family) return;
    try {
      setStatus("");
      const result = await invitationApi.create({ familyId: family.id, email, relationship });
      setInviteCode(result.invitation.code);
      setStatus(email ? "Invitation sent" : "Invite code generated");
    } catch (error) { setStatus((error as Error).message); }
  };

  const updateRelationship = async (memberId: string, value: string) => {
    if (!family) return;
    await familyApi.setRelationship(family.id, memberId, value);
    setMembers((current) => current.map((member) => member.id === memberId ? { ...member, relationship: value } : member));
  };

  return (
    <section>
      <SectionTitle title={family?.name ?? "Your Family"}>
        <div className="flex flex-wrap gap-2">
          <div className="surface flex items-center gap-2 rounded-md px-4 py-3 text-muted-foreground"><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" className="w-48 bg-transparent text-sm outline-none" /></div>
          {family && ["owner", "admin"].includes(family.role) && <Button primary onClick={() => { setInviteOpen(true); setStatus(""); setInviteCode(""); }}><Plus className="size-4" />Invite family member</Button>}
        </div>
      </SectionTitle>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((member) => <article key={member.id} className="surface flex items-center gap-4 rounded-2xl p-5"><Avatar name={member.name} size="size-14" /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{member.name}</p><p className="truncate text-sm text-muted-foreground">{member.email}</p><select value={member.relationship || ""} onChange={(event) => void updateRelationship(member.id, event.target.value)} className="mt-3 w-full rounded-md border bg-white px-3 py-2 text-sm"><option value="">Choose relationship</option>{relationships.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">{member.role === "owner" ? "Steward" : member.role}</span></article>)}
        {!filtered.length && <div className="surface rounded-2xl p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">No family members found.</div>}
      </div>

      {inviteOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4" onClick={() => setInviteOpen(false)}><div className="surface w-full max-w-lg rounded-3xl p-7" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Invite family member</h2><button onClick={() => setInviteOpen(false)}><X /></button></div><p className="mt-2 text-sm text-muted-foreground">Generate a shareable code or send the invitation directly by email.</p><label className="mt-6 block text-sm font-medium">Their relationship to you<select value={relationship} onChange={(event) => setRelationship(event.target.value)} className="mt-2 w-full rounded-md border bg-white px-4 py-3"><option value="">Choose relationship</option>{relationships.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Email address <span className="font-normal text-muted-foreground">(optional)</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="mt-2 w-full rounded-md border bg-white px-4 py-3" placeholder="relative@example.com" /></label>{status && <p className="mt-4 text-sm text-primary">{status}</p>}{inviteCode && <div className="mt-4 flex items-center justify-between rounded-md bg-[#f5f5f2] p-4"><span className="font-mono text-xl font-bold tracking-[.2em]">{inviteCode}</span><button onClick={() => navigator.clipboard.writeText(inviteCode)} aria-label="Copy invite code"><Copy className="size-4" /></button></div>}<Button primary disabled={!relationship} onClick={invite} className="mt-6 w-full">{email ? <Mail className="size-4" /> : <Plus className="size-4" />}{email ? "Send invitation" : "Generate invite code"}</Button></div></div>}
    </section>
  );
}
