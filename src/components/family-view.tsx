import { useMemo, useState } from "react";
import { Plus, Search, X, ZoomIn, ZoomOut } from "lucide-react";

import { Avatar, Button, SectionTitle } from "@/components/kinship-ui";
import { family, familyService, members } from "@/lib/types";

export function FamilyView() {
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const filtered = useMemo(
    () =>
      members.filter((member) =>
        member.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  const send = async () => {
    try {
      await familyService.invite(email);
      setStatus("Invitation sent");
      setEmail("");
    } catch (error) {
      setStatus((error as Error).message);
    }
  };

  return (
    <section>
      <SectionTitle title={family.name} eyebrow="Your family tree">
        <div className="flex gap-2">
          <Button onClick={() => setZoom(Math.max(0.75, zoom - 0.1))}>
            <ZoomOut className="size-4" />
          </Button>
          <Button onClick={() => setZoom(Math.min(1.25, zoom + 0.1))}>
            <ZoomIn className="size-4" />
          </Button>
          <Button primary onClick={() => setInvite(true)}>
            <Plus className="size-4" />
            Add relative
          </Button>
        </div>
      </SectionTitle>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-muted-foreground">
          <Search className="size-4" />
          <input
            aria-label="Search members"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
            className="w-48 bg-transparent text-sm outline-none"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {members.length} members
        </span>
      </div>
      <div className="grid-paper surface mt-6 min-h-[620px] overflow-auto rounded-[2rem] p-8">
        <div
          className="mx-auto flex min-w-[760px] flex-col items-center gap-16 py-10"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          <div className="flex gap-5">
            <MemberCard member={members[0]} />
            <MemberCard member={members[1]} />
          </div>
          <div className="h-8 w-px bg-muted-foreground/40" />
          <div className="flex gap-4 sm:gap-6">
            {filtered
              .filter((member) => member.generation === 1)
              .map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
          </div>
          <div className="h-8 w-px bg-muted-foreground/40" />
          <div className="flex gap-5">
            {members
              .filter((member) => member.generation === 2)
              .map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
          </div>
        </div>
      </div>

      {invite && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4"
          onClick={() => setInvite(false)}
        >
          <div
            className="surface w-full max-w-lg rounded-3xl p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">New relationship</h2>
              <button className="rounded-md" onClick={() => setInvite(false)} aria-label="Close">
                <X />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Invite someone to join your family archive.
            </p>
            <label className="mt-7 block text-sm font-medium">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
                placeholder="hey@example.com"
              />
            </label>
            {status && <p className="mt-3 text-sm text-primary">{status}</p>}
            <Button primary onClick={send} className="mt-6 w-full">
              <Plus className="size-4" />
              Add relative
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function MemberCard({ member }: { member: (typeof members)[number] }) {
  return (
    <div
      className={`w-40 rounded-2xl border bg-card p-4 text-center shadow-sm ${member.selected ? "border-primary ring-2 ring-primary/20" : ""}`}
    >
      <Avatar src={member.image} name={member.name} size="size-14" />
      <p className="mt-3 text-sm font-semibold">{member.name}</p>
      <span className="mt-2 inline-flex rounded-full border bg-background px-3 py-1 text-xs">
        {member.relation}
      </span>
    </div>
  );
}
