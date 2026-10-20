import { request } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const review = process.env.DIETA_DESIGN_REVIEW === "1";
const directory = fileURLToPath(
  new URL(
    review ? "../../.local/design-review/" : "../../.local/",
    import.meta.url,
  ),
);
const baseURL = review ? "http://127.0.0.1:8081" : "http://127.0.0.1:5173";
await mkdir(directory, { recursive: true });
async function call(client, path, data, method = "POST") {
  const csrf = await (await client.get("/api/auth/csrf")).json();
  const response = await client.fetch(path, {
    method,
    data,
    headers: { [csrf.headerName]: csrf.token },
  });
  if (!response.ok())
    throw new Error(`Falha em ${path}: HTTP ${response.status()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
async function account(file, role, prefix, name) {
  const client = await request.newContext({ baseURL });
  let credentials;
  try {
    credentials = JSON.parse(await readFile(directory + file, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (!credentials) {
    credentials = {
      name,
      email: prefix + randomUUID().slice(0, 8) + "@example.invalid",
      password: "Demo!" + randomBytes(18).toString("base64url"),
      timezone: "America/Sao_Paulo",
      role,
    };
    await call(client, "/api/auth/register", credentials);
    await writeFile(
      directory + file,
      JSON.stringify(credentials, null, 2) + "\n",
      { mode: 0o600 },
    );
  }
  if (
    !credentials.email.startsWith(prefix) ||
    !credentials.email.endsWith("@example.invalid")
  )
    throw new Error("Use somente contas fictícias criadas pelo script.");
  await call(client, "/api/auth/login", {
    email: credentials.email,
    password: credentials.password,
  });
  const profile = await (await client.get("/api/me")).json();
  if (profile.role !== role)
    throw new Error("O perfil da conta fictícia não corresponde ao cenário.");
  return { client, credentials, profile };
}
const client = await account(
  "demo-hypertrophy.json",
  "CLIENT",
  "hipertrofia-",
  "Demo Hipertrofia 82 kg",
);
const professional = await account(
  "demo-professional.json",
  "NUTRITIONIST",
  "nutricionista-",
  "Nutricionista Demo",
);
try {
  await call(client.client, "/api/onboarding/scenario?type=hypertrophy", {});
  const features = await (await client.client.get("/api/features")).json();
  if (features.tier !== "BASIC")
    await call(client.client, "/api/demo/features", { tier: "BASIC" });
  let links = await (
    await professional.client.get("/api/professional/clients")
  ).json();
  let link = links.find(
    (l) => l.email === client.credentials.email && l.status === "ACTIVE",
  );
  if (!link) {
    const otherActive = (
      await (await client.client.get("/api/care")).json()
    ).some((l) => l.status === "ACTIVE");
    if (otherActive)
      throw new Error(
        "A conta fictícia já possui outro vínculo ativo; nenhum vínculo foi substituído.",
      );
    links = await call(professional.client, "/api/professional/clients", {
      email: client.credentials.email,
      name: client.credentials.name,
    });
    link = links.find(
      (l) => l.email === client.credentials.email && l.status === "PENDING",
    );
    await call(client.client, `/api/care/${link.id}/accept`, {});
  }
  const prefix = "/api/professional/clients/" + client.profile.id;
  const schedule = await (
    await professional.client.get(
      prefix +
        "/schedule?date=" +
        new Intl.DateTimeFormat("en-CA", {
          timeZone: client.profile.timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
    )
  ).json();
  const catalog = await (
    await professional.client.get(prefix + "/foods?size=100")
  ).json();
  let rulesAdded = 0;
  for (const [mealName, sourceName, targetName] of [
    ["Café da manhã", "Ovos", "Peito de frango"],
    ["Almoço", "Peito de frango", "Carne bovina magra"],
    ["Jantar", "Carne bovina magra", "Peito de frango"],
  ]) {
    const meal = schedule.meals.find(
      (m) => m.name === mealName && m.status === "PENDING",
    );
    const index = meal?.items.findIndex((i) => i.name === sourceName) ?? -1;
    const target = catalog.items.find((f) => f.name === targetName);
    if (!meal || index < 0 || !target) continue;
    const options = await (
      await professional.client.get(
        `${prefix}/plan/substitutions?date=${schedule.date}&mealId=${meal.mealId}&itemIndex=${index}`,
      )
    ).json();
    if (options.version !== 0) continue;
    await call(
      professional.client,
      prefix + "/plan/substitutions",
      {
        date: schedule.date,
        mealId: meal.mealId,
        itemIndex: index,
        fingerprint: options.fingerprint,
        version: 0,
        enabled: true,
        alternatives: [
          { foodId: target.id, quantity: "90", unit: "G", basis: "COOKED" },
        ],
      },
      "PUT",
    );
    rulesAdded++;
  }
  const evaluations = await (
    await professional.client.get(prefix + "/results")
  ).json();
  const date = new Date(schedule.date + "T12:00:00Z");
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  for (const [observed, weight] of [
    [date.toISOString().slice(0, 10), 83.2],
    [schedule.date, 82],
  ]) {
    if (evaluations.some((e) => e.date.slice(0, 7) === observed.slice(0, 7)))
      continue;
    await call(
      professional.client,
      prefix + "/results",
      {
        date: observed,
        version: 0,
        weight,
        height: 180,
        waist: null,
        ...(review
          ? {
              bodyFat: observed === schedule.date ? 18.5 : 19.1,
              arm: 35,
              thigh: 55,
              calf: 37,
              hip: 95,
            }
          : {}),
        goal: "Exemplo fictício de acompanhamento",
        notes:
          "Dados exclusivamente ilustrativos para demonstrar a avaliação mensal. Não correspondem a uma avaliação clínica.",
      },
      "PUT",
    );
  }
  console.log(
    JSON.stringify({
      clientEmail: client.credentials.email,
      professionalEmail: professional.credentials.email,
      clientCredentials: directory + "demo-hypertrophy.json",
      professionalCredentials: directory + "demo-professional.json",
      meals: schedule.meals.length,
      illustrativeRulesAdded: rulesAdded,
    }),
  );
} finally {
  await client.client.dispose();
  await professional.client.dispose();
}
