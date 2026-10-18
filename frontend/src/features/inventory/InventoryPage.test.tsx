// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EntryForm } from "./InventoryPage";
import { useCommand } from "../../lib/useCommand";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("uma quantidade inteira de ovos passa pela validação nativa e é enviada", async () => {
  const submit = vi.fn(async () => true);
  const user = userEvent.setup();
  render(
    <EntryForm
      today="2026-10-17"
      foods={[
        {
          id: "eggs",
          name: "Ovos",
          unit: "UNIT",
          baseUnit: "UNIT",
          dimension: "COUNT",
          category: "PROTEIN",
          purchaseFrequency: "WEEKLY",
          version: 0,
          archivedAt: null,
        },
      ]}
      busy={false}
      submit={submit}
    />,
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Alimento" }),
    "eggs",
  );
  await user.type(screen.getByRole("spinbutton", { name: "Quantidade" }), "2");
  expect(
    (
      screen.getByRole("spinbutton", {
        name: "Quantidade",
      }) as HTMLInputElement
    ).checkValidity(),
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Salvar lote" }));
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({ foodId: "eggs", quantity: "2", unit: "UNIT" }),
    "",
  );
});
it("uma resposta perdida pode ser repetida sem gerar outra chave de movimentação", async () => {
  const keys: string[] = [];
  let lost = true;
  const committed = new Set<string>();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, options?: RequestInit) => {
      if (path === "/api/auth/csrf")
        return new Response(
          JSON.stringify({ token: "csrf", headerName: "X-CSRF-TOKEN" }),
        );
      const key = (options!.headers as Record<string, string>)[
        "Idempotency-Key"
      ];
      keys.push(key);
      committed.add(key);
      if (lost) {
        lost = false;
        throw new TypeError("Resposta perdida depois de confirmar no servidor");
      }
      return new Response(JSON.stringify({ operationId: "saved" }));
    }),
  );
  function Command() {
    const command = useCommand();
    return (
      <>
        <button
          disabled={command.busy}
          onClick={() =>
            command.run("/api/inventory/entries", { quantity: "2" })
          }
        >
          Registrar
        </button>
        {command.error && <p role="alert">{command.error}</p>}
        {command.notice && <p role="status">{command.notice}</p>}
      </>
    );
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Command />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Registrar" }));
  await screen.findByRole("alert");
  await user.click(screen.getByRole("button", { name: "Registrar" }));
  await screen.findByRole("status");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  expect(committed.size).toBe(1);
});
