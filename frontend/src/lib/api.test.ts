import { afterEach, expect, it, vi } from "vitest";
import { api } from "./api";
afterEach(() => vi.unstubAllGlobals());

it("envia CSRF em mutação e não repete a escrita automaticamente após erro", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ token: "masked-token", headerName: "X-CSRF-TOKEN" }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Atualize a página." }), {
        status: 403,
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    api("/api/me", "PATCH", { name: "Teste", timezone: "UTC" }),
  ).rejects.toMatchObject({ status: 403 });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][1]).toMatchObject({
    method: "PATCH",
    credentials: "same-origin",
    headers: { "X-CSRF-TOKEN": "masked-token" },
  });
});
it("uma resposta 401 antiga não encerra a sessão após uma transição de acesso", async () => {
  let resolveOld: (response: Response) => void = () => {};
  let waiting = true;
  const dispatch = vi.fn();
  vi.stubGlobal("window", { dispatchEvent: dispatch });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      if (path === "/api/auth/csrf")
        return new Response(
          JSON.stringify({ token: "csrf", headerName: "X-CSRF-TOKEN" }),
        );
      if (path === "/api/auth/logout")
        return new Response(null, { status: 204 });
      if (waiting) {
        waiting = false;
        return new Promise<Response>((resolve) => {
          resolveOld = resolve;
        });
      }
      return new Response(JSON.stringify({ message: "Sessão encerrada." }), {
        status: 401,
      });
    }),
  );
  const old = api("/api/foods");
  await api("/api/auth/logout", "POST");
  resolveOld(
    new Response(JSON.stringify({ message: "Sessão anterior encerrada." }), {
      status: 401,
    }),
  );
  await expect(old).rejects.toMatchObject({ status: 401 });
  expect(dispatch).not.toHaveBeenCalled();
  await expect(api("/api/foods")).rejects.toMatchObject({ status: 401 });
  expect(dispatch).toHaveBeenCalledTimes(1);
});
