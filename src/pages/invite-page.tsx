import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/kinship-ui";
import { invitationApi, type ApiInvitation } from "@/lib/api";

export default function InvitePage() {
  const [params] = useSearchParams(); const navigate = useNavigate();
  const code = params.get("code") ?? "";
  const [invite, setInvite] = useState<ApiInvitation | null>(null); const [error, setError] = useState("");
  useEffect(() => { invitationApi.get(code).then(setInvite).catch((exception: Error) => setError(exception.message)); }, [code]);
  const accept = async () => { try { await invitationApi.accept(code); navigate("/family", { replace: true }); } catch (exception) { setError((exception as Error).message); } };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/25 p-4"><div className="surface w-full max-w-lg rounded-3xl p-8 text-center"><h1 className="text-3xl font-semibold">Family invitation</h1>{invite && <p className="mt-4 text-muted-foreground"><strong>{invite.inviterName}</strong> has invited you to join <strong>{invite.familyName}</strong>.</p>}{error && <p className="mt-4 text-sm text-destructive">{error}</p>}<Button primary disabled={!invite} onClick={accept} className="mt-7 w-full">Join family</Button></div></div>;
}
