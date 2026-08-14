import { useMemo, useState } from "react";
import { Plus, Search, X, ZoomIn, ZoomOut } from "lucide-react";

import { Avatar, Button, SectionTitle } from "@/components/kinship-ui";
import { family, familyService, members } from "@/lib/types";

const memberPositions = [
  "left-[360px] top-0",
  "left-[760px] top-0",
  "left-[40px] top-[240px]",
  "left-[340px] top-[240px]",
  "left-[640px] top-[240px]",
  "left-[940px] top-[240px]",
  "left-[360px] top-[480px]",
  "left-[680px] top-[480px]",
  "left-[1180px] top-[240px]",
] as const;

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
      <SectionTitle title={family.name}>
        <div className="flex flex-wrap gap-2">
          <div className="surface flex items-center gap-2 rounded-md px-4 py-3 text-muted-foreground">
            <Search className="size-4" />
            <input
              aria-label="Search Members"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Members"
              className="w-48 bg-transparent text-sm outline-none"
            />
          </div>
          <Button className="border-0" onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}>
            <ZoomOut className="size-4" />
          </Button>
          <Button className="border-0" onClick={() => setZoom(Math.min(1.25, zoom + 0.1))}>
            <ZoomIn className="size-4" />
          </Button>
          <Button primary onClick={() => setInvite(true)}>
            <Plus className="size-4" />
            Add Relative
          </Button>
        </div>
      </SectionTitle>
      <div className="mt-8 text-right">
        <span className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="grid-paper surface relative mt-6 min-h-[620px] overflow-auto rounded-[2rem] p-8">
        <span className="absolute right-6 top-5 z-20 rounded-md bg-[#f5f5f2] px-3 py-1.5 text-sm font-semibold text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <div
          className="relative mx-auto h-[640px] w-[1400px]"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 1400 640"
            fill="none"
            aria-hidden="true"
          >
            <g
              stroke="var(--primary)"
              strokeOpacity="0.75"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            >
              <path d="M552 80H760" />
              <path d="M656 80V184Q656 200 640 200H152Q136 200 136 216V240" />
              <path d="M656 200H452Q436 200 436 216V240" />
              <path d="M656 200H720Q736 200 736 216V240" />
              <path d="M656 200H1020Q1036 200 1036 216V240" />
              <path d="M1132 320H1180" />
              <path d="M532 320H640" />
              <path d="M586 320V424Q586 440 570 440H472Q456 440 456 456V480" />
              <path d="M586 440H760Q776 440 776 456V480" />
            </g>
          </svg>
          {members.map((member, index) => {
            const visible =
              member.generation !== 1 ||
              filtered.some((match) => match.id === member.id);

            return visible ? (
              <div
                key={member.id}
                className={`absolute z-10 ${memberPositions[index]} ${member.isInLaw ? "opacity-60" : ""}`}
              >
                <MemberCard member={member} />
              </div>
            ) : null;
          })}
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
              Add Relative
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
      className={`flex h-40 w-48 flex-col items-center rounded-lg bg-[#f5f5f2] p-5 text-center shadow-[0_4px_18px_rgba(23,21,29,0.05)] ${member.selected ? "ring-2 ring-primary/20" : ""}`}
    >
      <Avatar src={member.image} name={member.name} size="size-14" />
      <p className="mt-3 text-sm font-semibold">{member.name}</p>
      <span className="mt-2 inline-flex rounded-full border border-foreground/10 bg-[#f5f5f2] px-3 py-1 text-xs">
        {member.relation}
      </span>
    </div>
  );
}
