export type ApiUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
};

export type ApiFamily = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  role: "owner" | "admin" | "member";
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
    const body = await response.json().catch(() => null) as ApiErrorBody | null;
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
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
  async create(name: string) {
    return (await request<{ family: ApiFamily }>("/api/families", {
      method: "POST",
      body: JSON.stringify({ name }),
    })).family;
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
    const config = await request<{ uploadUrl: string; uploadPreset: string }>("/api/uploads/cloudinary-config");
    const form = new FormData();
    form.set("file", file);
    form.set("upload_preset", config.uploadPreset);
    const response = await fetch(config.uploadUrl, { method: "POST", body: form });
    const result = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
    if (!response.ok || !result?.secure_url) throw new Error(result?.error?.message ?? "Upload failed");
    return result.secure_url;
  },
};
