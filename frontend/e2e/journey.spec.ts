import AxeBuilder from "@axe-core/playwright";
import { readFile, readdir, unlink } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
async function post(
  request: APIRequestContext,
  path: string,
  data: unknown,
  key?: string,
) {
  const csrf = await (await request.get("/api/auth/csrf")).json();
  return request.post(path, {
    data,
    headers: {
      [csrf.headerName]: csrf.token,
      ...(key ? { "Idempotency-Key": key } : {}),
    },
  });
}
async function account(page: Page, role = "NUTRITIONIST", premium = true) {
  const email = "browser-" + crypto.randomUUID() + "@example.invalid";
  const created = await post(page.request, "/api/auth/register", {
    name: "Pessoa Demo",
    email,
    password: "Senha-ficticia-2026!",
    timezone: "America/Sao_Paulo",
    role,
  });
  expect(created.status()).toBe(201);
  const logged = await post(page.request, "/api/auth/login", {
    email,
    password: "Senha-ficticia-2026!",
  });
  expect(logged.status()).toBe(200);
  const profile = await logged.json();
  if (premium) {
    expect(
      (
        await post(page.request, "/api/demo/features", { tier: "PREMIUM" })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await post(page.request, "/api/features/inventory", {
          enabled: true,
          reviewed: true,
        })
      ).ok(),
    ).toBeTruthy();
  }
  return { email, id: profile.id };
}
async function screenshot(page: Page, name: string, fullPage = true) {
  await mkdir("../.local/screenshots", { recursive: true });
  await page.screenshot({
    path: "../.local/screenshots/" + name + ".png",
    fullPage,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
}
test("jornada demonstrável: cenário, consumo, preparo, compras e alertas", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await account(page);
  await page.goto("/conta/inicio");
  await page.getByRole("button", { name: "Carregar cenário fictício" }).click();
  await page.getByRole("button", { name: "Confirmar carga fictícia" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cenário fictício carregado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cobertura até a próxima compra" }),
  ).toBeVisible();
  await screenshot(page, "painel-" + info.project.name);
  const before = await (await page.request.get("/api/inventory")).json();
  expect(before.lots).toHaveLength(7);
  await page.goto("/conta/agenda");
  await page
    .getByRole("button", { name: "Confirmar consumo", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirmar e baixar estoque" })
    .click();
  await expect(page.getByText("Consumida", { exact: true })).toBeVisible();
  const consumed = await (await page.request.get("/api/inventory")).json();
  expect(
    consumed.lots.find(
      (l: { name: string; basis: string }) =>
        l.name === "Ovos" && l.basis === "AS_SOLD",
    ).quantity,
  ).toBe("6");
  await screenshot(page, "agenda-" + info.project.name);
  await page.goto("/conta/preparo");
  await page
    .getByRole("combobox", { name: "Alimento", exact: true })
    .selectOption({ label: "Arroz" });
  await page.getByLabel("Quantidade crua utilizada").fill("200");
  await page.getByLabel("Rendimento preparado").fill("600");
  await page
    .getByRole("button", { name: "Confirmar preparo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Operação registrada." }),
  ).toBeVisible();
  const prepared = await (await page.request.get("/api/inventory")).json();
  expect(
    prepared.lots.find(
      (l: { name: string; basis: string }) =>
        l.name === "Arroz" && l.basis === "RAW",
    ).quantity,
  ).toBe("800");
  await page.goto("/conta/compras");
  await page
    .getByRole("combobox", { name: "Dia da semana", exact: true })
    .selectOption("3");
  await page.getByRole("button", { name: "Salvar ritmo de compras" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Ritmo de compras salvo." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Dia da semana", exact: true }),
  ).toHaveValue("3");
  await page.getByRole("button", { name: "Calcular necessidade" }).click();
  await expect(
    page.getByRole("heading", { name: "Sugestão para o período" }),
  ).toBeVisible();
  const inventoryBeforeList = await (
    await page.request.get("/api/inventory")
  ).json();
  await page.getByRole("button", { name: "Salvar lista de compras" }).click();
  await expect(
    page.getByRole("heading", { name: /Lista selecionada/ }),
  ).toBeVisible();
  const inventoryAfterList = await (
    await page.request.get("/api/inventory")
  ).json();
  expect(inventoryAfterList).toEqual(inventoryBeforeList);
  const receipt = page
    .getByRole("heading", { name: "Receber uma compra" })
    .locator("..");
  await receipt
    .getByRole("combobox", { name: "Alimento", exact: true })
    .selectOption({ label: "Frango" });
  await receipt
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("COOKED");
  await receipt.getByLabel("Quantidade", { exact: true }).fill("400");
  await receipt.getByRole("button", { name: "Confirmar recebimento" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Operação registrada." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Lista selecionada · Recebida parcialmente",
    }),
  ).toBeVisible();
  await screenshot(page, "compras-" + info.project.name);
  await page.goto("/conta/estoque");
  await expect(
    page.getByRole("heading", { name: "Meu estoque" }),
  ).toBeVisible();
  const stockBeforeStorage = await (
    await page.request.get("/api/inventory")
  ).json();
  const lotBeforeStorage = stockBeforeStorage.lots.find(
    (l: { quantity: string }) => Number(l.quantity) > 0,
  );
  await page
    .getByRole("button", { name: "Editar armazenamento e validade" })
    .first()
    .click();
  const storageForm = page
    .getByRole("heading", { name: /Armazenamento de/ })
    .locator("..");
  await storageForm
    .getByRole("combobox", { name: "Local", exact: true })
    .selectOption("FREEZER");
  await storageForm
    .getByRole("button", { name: "Salvar armazenamento" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Armazenamento de/ }),
  ).toHaveCount(0);
  const stockAfterStorage = await (
    await page.request.get("/api/inventory")
  ).json();
  const lotAfterStorage = stockAfterStorage.lots.find(
    (l: { id: string }) => l.id === lotBeforeStorage.id,
  );
  expect(lotAfterStorage.quantity).toBe(lotBeforeStorage.quantity);
  expect(lotAfterStorage.expiry).toBe(lotBeforeStorage.expiry);
  expect(lotAfterStorage.location).toBe("FREEZER");
  await screenshot(page, "estoque-" + info.project.name);
  await page.goto("/conta/dieta?editar=1");
  await expect(page.getByLabel("Nome da refeição 1")).toHaveValue(
    "Café da manhã",
  );
  await screenshot(page, "dieta-" + info.project.name);
  expect(errors).toEqual([]);
});
test("sessão encerrada impede continuar na área pessoal", async ({ page }) => {
  await account(page);
  await page.goto("/conta/inicio");
  await expect(
    page.getByRole("heading", { name: "Olá, Pessoa." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Conta", exact: true }).click();
  await expect(
    page.getByText("Organize sua rotina.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Deslogar", exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await page.goto("/conta/estoque");
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
});

test("cenário de hipertrofia e acessibilidade das telas pessoais", async ({
  page,
}, info) => {
  await account(page);
  await page.goto("/conta/inicio");
  await page
    .getByRole("combobox", { name: "Cenário de demonstração", exact: true })
    .selectOption("hypertrophy");
  await page.getByRole("button", { name: "Carregar cenário fictício" }).click();
  await page.getByRole("button", { name: "Confirmar carga fictícia" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Cenário fictício de hipertrofia carregado" }),
  ).toBeVisible();
  const plan = await (await page.request.get("/api/plan")).json();
  expect(plan.meals).toHaveLength(5);
  const stock = await (await page.request.get("/api/inventory")).json();
  expect(stock.lots).toHaveLength(18);
  expect(
    stock.lots.every((l: { expiry: unknown }) => l.expiry === null),
  ).toBeTruthy();
  for (const path of [
    "/conta/inicio",
    "/conta/dieta",
    "/conta/agenda",
    "/conta/estoque",
    "/conta/compras",
    "/conta/preparo",
    "/conta/seguranca",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByText(/Carregando|Verificando/)).toHaveCount(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
      path,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.goto("/conta/dieta?editar=1");
  await expect(page.getByLabel("Nome da refeição 1")).toHaveValue(
    "Café da manhã",
  );
  await screenshot(page, "hipertrofia-" + info.project.name);
  await page.getByRole("link", { name: "Início", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/conta\/inicio$/);
});
test("recuperação de senha por e-mail local e exclusão da conta fictícia", async ({
  page,
}) => {
  const profile = await account(page);
  await post(page.request, "/api/auth/logout", {});
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail da conta").fill(profile.email);
  await page.getByRole("button", { name: "Enviar link", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Se houver uma conta elegível",
  );
  let found: { path: string; body: string } | undefined;
  await expect
    .poll(
      async () => {
        const paths = await readdir("../.local/mail").catch(() => []);
        for (const name of paths.filter((n) => n.endsWith(".json"))) {
          const path = "../.local/mail/" + name;
          let message;
          try {
            message = JSON.parse(await readFile(path, "utf8"));
          } catch {
            continue;
          }
          if (
            message.to === profile.email &&
            message.subject.includes("Redefina")
          ) {
            found = { path, body: message.body };
            return true;
          }
        }
        return false;
      },
      { timeout: 25000 },
    )
    .toBe(true);
  const link = found!.body.match(/http[^\s]+/)![0];
  await page.goto(link);
  await page
    .getByLabel("Nova senha", { exact: true })
    .fill("Senha-alterada-2026!");
  await page.getByLabel("Repita a nova senha").fill("Senha-alterada-2026!");
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel("E-mail", { exact: true }).fill(profile.email);
  await page.getByLabel("Senha", { exact: true }).fill("Senha-alterada-2026!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/conta\/inicio$/);
  await page.getByRole("link", { name: "Conta", exact: true }).click();
  await page.getByRole("link", { name: "Gerenciar senha e conta" }).click();
  await page.getByRole("button", { name: "Quero excluir minha conta" }).click();
  await page.getByLabel("Senha atual").fill("Senha-alterada-2026!");
  await page.getByLabel("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await page
    .getByRole("button", { name: "Excluir definitivamente minha conta" })
    .click();
  await expect(page).toHaveURL("http://127.0.0.1:5173/entrar?conta=excluida");
  expect((await page.request.get("/api/me")).status()).toBe(401);
  await expect(
    page.getByRole("status").filter({ hasText: "Conta excluída" }),
  ).toBeVisible();
  await unlink(found!.path);
});
test("dieta simplificada: configurar, trocar, desfazer e consumir", async ({
  page,
}, info) => {
  await account(page);
  expect(
    (
      await post(page.request, "/api/onboarding/scenario?type=hypertrophy", {})
    ).ok(),
  ).toBeTruthy();
  const schedule = await (await page.request.get("/api/schedule")).json();
  const breakfast = schedule.meals.find(
    (m: { name: string }) => m.name === "Café da manhã",
  );
  const eggsIndex = breakfast.items.findIndex(
    (i: { name: string }) => i.name === "Ovos",
  );
  const lunch = schedule.meals.find(
    (m: { name: string }) => m.name === "Almoço",
  );
  const chicken = lunch.items.find(
    (i: { name: string }) => i.name === "Peito de frango",
  );
  const stockBefore = await (await page.request.get("/api/inventory")).json();
  await page.goto("/conta/dieta");
  const card = page.getByRole("article", {
    name: "Café da manhã",
    exact: true,
  });
  await expect(card).toBeVisible();
  await expect(page.getByRole("article").first()).toHaveAccessibleName(
    "Café da manhã",
  );
  await expect(page.getByLabel("Nome da refeição 1")).toHaveCount(0);
  await card
    .getByRole("button", { name: "Trocar alimento", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Qual alimento?").selectOption(String(eggsIndex));
  await expect(
    dialog.getByText("Este alimento está sem trocas liberadas"),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Configurar alternativas e porções" })
    .click();
  await dialog
    .getByRole("button", { name: "Adicionar alternativa", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Alimento alternativo 1", exact: true })
    .selectOption(chicken.foodId);
  await dialog.getByLabel("Porção 1", { exact: true }).fill("90");
  await dialog
    .getByRole("combobox", { name: "Estado 1", exact: true })
    .selectOption("COOKED");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await dialog.getByRole("button", { name: "Salvar alternativas" }).click();
  await expect(
    dialog.getByRole("radio", { name: /Peito de frango/ }),
  ).toBeVisible();
  await dialog.getByRole("radio", { name: /Peito de frango/ }).check();
  await expect(
    dialog.getByRole("heading", { name: "Trocar alimento", exact: true }),
  ).toBeInViewport();
  await screenshot(page, "troca-" + info.project.name, false);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await dialog.getByRole("button", { name: "Confirmar troca" }).click();
  await expect(
    card.getByRole("listitem").filter({ hasText: "Peito de frango" }),
  ).toBeVisible();
  const stockAfter = await (await page.request.get("/api/inventory")).json();
  expect(stockAfter.lots).toEqual(stockBefore.lots);
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(
    card.getByRole("listitem").filter({ hasText: "Ovos" }),
  ).toBeVisible();
  await card
    .getByRole("button", { name: "Trocar alimento", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Qual alimento?").selectOption(String(eggsIndex));
  await dialog.getByRole("radio", { name: /Peito de frango/ }).check();
  await dialog
    .getByRole("combobox", { name: "Aplicar troca", exact: true })
    .selectOption("NEXT");
  await dialog.getByRole("button", { name: "Confirmar troca" }).click();
  await expect(
    card.getByRole("listitem").filter({ hasText: "Peito de frango" }),
  ).toBeVisible();
  const nextDate = new Date(schedule.date + "T12:00:00Z");
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const tomorrow = await (
    await page.request.get(
      "/api/schedule?date=" + nextDate.toISOString().slice(0, 10),
    )
  ).json();
  expect(
    tomorrow.meals
      .find((m: { mealId: string }) => m.mealId === breakfast.mealId)
      .items.some((i: { foodId: string }) => i.foodId === chicken.foodId),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(
    card.getByRole("listitem").filter({ hasText: "Ovos" }),
  ).toBeVisible();
  await card
    .getByRole("button", { name: "Confirmar consumo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar e baixar estoque" })
    .click();
  await expect(card.getByText("Consumida", { exact: true })).toBeVisible();
  await card
    .getByRole("button", {
      name: "Desfazer consumo de Café da manhã",
      exact: true,
    })
    .click();
  await expect(
    card.getByRole("button", { name: "Confirmar consumo", exact: true }),
  ).toBeVisible();
  await screenshot(page, "dieta-simplificada-" + info.project.name);
  const swapButton = card.getByRole("button", {
    name: "Trocar alimento",
    exact: true,
  });
  await swapButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(swapButton).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("acessibilidade das telas públicas de acesso", async ({ page }) => {
  for (const path of ["/", "/entrar", "/cadastro", "/recuperar-senha"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/Verificando sua sessão/)).toHaveCount(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      path,
    ).toEqual([]);
  }
});

test("versão 1.0: nutricionista prepara, cliente consulta e acompanha resultados", async ({
  page,
  browser,
}, info) => {
  await account(page, "NUTRITIONIST", false);
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:5173",
    viewport: page.viewportSize()!,
    isMobile: info.project.name === "mobile",
    locale: "pt-BR",
  });
  try {
    const clientPage = await context.newPage();
    const client = await account(clientPage, "CLIENT", false);
    await page.goto("/profissional");
    await page.getByLabel("Nome do cliente").fill("Cliente fictício");
    await page.getByLabel("E-mail do cliente").fill(client.email);
    await page.getByRole("button", { name: "Criar convite" }).click();
    await expect(page.getByRole("status")).toContainText("Convite disponível");
    await clientPage.goto("/conta/nutricionista");
    await clientPage
      .getByRole("button", { name: "Aceitar acompanhamento" })
      .click();
    await expect(clientPage.getByText("ACOMPANHAMENTO ATIVO")).toBeVisible();
    await page.reload();
    await page.getByRole("link", { name: "Abrir acompanhamento →" }).click();
    await page.getByRole("button", { name: "Alimentos", exact: true }).click();
    for (const [name, unit] of [
      ["Ovos", "UNIT"],
      ["Frango", "G"],
    ]) {
      await page.getByLabel("Nome do alimento", { exact: true }).fill(name);
      await page
        .getByRole("combobox", { name: "Unidade", exact: true })
        .selectOption(unit);
      await page
        .getByRole("button", { name: "Adicionar alimento", exact: true })
        .click();
      await expect(
        page.getByRole("listitem").filter({ hasText: name }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Dieta", exact: true }).click();
    await page
      .getByRole("button", { name: "Adicionar refeição", exact: true })
      .click();
    await page.getByLabel("Nome da refeição 1").fill("Café");
    await page
      .getByRole("button", { name: "Adicionar alimento", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Alimento", exact: true })
      .selectOption({ label: "Ovos" });
    await page
      .getByRole("spinbutton", { name: "Quantidade", exact: true })
      .fill("2");
    await page.getByRole("button", { name: "Salvar revisão" }).click();
    await expect(page.getByRole("status")).toContainText("Revisão salva");
    await page
      .getByRole("button", { name: "Configurar trocas de Café", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Adicionar alternativa", exact: true })
      .click();
    await dialog
      .getByRole("combobox", { name: "Alimento alternativo 1", exact: true })
      .selectOption({ label: "Frango" });
    await dialog.getByLabel("Porção 1", { exact: true }).fill("90");
    await dialog
      .getByRole("combobox", { name: "Estado 1", exact: true })
      .selectOption("COOKED");
    await dialog.getByRole("button", { name: "Salvar alternativas" }).click();
    await expect(dialog).toHaveCount(0);
    await page
      .getByRole("button", { name: "Avaliações mensais", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Registrar avaliação mensal" })
      .click();
    await page.getByLabel("Peso (kg)", { exact: true }).fill("82");
    await page
      .getByLabel("Altura (cm) · opcional", { exact: true })
      .fill("180");
    await page
      .getByLabel("Observações da avaliação")
      .fill("Registro fictício para testar a versão 1.0.");
    await page.getByRole("button", { name: "Salvar avaliação" }).click();
    await expect(page.getByText("82 kg", { exact: true })).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await screenshot(page, "profissional-" + info.project.name);
    await clientPage.goto("/conta/dieta?editar=1");
    await expect(
      clientPage.getByRole("button", { name: "Editar dieta", exact: true }),
    ).toHaveCount(0);
    await expect(
      clientPage.getByRole("link", { name: "Estoque", exact: true }),
    ).toHaveCount(0);
    await expect(
      clientPage.getByRole("button", { name: /Configurar trocas/ }),
    ).toHaveCount(0);
    await clientPage
      .getByRole("button", { name: "Trocar alimento", exact: true })
      .click();
    const clientDialog = clientPage.getByRole("dialog");
    await expect(
      clientDialog.getByRole("button", {
        name: "Configurar alternativas e porções",
      }),
    ).toHaveCount(0);
    await expect(clientDialog.getByText(/Saldo registrado/)).toHaveCount(0);
    await clientDialog.getByRole("radio", { name: /Frango/ }).check();
    await clientDialog.getByRole("button", { name: "Confirmar troca" }).click();
    await clientPage
      .getByRole("button", { name: "Já comi", exact: true })
      .click();
    await expect(clientPage.getByRole("status")).toContainText(
      "Nenhum item de estoque",
    );
    expect((await clientPage.request.get("/api/inventory")).status()).toBe(403);
    await screenshot(clientPage, "cliente-basico-" + info.project.name);
    await clientPage.goto("/conta/resultados");
    await expect(clientPage.getByText("82 kg", { exact: true })).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page: clientPage })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await clientPage.goto("/conta/premium");
    await clientPage
      .getByRole("button", { name: "Experimentar Premium na demonstração" })
      .click();
    await clientPage
      .getByRole("checkbox", {
        name: "Conferi os saldos e quero ativar o controle",
      })
      .check();
    await clientPage
      .getByRole("button", { name: "Ativar controle de estoque" })
      .click();
    await expect(
      clientPage.getByRole("heading", { name: "Controle de estoque ativado" }),
    ).toBeVisible();
    expect(
      (await (await clientPage.request.get("/api/inventory")).json()).history,
    ).toEqual([]);
    await clientPage
      .getByRole("button", { name: "Desativar controle de estoque" })
      .click();
    await expect(
      clientPage.getByRole("heading", {
        name: "Dieta sem controle de estoque",
        exact: true,
      }),
    ).toBeVisible();
    expect((await clientPage.request.get("/api/inventory")).status()).toBe(403);
    await clientPage.goto("/conta/nutricionista");
    await clientPage
      .getByRole("button", { name: "Revogar acesso", exact: true })
      .click();
    await clientPage
      .getByRole("button", { name: "Confirmar revogação", exact: true })
      .click();
    await expect(
      clientPage.getByText("Seu acompanhamento começa com um convite"),
    ).toBeVisible();
    expect(
      (
        await page.request.get(`/api/professional/clients/${client.id}/results`)
      ).status(),
    ).toBe(404);
  } finally {
    await context.close();
  }
});

test("duas refeições podem ser desfeitas separadamente após recarregar", async ({
  page,
}) => {
  await account(page, "CLIENT", false);
  expect(
    (
      await post(page.request, "/api/onboarding/scenario?type=hypertrophy", {})
    ).ok(),
  ).toBeTruthy();
  await page.goto("/conta/dieta");
  const breakfast = page.getByRole("article", {
    name: "Café da manhã",
    exact: true,
  });
  const lunch = page.getByRole("article", { name: "Almoço", exact: true });
  for (const card of [breakfast, lunch]) {
    await card.getByRole("button", { name: "Já comi", exact: true }).click();
    await expect(card.getByText("Consumida", { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(
    breakfast.getByRole("button", {
      name: "Desfazer consumo de Café da manhã",
    }),
  ).toBeVisible();
  await expect(
    lunch.getByRole("button", { name: "Desfazer consumo de Almoço" }),
  ).toBeVisible();
  await breakfast
    .getByRole("button", { name: "Desfazer consumo de Café da manhã" })
    .click();
  await expect(
    breakfast.getByRole("button", { name: "Já comi", exact: true }),
  ).toBeVisible();
  await expect(lunch.getByText("Consumida", { exact: true })).toBeVisible();
  await lunch
    .getByRole("button", { name: "Desfazer consumo de Almoço" })
    .click();
  await expect(page.getByText("0 de 5 refeições consumidas")).toBeVisible();
  await breakfast.getByRole("button", { name: "Já comi", exact: true }).click();
  await breakfast
    .getByRole("button", { name: "Desfazer consumo de Café da manhã" })
    .click();
  await page.reload();
  await expect(page.getByText("0 de 5 refeições consumidas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Desfazer consumo de/ }),
  ).toHaveCount(0);
});
