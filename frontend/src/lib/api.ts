let authEpoch = 0;
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.message ?? "Não foi possível concluir. Tente novamente.",
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  operationKey?: string,
): Promise<T> {
  const requestEpoch = authEpoch;
  const headers: Record<string, string> = {};
  if (operationKey) headers["Idempotency-Key"] = operationKey;
  if (method !== "GET") {
    const csrf = await readResponse<{ token: string; headerName: string }>(
      await fetch("/api/auth/csrf", {
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
    headers[csrf.headerName] = csrf.token;
    if (body !== undefined) headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (
    requestEpoch === authEpoch &&
    response.status === 401 &&
    path !== "/api/me" &&
    !path.startsWith("/api/auth/")
  )
    window.dispatchEvent(new Event("dieta-facil-session-expired"));
  if (
    response.ok &&
    ((method === "POST" &&
      [
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/reset-password",
      ].includes(path)) ||
      (method === "DELETE" && path === "/api/account"))
  )
    authEpoch++;
  return readResponse<T>(response);
}
