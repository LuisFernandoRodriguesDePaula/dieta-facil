// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AuthRoutes from "../auth/AuthRoutes";
import type { Food } from "./food-types";

let foods: Food[];
let failLoad: boolean;
let expireMutation: boolean;
let signedIn: boolean;
let conflictUpdate: boolean;
let lastConversion: Record<string, string> | null;
const profile = {
  id: "catalog-owner",
  name: "Pessoa Teste",
  email: "food@example.invalid",
  timezone: "UTC",
};
const fixture: Food = {
  id: "rice-id",
  name: "Arroz",
  unit: "KG",
  baseUnit: "G",
  dimension: "MASS",
  category: "GRAINS",
  purchaseFrequency: "WEEKLY",
  archivedAt: null,
  version: 0,
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });

beforeEach(() => {
  foods = [];
  failLoad = false;
  expireMutation = false;
  signedIn = true;
  conflictUpdate = false;
  lastConversion = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options?: RequestInit) => {
      if (path === "/api/auth/csrf")
        return response({ token: "token", headerName: "X-CSRF-TOKEN" });
      if (path === "/api/me")
        return signedIn
          ? response(profile)
          : response({ message: "Entre novamente." }, 401);
      const method = options?.method ?? "GET";
      if (method !== "GET" && expireMutation) {
        signedIn = false;
        return response({ message: "Entre novamente." }, 401);
      }
      if (path.startsWith("/api/foods?") && method === "GET") {
        if (failLoad) throw new TypeError("offline");
        const params = new URLSearchParams(path.split("?")[1]);
        const matches = foods.filter(
          (food) =>
            Boolean(food.archivedAt) === (params.get("archived") === "true") &&
            food.name
              .toLowerCase()
              .includes((params.get("q") ?? "").toLowerCase()),
        );
        return response({
          items: matches,
          page: 0,
          totalPages: matches.length ? 1 : 0,
          totalElements: matches.length,
        });
      }
      if (path === "/api/foods" && method === "POST") {
        const input = JSON.parse(options?.body as string);
        const food = { ...fixture, ...input, id: "new-food" };
        foods.push(food);
        return response(food, 201);
      }
      const input = options?.body ? JSON.parse(options.body as string) : {};
      const food = foods.find((item) => path.includes(item.id));
      if (food && path.endsWith("/archive")) {
        food.archivedAt = input.archived ? "2026-10-16T00:00:00Z" : null;
        food.version++;
        return response(food);
      }
      if (food && path.endsWith("/convert")) {
        lastConversion = input;
        return response({ quantity: "1500", unit: "G", basis: input.basis });
      }
      if (food && method === "PATCH") {
        if (conflictUpdate)
          return response(
            { message: "Alterado em outra sessão. Recarregue o catálogo." },
            409,
          );
        Object.assign(food, input, { version: food.version + 1 });
        return response(food);
      }
      return response({ message: "Rota inesperada" }, 404);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/conta/alimentos"]}>
        <AuthRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

it("cadastra, edita e exige confirmação antes de arquivar; permite restaurar", async () => {
  const user = mount();
  await screen.findByText("Seu catálogo começa aqui.");
  await user.click(screen.getByRole("button", { name: "Novo alimento" }));
  await user.click(screen.getByRole("button", { name: "Salvar alimento" }));
  expect(await screen.findByText("Informe o nome do alimento.")).toBeVisible();
  await user.type(screen.getByLabelText("Nome do alimento"), "Arroz");
  await user.selectOptions(screen.getByLabelText("Unidade preferida"), "KG");
  await user.click(screen.getByRole("button", { name: "Salvar alimento" }));
  expect(await screen.findByRole("heading", { name: "Arroz" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Editar Arroz" }));
  await user.clear(screen.getByLabelText("Nome do alimento"));
  await user.type(screen.getByLabelText("Nome do alimento"), "Arroz integral");
  expect(
    within(screen.getByLabelText("Unidade preferida")).queryByRole("option", {
      name: "ml",
    }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Salvar alimento" }));
  await user.click(
    await screen.findByRole("button", { name: "Arquivar Arroz integral" }),
  );
  const dialog = screen.getByRole("alertdialog");
  expect(
    within(dialog).getByRole("button", { name: "Cancelar" }),
  ).toHaveFocus();
  await user.tab();
  expect(
    within(dialog).getByRole("button", { name: "Confirmar arquivamento" }),
  ).toHaveFocus();
  await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  expect(screen.getByRole("heading", { name: "Arroz integral" })).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Arquivar Arroz integral" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Confirmar arquivamento" }),
  );
  await screen.findByText("Seu catálogo começa aqui.");
  await user.click(screen.getByRole("button", { name: "Arquivados" }));
  await user.click(
    await screen.findByRole("button", { name: "Restaurar Arroz integral" }),
  );
  await user.click(screen.getByRole("button", { name: "Ativos" }));
  expect(
    await screen.findByRole("heading", { name: "Arroz integral" }),
  ).toBeVisible();
});

it("busca pelo nome, informa resultado vazio e permite limpar", async () => {
  foods = [{ ...fixture }];
  const user = mount();
  await screen.findByRole("heading", { name: "Arroz" });
  await user.type(screen.getByLabelText("Buscar alimento"), "banana");
  await user.click(screen.getByRole("button", { name: "Buscar" }));
  expect(await screen.findByText("Nenhum alimento encontrado.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Limpar busca" }));
  expect(await screen.findByRole("heading", { name: "Arroz" })).toBeVisible();
});

it("mantém o texto editado ao receber conflito de versão e oferece recarga explícita", async () => {
  foods = [{ ...fixture }];
  conflictUpdate = true;
  const user = mount();
  await user.click(await screen.findByRole("button", { name: "Editar Arroz" }));
  await user.clear(screen.getByLabelText("Nome do alimento"));
  await user.type(screen.getByLabelText("Nome do alimento"), "Arroz novo");
  await user.click(screen.getByRole("button", { name: "Salvar alimento" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Alterado em outra sessão",
  );
  expect(screen.getByLabelText("Nome do alimento")).toHaveValue("Arroz novo");
  await user.click(
    screen.getByRole("button", { name: "Fechar e recarregar catálogo" }),
  );
  expect(screen.queryByLabelText("Nome do alimento")).not.toBeInTheDocument();
});

it("retira o editor e pede novo login se a sessão expirar durante o cadastro", async () => {
  expireMutation = true;
  const user = mount();
  await user.click(
    await screen.findByRole("button", { name: "Novo alimento" }),
  );
  await user.type(screen.getByLabelText("Nome do alimento"), "Teste");
  await user.click(screen.getByRole("button", { name: "Salvar alimento" }));
  expect(
    await screen.findByText(
      "Sua sessão terminou. Entre novamente para continuar.",
    ),
  ).toBeVisible();
  expect(screen.queryByLabelText("Nome do alimento")).not.toBeInTheDocument();
});

it("exibe erro de conexão ao listar sem simular catálogo vazio", async () => {
  failLoad = true;
  const user = mount();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível conectar",
  );
  expect(
    screen.queryByText("Seu catálogo começa aqui."),
  ).not.toBeInTheDocument();
  failLoad = false;
  await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Seu catálogo começa aqui.")).toBeVisible();
});

it("converte quantidade com vírgula, preserva referência e limpa resultado ao alterar entrada", async () => {
  foods = [{ ...fixture }];
  const user = mount();
  await user.click(
    await screen.findByRole("button", { name: "Converter unidades de Arroz" }),
  );
  await user.clear(screen.getByLabelText("Quantidade"));
  await user.type(screen.getByLabelText("Quantidade"), "1,5");
  await user.selectOptions(
    screen.getByLabelText("Referência da quantidade"),
    "COOKED",
  );
  await user.click(
    screen.getByRole("button", { name: "Converter quantidade" }),
  );
  expect(await screen.findByText("1500 g · Cozido / preparado")).toBeVisible();
  expect(lastConversion).toMatchObject({
    quantity: "1.5",
    from: "KG",
    to: "G",
    basis: "COOKED",
  });
  await user.type(screen.getByLabelText("Quantidade"), "1");
  await waitFor(() =>
    expect(
      screen.queryByText("1500 g · Cozido / preparado"),
    ).not.toBeInTheDocument(),
  );
});
