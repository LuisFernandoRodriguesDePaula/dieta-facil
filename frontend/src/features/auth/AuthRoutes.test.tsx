// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AuthRoutes from "./AuthRoutes";

const profile = {
  id: "test-account",
  name: "Pessoa Teste",
  email: "test@example.invalid",
  timezone: "America/Sao_Paulo",
  role: "CLIENT",
};
let signedIn = false;
let expiredOnSave = false;
let serviceUnavailable = false;
let registrationCalls = 0;
const response = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  signedIn = false;
  expiredOnSave = false;
  serviceUnavailable = false;
  registrationCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      if (serviceUnavailable) throw new TypeError("offline");
      if (url === "/api/auth/csrf")
        return response({ token: "csrf-fixture", headerName: "X-CSRF-TOKEN" });
      if (url === "/api/features")
        return response({
          role: "CLIENT",
          tier: "BASIC",
          inventoryAllowed: false,
          inventoryEnabled: false,
          reviewRequired: true,
        });
      if (url.startsWith("/api/schedule?"))
        return response({ timezone: profile.timezone, meals: [] });
      if (url === "/api/auth/login") {
        const input = JSON.parse(options?.body as string);
        if (input.password !== "senha-de-teste")
          return response({ message: "E-mail ou senha inválidos." }, 401);
        signedIn = true;
        return response(profile);
      }
      if (url === "/api/auth/register") {
        registrationCalls++;
        return response(profile, 201);
      }
      if (url === "/api/auth/logout") {
        signedIn = false;
        return response(null, 204);
      }
      if (url === "/api/me" && options?.method === "PATCH" && expiredOnSave) {
        signedIn = false;
        return response({ message: "Entre novamente." }, 401);
      }
      if (url === "/api/me")
        return signedIn
          ? response(profile)
          : response({ message: "Entre novamente." }, 401);
      return response({ message: "Rota inesperada" }, 404);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Acesso pessoal", () => {
  it("exibe erro de credenciais, permite corrigir e encerra a sessão", async () => {
    const user = userEvent.setup();
    mount("/entrar");
    await user.type(await screen.findByLabelText("E-mail"), profile.email);
    await user.type(screen.getByLabelText("Senha"), "senha-errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-mail ou senha inválidos.",
    );
    await user.clear(screen.getByLabelText("Senha"));
    await user.type(screen.getByLabelText("Senha"), "senha-de-teste");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(
      await screen.findByRole("heading", { name: "Minha dieta" }),
    ).toBeVisible();
    expect(screen.queryByText("Organize sua rotina.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Conta" }));
    expect(
      await screen.findByRole("heading", { name: "Olá, Pessoa." }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Deslogar" }));
    expect(
      await screen.findByRole("heading", { name: "Entre na sua conta." }),
    ).toBeVisible();
    expect(signedIn).toBe(false);
  });

  it("leva uma sessão já aberta diretamente ao painel ao visitar entrar", async () => {
    signedIn = true;
    mount("/entrar");
    expect(
      await screen.findByRole("heading", { name: "Minha dieta" }),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Senha", { exact: true }),
    ).not.toBeInTheDocument();
  });

  it("bloqueia senhas diferentes antes do cadastro e encaminha ao login após criar conta", async () => {
    const user = userEvent.setup();
    mount("/cadastro");
    await user.type(await screen.findByLabelText("Nome"), profile.name);
    await user.type(screen.getByLabelText("E-mail"), profile.email);
    await user.type(
      screen.getByLabelText("Senha", { exact: true }),
      "senha-de-teste",
    );
    await user.type(screen.getByLabelText("Confirmar senha"), "outra-senha");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(
      await screen.findByText("As senhas devem ser iguais."),
    ).toBeVisible();
    expect(registrationCalls).toBe(0);
    await user.clear(screen.getByLabelText("Confirmar senha"));
    await user.type(screen.getByLabelText("Confirmar senha"), "senha-de-teste");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(
      await screen.findByText("Conta criada! Entre com seu e-mail e senha."),
    ).toBeVisible();
    expect(screen.getByLabelText("E-mail")).toHaveValue(profile.email);
    expect(signedIn).toBe(false);
  });

  it("remove a área pessoal e pede novo login quando a sessão termina ao salvar", async () => {
    signedIn = true;
    expiredOnSave = true;
    const user = userEvent.setup();
    mount("/conta");
    await screen.findByRole("heading", { name: "Olá, Pessoa." });
    await user.click(screen.getByRole("button", { name: "Salvar perfil" }));
    expect(
      await screen.findByText(
        "Sua sessão terminou. Entre novamente para continuar.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(profile.email)).not.toBeInTheDocument();
  });

  it("distingue serviço indisponível de sessão ausente e permite tentar novamente", async () => {
    serviceUnavailable = true;
    mount("/conta");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Confira se o serviço está disponível",
    );
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument();
    serviceUnavailable = false;
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar novamente" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Entre na sua conta." }),
      ).toBeVisible(),
    );
  });
});
