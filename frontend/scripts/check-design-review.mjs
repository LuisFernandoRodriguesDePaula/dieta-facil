import { chromium, request } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const directory = fileURLToPath(
  new URL("../../.local/design-review/", import.meta.url),
);
const state = JSON.parse(await readFile(directory + "session.json", "utf8"));
const base = new URL(state.url);
if (
  base.protocol !== "https:" ||
  !base.hostname.endsWith(".trycloudflare.com") ||
  state.status !== "running"
)
  throw new Error("Revisão HTTPS temporária indisponível.");
const browser = await chromium.launch({ channel: "msedge" });
const checks = [];
const clients = [];
let failure = false;
const check = (name, ok) => {
  if (!ok) throw new Error(name);
  checks.push(name);
  console.log("OK: " + name);
};
try {
  const anonymous = await request.newContext({
    baseURL: state.url,
    timeout: 30000,
  });
  clients.push(anonymous);
  check("HTTPS e página de entrada", (await anonymous.get("/entrar")).ok());
  check(
    "API exige autenticação",
    (await anonymous.get("/api/me")).status() === 401,
  );
  check(
    "Configuração privada não é servida",
    (
      await anonymous.get("/.local/design-review/review.properties")
    ).status() !== 200,
  );
  for (const [file, role] of [
    ["demo-professional.json", "NUTRITIONIST"],
    ["demo-hypertrophy.json", "CLIENT"],
  ]) {
    const credentials = JSON.parse(await readFile(directory + file, "utf8"));
    if (!credentials.email.endsWith("@example.invalid"))
      throw new Error("Somente contas fictícias são permitidas.");
    const api = await request.newContext({
      baseURL: state.url,
      timeout: 30000,
    });
    clients.push(api);
    const csrfResponse = await api.get("/api/auth/csrf");
    const cookie = csrfResponse.headers()["set-cookie"] ?? "";
    check(
      "Cookie Secure e HttpOnly: " + role,
      /secure/i.test(cookie) && /httponly/i.test(cookie),
    );
    const csrf = await csrfResponse.json();
    const login = await api.post("/api/auth/login", {
      data: { email: credentials.email, password: credentials.password },
      headers: { [csrf.headerName]: csrf.token },
    });
    check("Login HTTPS: " + role, login.ok());
    const profile = await (await api.get("/api/me")).json();
    check("Perfil correto: " + role, profile.role === role);
    let clientId;
    if (role === "NUTRITIONIST") {
      const links = await (await api.get("/api/professional/clients")).json();
      check(
        "Vínculo fictício ativo",
        links.length === 1 && links[0].status === "ACTIVE",
      );
      clientId = links[0].clientId;
    } else {
      const schedule = await (await api.get("/api/schedule")).json();
      check("Cinco refeições fictícias", schedule.meals.length === 5);
      check(
        "Estoque bloqueado no Básico",
        (await api.get("/api/inventory")).status() === 403,
      );
    }
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({
        baseURL: state.url,
        storageState: await api.storageState(),
        viewport: { width, height: width < 700 ? 1400 : 1000 },
        locale: "pt-BR",
      });
      try {
        const page = await context.newPage();
        const paths =
          role === "NUTRITIONIST"
            ? ["/profissional", "/profissional/clientes/" + clientId]
            : ["/conta/dieta", "/conta/resultados"];
        for (const path of paths) {
          await page.goto(path);
          await page.getByRole("heading", { level: 1 }).waitFor();
          check(
            "Tela autenticada " + role + " " + path.split("/")[1] + " " + width,
            !page.url().includes("/entrar"),
          );
          check(
            "Sem rolagem lateral " + role + " " + path + " " + width,
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          if (path === "/profissional")
            await page.getByRole("article").first().waitFor();
          else if (path.startsWith("/profissional/clientes/"))
            await page
              .getByRole("button", { name: "Dieta ativa", exact: true })
              .waitFor();
          else if (path === "/conta/dieta")
            await page.getByRole("article").first().waitFor();
          else
            await page.locator(".care-evaluations article").first().waitFor();
          await page.evaluate(() => document.fonts.ready);
          const screen = path.startsWith("/profissional/clientes/")
            ? "acompanhamento"
            : path.split("/").pop();
          await page.screenshot({
            path:
              directory +
              "screen-" +
              role +
              "-" +
              screen +
              "-" +
              width +
              ".png",
            fullPage: false,
          });
        }
        await page.screenshot({
          path: directory + "review-" + role + "-" + width + ".png",
          fullPage: true,
        });
      } finally {
        await context.close();
      }
    }
    const exitToken = await (await api.get("/api/auth/csrf")).json();
    check(
      "Logout HTTPS: " + role,
      (
        await api.post("/api/auth/logout", {
          headers: { [exitToken.headerName]: exitToken.token },
        })
      ).status() === 204,
    );
  }
} catch {
  failure = true;
  console.error(
    "A verificação pública não concluiu. Consulte as verificações já aprovadas; credenciais não são exibidas.",
  );
  process.exitCode = 1;
} finally {
  await Promise.all(clients.map((c) => c.dispose()));
  await browser.close();
  await mkdir(directory, { recursive: true });
  await writeFile(
    directory + "public-check.json",
    JSON.stringify(
      { checkedAt: new Date().toISOString(), passed: !failure, checks },
      null,
      2,
    ) + "\n",
  );
}
