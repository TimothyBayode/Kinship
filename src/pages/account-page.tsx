import { useEffect, useRef, useState } from "react";
import { Camera, Save } from "lucide-react";

import { Avatar, Button, SectionTitle } from "@/components/kinship-ui";
import { authApi, profileApi, uploadApi, type ApiUser } from "@/lib/api";

const fieldClass = "mt-2 h-14 w-full rounded-md border-0 bg-[#f5f5f2] px-4 outline-none focus:border-0 focus:outline-none focus:ring-0";

export default function AccountPage() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authApi.sync().then(({ user: current }) => {
      setUser(current);
      setName(current.name);
      setPhone(current.phone);
      setAvatarUrl(current.avatarUrl);
    }).catch((exception: Error) => setError(exception.message)).finally(() => setLoading(false));
  }, []);

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);
      setError("");
      setNotice("");
      setAvatarUrl(await uploadApi.upload(file));
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      const updated = await profileApi.update({ name, phone, avatarUrl });
      setUser(updated);
      setNotice("Account settings saved.");
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="surface grid min-h-72 place-items-center rounded-2xl text-sm text-muted-foreground">Loading account...</div>;
  if (!user) return <p role="alert" className="text-sm text-destructive">{error || "Account details could not be loaded."}</p>;

  return <section>
    <SectionTitle title="Account Settings" />
    <div className="mt-8 max-w-2xl rounded-2xl bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar src={avatarUrl || undefined} name={name || user.name} size="size-24" />
        <div>
          <input ref={imageInput} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.target.value = ""; }} />
          <Button disabled={uploading} onClick={() => imageInput.current?.click()}><Camera className="size-4" />{uploading ? "Uploading..." : "Change profile picture"}</Button>
          <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, or WebP.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">Full name<input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></label>
        <label className="text-sm font-medium">Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} /></label>
        <label className="text-sm font-medium text-muted-foreground">Gender<input value={formatGender(user.gender)} disabled className={`${fieldClass} cursor-not-allowed opacity-65`} /></label>
        <label className="text-sm font-medium text-muted-foreground sm:col-span-2">Email<input value={user.email} disabled className={`${fieldClass} cursor-not-allowed opacity-65`} /></label>
      </div>

      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-5 text-sm font-medium text-primary">{notice}</p>}
      <Button primary disabled={saving || uploading || name.trim().length < 2 || phone.trim().length < 7} onClick={save} className="mt-7 min-h-14 w-full"><Save className="size-4" />{saving ? "Saving..." : "Save changes"}</Button>
    </div>
  </section>;
}

function formatGender(value: string) {
  return value ? value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ") : "Not specified";
}
