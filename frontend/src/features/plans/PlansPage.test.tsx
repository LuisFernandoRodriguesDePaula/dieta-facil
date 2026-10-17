// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AuthRoutes from "../auth/AuthRoutes";
let saved: Record<string, unknown> | undefined;
let skipped = false;
beforeEach(() => {
  saved = undefined;
  skipped = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options?: RequestInit) => {
      const data =
        path === "/api/me"
          ? {
              id: "owner",
              name: "Teste",
              email: "test@example.invalid",
              timezone: "UTC",
            }
          : path === "/api/auth/csrf"
            ? { token: "csrf", headerName: "X-CSRF-TOKEN" }
            : path.startsWith("/api/foods")
              ? {
                  items: [
                    { id: "egg", name: "Ovos", unit: "UNIT", baseUnit: "UNIT" },
                  ],
                  totalPages: 1,
                }
              : path.startsWith("/api/plan") && options?.method === "PUT"
                ? ((saved = JSON.parse(options.body as string)),
                  { version: 1, meals: [], revisionDates: [] })
                : path.startsWith("/api/plan")
                  ? {
                      version: 0,
                      effectiveFrom: null,
                      meals: [],
                      revisionDates: [],
                    }
                  : path === "/api/schedule/skip"
                    ? ((skipped = true), {})
                    : path.startsWith("/api/schedule")
                      ? {
                          timezone: "UTC",
                          meals: [
                            {
                              id: "occ",
                              mealId: "meal",
                              name: "Café",
                              time: "08:00",
                              status: skipped ? "SKIPPED" : "PENDING",
                              items: [
                                {
                                  foodId: "egg",
                                  name: "Ovos",
                                  quantity: "2",
                                  unit: "UNIT",
                                  basis: "AS_SOLD",
                                },
                              ],
                            },
                          ],
                        }
                      : {};
      return new Response(JSON.stringify(data), { status: 200 });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function open(path: string) {
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
      <MemoryRouter initialEntries={[path]}>
        <AuthRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
it("cria uma refeição com dias e quantidades e envia a revisão", async () => {
  open("/conta/dieta");
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Adicionar refeição" }),
  );
  await user.type(screen.getByLabelText("Nome da refeição 1"), "Café");
  await user.click(screen.getByRole("button", { name: "Adicionar alimento" }));
  await user.click(screen.getByRole("button", { name: "Salvar revisão" }));
  await waitFor(() => expect(saved).toBeDefined());
  expect(saved?.meals).toEqual([
    expect.objectContaining({
      name: "Café",
      days: [1, 2, 3, 4, 5, 6, 7],
      items: [{ foodId: "egg", quantity: "1", unit: "UNIT", basis: "AS_SOLD" }],
    }),
  ]);
});
it("pula uma ocorrência sem chamar qualquer API de estoque", async () => {
  open("/conta/agenda");
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Marcar como pulada" }),
  );
  expect(await screen.findByText("Pulada")).toBeInTheDocument();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes("inventory")),
  ).toBe(false);
});
