// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ProfessionalPage } from "./CarePages";
vi.mock("../auth/session", () => ({
  useSession: () => ({
    data: { id: "pro", role: "NUTRITIONIST" },
    isPending: false,
    isError: false,
  }),
}));
vi.mock("./features", () => ({
  useFeatures: () => ({ data: { inventoryEnabled: false }, isPending: false }),
}));
let listFails = false;
let renewalFails = false;
let lists = 0;
const links = [
  {
    id: "expired",
    clientId: null,
    name: "José Expirado",
    email: "jose@example.invalid",
    status: "PENDING",
    expiresAt: "2000-01-01T00:00:00Z",
  },
  {
    id: "active",
    clientId: "client",
    name: "Maria Ativa",
    email: "maria@example.invalid",
    status: "ACTIVE",
    expiresAt: "2000-01-01T00:00:00Z",
  },
];
beforeEach(() => {
  listFails = false;
  renewalFails = false;
  lists = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options?: RequestInit) => {
      if (path === "/api/auth/csrf")
        return new Response(
          JSON.stringify({ token: "csrf", headerName: "X-CSRF-TOKEN" }),
        );
      if (path === "/api/professional/clients" && options?.method === "POST")
        return new Response(
          JSON.stringify(
            renewalFails
              ? { message: "Não foi possível renovar o convite." }
              : links,
          ),
          { status: renewalFails ? 503 : 200 },
        );
      if (path === "/api/professional/clients") {
        lists++;
        return new Response(
          JSON.stringify(
            listFails
              ? { message: "Serviço temporariamente indisponível." }
              : links,
          ),
          { status: listFails ? 503 : 200 },
        );
      }
      return new Response("{}", { status: 404 });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function open() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter>
        <ProfessionalPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it("separa convite expirado de vínculo ativo e busca nomes sem acento", async () => {
  const user = userEvent.setup();
  open();
  const expired = await screen.findByRole("article", { name: "José Expirado" });
  expect(within(expired).getByText("CONVITE EXPIRADO")).toBeVisible();
  expect(
    within(screen.getByRole("article", { name: "Maria Ativa" })).getByText(
      "VINCULADO",
    ),
  ).toBeVisible();
  await user.selectOptions(screen.getByLabelText("Situação"), "expired");
  expect(
    screen.queryByRole("article", { name: "Maria Ativa" }),
  ).not.toBeInTheDocument();
  await user.type(screen.getByRole("searchbox"), "jose");
  expect(screen.getByRole("article", { name: "José Expirado" })).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "Abrir acompanhamento →" }),
  ).not.toBeInTheDocument();
});
it("permite recuperar uma lista indisponível sem recarregar a página", async () => {
  listFails = true;
  const user = userEvent.setup();
  open();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Serviço temporariamente indisponível",
  );
  listFails = false;
  await user.click(
    screen.getByRole("button", { name: "Tentar carregar clientes novamente" }),
  );
  expect(
    await screen.findByRole("article", { name: "Maria Ativa" }),
  ).toBeVisible();
  expect(lists).toBe(2);
});
it("mantém convite e apresenta erro quando a renovação falha", async () => {
  renewalFails = true;
  const user = userEvent.setup();
  open();
  const expired = await screen.findByRole("article", { name: "José Expirado" });
  await user.click(
    within(expired).getByRole("button", { name: "Renovar convite" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Não foi possível renovar o convite.",
  );
  expect(expired).toBeVisible();
  expect(
    screen.queryByText(/Convite renovado por sete dias/),
  ).not.toBeInTheDocument();
  expect(
    within(expired).getByRole("button", { name: "Renovar convite" }),
  ).toBeEnabled();
});
