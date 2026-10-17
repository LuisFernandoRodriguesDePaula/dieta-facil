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
): Promise<T> {
  const headers: Record<string, string> = {};
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
  return readResponse<T>(
    await fetch(path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}
