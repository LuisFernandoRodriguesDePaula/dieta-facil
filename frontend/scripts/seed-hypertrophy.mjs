import { request } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const directory = fileURLToPath(new URL("../../.local/", import.meta.url));
const credentialsPath = fileURLToPath(
  new URL("../../.local/demo-hypertrophy.json", import.meta.url),
);
await mkdir(directory, { recursive: true });
let credentials;
try {
  credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const client = await request.newContext({ baseURL: "http://127.0.0.1:5173" });
async function post(path, data) {
  const tokenResponse = await client.get("/api/auth/csrf");
  const csrf = await tokenResponse.json();
  const response = await client.post(path, {
    data,
    headers: { [csrf.headerName]: csrf.token },
  });
  if (!response.ok())
    throw new Error("Falha em " + path + ": HTTP " + response.status());
  return response.json();
}
try {
  if (!credentials) {
    credentials = {
      name: "Demo Hipertrofia 82 kg",
      email: "hipertrofia-" + randomUUID().slice(0, 8) + "@example.invalid",
      password: "Demo!" + randomBytes(18).toString("base64url"),
      timezone: "America/Sao_Paulo",
    };
    await post("/api/auth/register", credentials);
    await writeFile(
      credentialsPath,
      JSON.stringify(credentials, null, 2) + "\n",
      { mode: 0o600 },
    );
  }
  await post("/api/auth/login", {
    email: credentials.email,
    password: credentials.password,
  });
  await post("/api/onboarding/scenario?type=hypertrophy", {});
  const plan = await (await client.get("/api/plan")).json();
  if (plan.meals?.length !== 5)
    throw new Error(
      "A conta não contém o cenário de cinco refeições esperado.",
    );
  const stock = await (await client.get("/api/inventory")).json();
  console.log(
    JSON.stringify({
      email: credentials.email,
      credentialsFile: credentialsPath,
      meals: plan.meals.length,
      lots: stock.lots.length,
    }),
  );
} finally {
  await client.dispose();
}
