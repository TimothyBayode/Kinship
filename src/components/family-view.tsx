import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Search } from "lucide-react";

import { Avatar, SectionTitle, SelectMenu } from "@/components/kinship-ui";
import { authApi, familyApi, type ApiFamily, type ApiFamilyMember } from "@/lib/api";

const relationships = ["Parent", "Child", "Sibling", "Spouse", "Grandparent", "Grandchild", "Aunt", "Uncle", "Cousin", "Relative"];
const relationshipOptions = relationships.map((value) => ({ value, label: value }));

export function FamilyView() {
  const [families, setFamilies] = useState<ApiFamily[]>([]);
  const [members, setMembers] = useState<ApiFamilyMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
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

  const title = <span className="flex flex-wrap items-center gap-3"><span>{family?.name ?? "Your Family"}</span>{family?.inviteCode && <button type="button" onClick={copyCode} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary/10 px-3 font-mono text-sm font-bold tracking-[.12em] text-primary" title="Copy family invite code">{family.inviteCode}{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button>}</span>;

  return <section>
    <SectionTitle title={title}><div className="surface flex items-center gap-2 rounded-md px-4 py-3 text-muted-foreground"><Search className="size-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" className="w-48 bg-transparent text-sm outline-none" /></div></SectionTitle>
    {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((member) => <article key={member.id} className="surface flex items-center gap-4 rounded-2xl p-5"><Avatar name={member.name} size="size-14" /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{member.name}</p><p className="truncate text-sm text-muted-foreground">{member.email}</p>{member.id === currentUserId ? <div className="mt-3 flex h-14 items-center rounded-md bg-[#f5f5f2] px-4 text-sm font-semibold text-primary">You</div> : <SelectMenu value={member.relationship || ""} options={relationshipOptions} placeholder="Choose relationship" onChange={(value) => void updateRelationship(member.id, value)} className="mt-3" />}</div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">{member.role === "owner" ? "Steward" : member.role}</span></article>)}
      {!filtered.length && <div className="surface rounded-2xl p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">No family members found.</div>}
    </div>
  </section>;
}
