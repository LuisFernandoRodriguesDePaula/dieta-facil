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
