export type ApiUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  gender: string;
  phone: string;
  birthday: string;
  profileComplete: boolean;
};

export type ApiFamily = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  role: "owner" | "admin" | "member";
  pictureUrl: string;
  inviteCode: string;
};

export type ApiFamilyMember = {
  id: string;
  name: string;
  email: string;
  gender: string;
  birthday: string;
  role: "owner" | "admin" | "member";
  relationship: string;
};

export type ApiInvitation = {
  code: string;
  familyId: string;
  familyName: string;
  inviterName: string;
  invitedEmail: string;
  relationship: string;
  expiresAt: string;
};

export type ApiMemory = {
  id: string;
  familyId: string;
  title: string;
  description: string;
  memoryDate: string;
  createdBy: string;
  createdAt: string;
  photos: string[];
};

export type ApiEvent = {
  id: string;
  familyId: string;
  title: string;
  description: string;
  category: "Birthday" | "Gathering" | "Anniversary" | "Other";
  eventDate: string;
  location: string;
  imageUrl: string;
  createdBy: string;
  createdAt: string;
};

export type ApiFile = {
  id: string;
  familyId: string;
  name: string;
  description: string;
  mimeType: string;
  fileType: "PDF" | "Audio" | "Spreadsheet" | "Document" | "Image" | "Video" | "Other";
  sizeBytes: number;
  url: string;
  uploadedBy: string;
  uploaderName: string;
  createdAt: string;
};

type ApiErrorBody = { error?: { message?: string } };

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: init?.body
      ? { "content-type": "application/json", ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}), ...init.headers }
      : { ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}), ...init?.headers },
  });

  if (!response.ok) {
    const text = await response.text();
    const body = (() => {
      try { return JSON.parse(text) as ApiErrorBody; } catch { return null; }
    })();
    throw new Error(body?.error?.message ?? (text.trim() || `Request failed (${response.status})`));
  }

  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const authApi = {
  sync() {
    return request<{ user: ApiUser }>("/api/auth/sync", { method: "POST" });
  },
  async signUp(name: string, email: string, password: string) {
    await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    return this.signIn(email, password);
  },
  async signIn(email: string, password: string) {
    return (await request<{ user: ApiUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })).user;
  },
  async me() {
    return (await request<{ user: ApiUser }>("/api/auth/me")).user;
  },
  logout() {
    return request<void>("/api/auth/logout", { method: "POST" });
  },
  verifyEmail(token: string) {
    return request<void>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
};

export const familyApi = {
  async list() {
    return (await request<{ families: ApiFamily[] }>("/api/families")).families;
  },
  async create(name: string, pictureUrl = "") {
    return (await request<{ family: ApiFamily }>("/api/families", {
      method: "POST",
      body: JSON.stringify({ name, pictureUrl }),
    })).family;
  },
  async members(familyId: string) {
    return (await request<{ members: ApiFamilyMember[] }>(`/api/families/${familyId}/members`)).members;
  },
  setRelationship(familyId: string, memberId: string, relationship: string) {
    return request<void>(`/api/families/${familyId}/members/${memberId}/relationship`, { method: "PATCH", body: JSON.stringify({ relationship }) });
  },
  join(code: string) {
    return request<{ familyId: string }>("/api/families/join", { method: "POST", body: JSON.stringify({ code }) });
  },
  async inviteCode(familyId: string) {
    return (await request<{ inviteCode: string }>(`/api/families/${familyId}/invite-code`, { method: "POST" })).inviteCode;
  },
};

export const profileApi = {
  async update(profile: { gender: string; phone: string; birthday: string }) {
    return (await request<{ user: ApiUser }>("/api/profile", { method: "PATCH", body: JSON.stringify(profile) })).user;
  },
};

export const memoryApi = {
  async list(familyId: string) {
    return (await request<{ memories: ApiMemory[] }>(`/api/memories?familyId=${encodeURIComponent(familyId)}`)).memories;
  },
  async create(input: { familyId: string; title: string; description: string; memoryDate: string; photos: string[] }) {
    return (await request<{ memory: ApiMemory }>("/api/memories", { method: "POST", body: JSON.stringify(input) })).memory;
  },
  async addPhotos(memoryId: string, familyId: string, photos: string[]) {
    return (await request<{ memory: ApiMemory }>(`/api/memories/${memoryId}/photos`, { method: "POST", body: JSON.stringify({ familyId, photos }) })).memory;
  },
};

export const eventApi = {
  async list(familyId: string) {
    return (await request<{ events: ApiEvent[] }>(`/api/events?familyId=${encodeURIComponent(familyId)}`)).events;
  },
  async create(input: Omit<ApiEvent, "id" | "createdBy" | "createdAt">) {
    return (await request<{ event: ApiEvent }>("/api/events", { method: "POST", body: JSON.stringify(input) })).event;
  },
};

export const fileApi = {
  async list(familyId: string) {
    return (await request<{ files: ApiFile[] }>(`/api/files?familyId=${encodeURIComponent(familyId)}`)).files;
  },
  async create(input: Omit<ApiFile, "id" | "uploadedBy" | "uploaderName" | "createdAt">) {
    return (await request<{ file: ApiFile }>("/api/files", { method: "POST", body: JSON.stringify(input) })).file;
  },
  async rename(fileId: string, familyId: string, name: string) {
    return (await request<{ file: ApiFile }>(`/api/files/${fileId}`, { method: "PATCH", body: JSON.stringify({ familyId, name }) })).file;
  },
};

export const invitationApi = {
  async create(input: { familyId: string; email: string; relationship: string }) {
    return request<{ invitation: ApiInvitation; delivery: { delivered: boolean; previewUrl?: string } }>("/api/invitations", { method: "POST", body: JSON.stringify(input) });
  },
  async get(code: string) {
    return (await request<{ invitation: ApiInvitation }>(`/api/invitations/${encodeURIComponent(code)}`)).invitation;
  },
  accept(code: string) {
    return request<{ familyId: string }>(`/api/invitations/${encodeURIComponent(code)}/accept`, { method: "POST" });
  },
};

export const aiApi = {
  chat(familyId: string, question: string) {
    return request<{ content: string; sources: Array<{ title: string; content: string; sourceId: string }> }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ familyId, question }),
    });
  },
};

export const uploadApi = {
  async upload(file: File) {
    return (await this.uploadWithMetadata(file)).url;
  },
  async uploadWithMetadata(file: File, onProgress?: (percent: number) => void) {
    const config = await request<{ uploadUrl: string; uploadPreset: string }>("/api/uploads/cloudinary-config");
    const form = new FormData();
    form.set("file", file);
    form.set("upload_preset", config.uploadPreset);
    const result = await new Promise<{ secure_url?: string; bytes?: number; resource_type?: string; format?: string; error?: { message?: string } }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", config.uploadUrl);
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      xhr.addEventListener("load", () => {
        let body: { secure_url?: string; bytes?: number; resource_type?: string; format?: string; error?: { message?: string } };
        try { body = JSON.parse(xhr.responseText) as typeof body; } catch { return reject(new Error("Upload returned an invalid response")); }
        if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(body.error?.message ?? "Upload failed"));
        onProgress?.(100);
        resolve(body);
      });
      xhr.addEventListener("error", () => reject(new Error("Upload failed due to a network error")));
      xhr.send(form);
    });
    if (!result.secure_url) throw new Error(result.error?.message ?? "Upload failed");
    return { url: result.secure_url, sizeBytes: result.bytes ?? file.size, resourceType: result.resource_type ?? "raw", format: result.format ?? "" };
  },
};
