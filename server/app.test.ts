import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { MemoryRepository } from "./repositories/memory.js";

const config = loadConfig({
  NODE_ENV: "test",
  APP_ORIGIN: "http://127.0.0.1:5173",
  PASSWORD_PEPPER: "test-pepper-with-at-least-thirty-two-characters",
  DATA_PROVIDER: "memory",
});

test("auth, cookie sessions, families, and AI authorization", async () => {
  const app = await buildApp(config, new MemoryRepository());
  test.after(() => app.close());

  const registration = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    headers: { origin: config.APP_ORIGIN, "content-type": "application/json" },
    payload: { name: "Timothy Bayode", email: "timothy@example.com", password: "Admin123!" },
  });
  assert.equal(registration.statusCode, 201);
  assert.equal(registration.json().user.email, "timothy@example.com");
  assert.match(registration.json().emailDelivery.previewUrl, /verify=/);

  const duplicate = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    headers: { origin: config.APP_ORIGIN, "content-type": "application/json" },
    payload: { name: "Timothy Bayode", email: "timothy@example.com", password: "Admin123!" },
  });
  assert.equal(duplicate.statusCode, 409);

  const invalidLogin = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    headers: { origin: config.APP_ORIGIN, "content-type": "application/json" },
    payload: { email: "timothy@example.com", password: "WrongPass!" },
  });
  assert.equal(invalidLogin.statusCode, 401);

  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    headers: { origin: config.APP_ORIGIN, "content-type": "application/json" },
    payload: { email: "timothy@example.com", password: "Admin123!" },
  });
  assert.equal(login.statusCode, 200);
  const setCookie = login.headers["set-cookie"];
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const cookie = cookieHeader?.split(";")[0];
  assert.ok(cookie?.startsWith(`${config.SESSION_COOKIE_NAME}=`));
  assert.match(cookieHeader ?? "", /HttpOnly/);
  assert.match(cookieHeader ?? "", /SameSite=Strict/);

  const me = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie } });
  assert.equal(me.statusCode, 200);
  assert.equal(me.json().user.name, "Timothy Bayode");

  const createFamily = await app.inject({
    method: "POST",
    url: "/api/families",
    headers: { cookie, origin: config.APP_ORIGIN, "content-type": "application/json" },
    payload: { name: "Bayode Family" },
  });
  assert.equal(createFamily.statusCode, 201);
  const familyId = createFamily.json().family.id as string;

  const listFamilies = await app.inject({ method: "GET", url: "/api/families", headers: { cookie } });
  assert.equal(listFamilies.statusCode, 200);
  assert.deepEqual(listFamilies.json().families.map((family: { role: string }) => family.role), ["owner"]);

  const chat = await app.inject({
    method: "POST",
    url: "/api/ai/chat",
    headers: { cookie, origin: config.APP_ORIGIN, "content-type": "application/json" },
    payload: { familyId, question: "What stories are preserved?" },
  });
  assert.equal(chat.statusCode, 200);
  assert.match(chat.json().content, /Gemini is not configured/);

  const logout = await app.inject({ method: "POST", url: "/api/auth/logout", headers: { cookie, origin: config.APP_ORIGIN } });
  assert.equal(logout.statusCode, 204);
  const afterLogout = await app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie } });
  assert.equal(afterLogout.statusCode, 401);
});

test("rejects state-changing requests from another origin", async () => {
  const app = await buildApp(config, new MemoryRepository());
  test.after(() => app.close());
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    headers: { origin: "https://attacker.example", "content-type": "application/json" },
    payload: { name: "Test User", email: "test@example.com", password: "Admin123!" },
  });
  assert.equal(response.statusCode, 403);
});
