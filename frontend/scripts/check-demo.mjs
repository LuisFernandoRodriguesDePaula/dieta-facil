import { request } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(new URL("../../.local/", import.meta.url));
const baseURL = "http://127.0.0.1:5173";
const contexts = [];
const authenticated = [];
const checks = [];
class DemoCheckError extends Error {}
function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
  console.log(`${condition ? "OK" : "FALHOU"}: ${name}`);
  if (!condition) throw new DemoCheckError(name);
}
async function context() {
  const client = await request.newContext({ baseURL, timeout: 10000 });
  contexts.push(client);
  return client;
}
async function get(client, path) {
  const response = await client.get(path);
  if (!response.ok())
    throw new DemoCheckError(
      `Consulta indisponível: ${path} (HTTP ${response.status()})`,
    );
  return response.json();
}
async function login(file, prefix, role) {
  const credentials = JSON.parse(await readFile(directory + file, "utf8"));
  if (
    !credentials.email?.startsWith(prefix) ||
    !credentials.email.endsWith("@example.invalid")
  )
    throw new DemoCheckError(
      "Verificação restrita às contas fictícias preparadas pelo projeto.",
    );
  const client = await context();
  const csrf = await get(client, "/api/auth/csrf");
  const response = await client.post("/api/auth/login", {
    data: { email: credentials.email, password: credentials.password },
    headers: { [csrf.headerName]: csrf.token },
  });
  if (response.ok()) authenticated.push(client);
  check(`Login do perfil ${role}`, response.ok());
  const profile = await get(client, "/api/me");
  check(`Perfil ${role} correto`, profile.role === role);
  return { client, profile };
}
let failure;
try {
  const anonymous = await context();
  check("Interface local acessível", (await anonymous.get("/entrar")).ok());
  check(
    "API saudável",
    (await get(anonymous, "/actuator/health")).status === "UP",
  );
  check(
    "Dados pessoais exigem login",
    (await anonymous.get("/api/me")).status() === 401,
  );
  const client = await login("demo-hypertrophy.json", "hipertrofia-", "CLIENT");
  const professional = await login(
    "demo-professional.json",
    "nutricionista-",
    "NUTRITIONIST",
  );
  const links = await get(professional.client, "/api/professional/clients");
  check(
    "Vínculo fictício ativo",
    links.some(
      (l) => l.clientId === client.profile.id && l.status === "ACTIVE",
    ),
  );
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: client.profile.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((p) => p.type === type).value;
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  const schedule = await get(client.client, "/api/schedule?date=" + date);
  check("Dieta fictícia possui refeições hoje", schedule.meals.length > 0);
  const prefix = "/api/professional/clients/" + client.profile.id;
  const prescribed = await get(
    professional.client,
    prefix + "/schedule?date=" + date,
  );
  check(
    "Profissional consulta a mesma dieta",
    JSON.stringify(prescribed.meals) === JSON.stringify(schedule.meals),
  );
  const results = await get(client.client, "/api/results");
  const professionalResults = await get(
    professional.client,
    prefix + "/results",
  );
  check(
    "Histórico fictício disponível aos dois perfis",
    results.length > 0 &&
      JSON.stringify(results) === JSON.stringify(professionalResults),
  );
  const features = await get(client.client, "/api/features");
  check(
    "Demonstração do cliente no Básico sem baixa de estoque",
    features.tier === "BASIC" && !features.inventoryEnabled,
  );
  check(
    "Estoque bloqueado no Básico",
    (await client.client.get("/api/inventory")).status() === 403,
  );
  check(
    "Cliente não acessa lista profissional",
    (await client.client.get("/api/professional/clients")).status() === 403,
  );
  console.log(
    "Demonstração local pronta para conferência. Nenhuma dieta, avaliação ou quantidade foi alterada.",
  );
} catch (error) {
  failure =
    error.code === "ENOENT"
      ? "Faltam contas fictícias locais. Consulte docs/ENTREGA_V1.md."
      : error instanceof DemoCheckError
        ? error.message
        : "Não foi possível concluir. Confira os servidores locais e os arquivos de demonstração; detalhes sensíveis não são exibidos.";
  console.error("Verificação incompleta: " + failure);
  process.exitCode = 1;
}
{
  try {
    for (const client of authenticated) {
      const csrf = await get(client, "/api/auth/csrf");
      const response = await client.post("/api/auth/logout", {
        headers: { [csrf.headerName]: csrf.token },
      });
      if (!response.ok())
        throw new DemoCheckError(
          "Não foi possível encerrar uma sessão de conferência.",
        );
    }
  } catch {
    failure =
      "Não foi possível encerrar todas as sessões de conferência. Reiniciar a API encerra as sessões locais.";
    console.error(failure);
    process.exitCode = 1;
  }
  await Promise.all(contexts.map((c) => c.dispose()));
  await mkdir(directory, { recursive: true });
  await writeFile(
    directory + "demo-readiness.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        ready: !failure,
        checks,
        ...(failure ? { failure } : {}),
      },
      null,
      2,
    ) + "\n",
  );
}
