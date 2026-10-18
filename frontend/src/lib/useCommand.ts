import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
export function useCommand() {
  const client = useQueryClient();
  const previous = useRef({ signature: "", key: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const run = async (path: string, body: unknown) => {
    if (busy) return false;
    const signature = path + JSON.stringify(body);
    if (previous.current.signature !== signature)
      previous.current = { signature, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, "POST", body, previous.current.key);
      previous.current = { signature: "", key: "" };
      setNotice("Operação registrada.");
      await client.invalidateQueries();
      return true;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Falha de conexão. Tente novamente com os mesmos dados.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error, notice };
}
