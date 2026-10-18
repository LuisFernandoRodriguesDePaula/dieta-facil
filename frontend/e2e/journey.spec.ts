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
async function account(page: Page) {
  const email = "browser-" + crypto.randomUUID() + "@example.invalid";
  const created = await post(page.request, "/api/auth/register", {
    name: "Pessoa Demo",
    email,
    password: "Senha-ficticia-2026!",
    timezone: "America/Sao_Paulo",
  });
  expect(created.status()).toBe(201);
  const logged = await post(page.request, "/api/auth/login", {
    email,
    password: "Senha-ficticia-2026!",
  });
  expect(logged.status()).toBe(200);
}
async function screenshot(page: Page, name: string) {
  await mkdir("../.local/screenshots", { recursive: true });
  await page.screenshot({
    path: "../.local/screenshots/" + name + ".png",
    fullPage: true,
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
  await page.goto("/conta/dieta");
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
  expect((await post(page.request, "/api/auth/logout", {})).status()).toBe(204);
  await page.getByRole("link", { name: "Estoque", exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
});
