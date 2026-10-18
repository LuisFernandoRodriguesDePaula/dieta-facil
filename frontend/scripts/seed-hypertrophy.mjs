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
async function post(path, data, method = "POST") {
  const tokenResponse = await client.get("/api/auth/csrf");
  const csrf = await tokenResponse.json();
  const response = await client.fetch(path, {
    method,
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
  // Only adds missing illustrative alternatives to this separate fictional account.
  // Existing rules, plans, quantities and stock remain untouched.
  if (
    !credentials.email.startsWith("hipertrofia-") ||
    !credentials.email.endsWith("@example.invalid")
  )
    throw new Error("Use somente a conta fictícia criada por este script.");
  const schedule = await (await client.get("/api/schedule")).json();
  const refs = stock.lots;
  let added = 0;
  for (const [mealName, sourceName, targetName, quantity] of [
    ["Café da manhã", "Ovos", "Peito de frango", "90"],
    ["Almoço", "Peito de frango", "Carne bovina magra", "90"],
    ["Jantar", "Carne bovina magra", "Peito de frango", "90"],
  ]) {
    const meal = schedule.meals.find(
      (m) => m.name === mealName && m.status === "PENDING",
    );
    const index = meal?.items.findIndex((i) => i.name === sourceName) ?? -1;
    const target = refs.find(
      (l) => l.name === targetName && l.basis === "COOKED",
    );
    if (!meal || index < 0 || !target) continue;
    const options = await (
      await client.get(
        `/api/plan/substitutions?date=${schedule.date}&mealId=${meal.mealId}&itemIndex=${index}`,
      )
    ).json();
    if (options.version !== 0) continue;
    await post(
      "/api/plan/substitutions",
      {
        date: schedule.date,
        mealId: meal.mealId,
        itemIndex: index,
        fingerprint: options.fingerprint,
        version: 0,
        enabled: true,
        alternatives: [
          { foodId: target.foodId, quantity, unit: "G", basis: "COOKED" },
        ],
      },
      "PUT",
    );
    added++;
  }
  console.log(
    JSON.stringify({
      email: credentials.email,
      credentialsFile: credentialsPath,
      meals: plan.meals.length,
      lots: stock.lots.length,
      illustrativeRulesAdded: added,
    }),
  );
} finally {
  await client.dispose();
}
