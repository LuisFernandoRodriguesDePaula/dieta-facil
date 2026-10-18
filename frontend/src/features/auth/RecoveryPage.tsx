import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { sessionKey } from "./session";
import "./auth.css";
export default function RecoveryPage({
  mode,
}: {
  mode: "forgot" | "reset" | "verify";
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
  );
  const [purpose, setPurpose] = useState("RESET");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const client = useQueryClient();
  const navigate = useNavigate();
  const submit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (
      mode === "reset" &&
      (password !== confirmation ||
        new TextEncoder().encode(password).length > 72)
    ) {
      setError("As senhas devem coincidir e ter até 72 bytes.");
      return;
    }
    if (mode !== "forgot" && !token) {
      setError("Este link está incompleto. Solicite um novo link.");
      return;
    }
    setBusy(true);
    try {
      const path =
        mode === "forgot"
          ? purpose === "RESET"
            ? "forgot-password"
            : "resend-verification"
          : mode === "reset"
            ? "reset-password"
            : "verify-email";
      const result = await api<{ message: string }>(
        "/api/auth/" + path,
        "POST",
        mode === "forgot"
          ? { email }
          : mode === "reset"
            ? { token, password }
            : { token },
      );
      setNotice(result.message);
      if (mode !== "forgot")
        window.history.replaceState(null, "", window.location.pathname);
      if (mode === "reset") {
        client.clear();
        client.setQueryData(sessionKey, null);
        navigate("/entrar", {
          replace: true,
          state: { passwordChanged: true },
        });
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="access-layout">
      <aside className="access-intro">
        <Link className="access-brand" to="/">
          Dieta Fácil
        </Link>
        <h1>
          Seu acesso,
          <br />
          com segurança.
        </h1>
        <p>
          Use os links enviados ao seu e-mail para recuperar o acesso ou
          confirmar sua conta.
        </p>
      </aside>
      <div className="access-main">
        <section className="access-card">
          <h2>
            {mode === "forgot"
              ? "Recuperar acesso"
              : mode === "reset"
                ? "Criar nova senha"
                : "Confirmar meu e-mail"}
          </h2>
          <form onSubmit={submit}>
            <fieldset
              disabled={busy}
              style={{ border: 0, padding: 0, minWidth: 0 }}
            >
              {mode === "forgot" && (
                <>
                  <label htmlFor="recovery-email">E-mail da conta</label>
                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="username"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label htmlFor="recovery-purpose">O que você precisa?</label>
                  <select
                    id="recovery-purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  >
                    <option value="RESET">Redefinir minha senha</option>
                    <option value="VERIFY">
                      Reenviar confirmação de e-mail
                    </option>
                  </select>
                </>
              )}
              {mode === "reset" && (
                <>
                  <label htmlFor="recovery-password">Nova senha</label>
                  <input
                    id="recovery-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <label htmlFor="recovery-confirmation">
                    Repita a nova senha
                  </label>
                  <input
                    id="recovery-confirmation"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={10}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </>
              )}
              {mode === "verify" && (
                <p>
                  Confirme para vincular este endereço à sua conta. O link só
                  pode ser usado uma vez.
                </p>
              )}
              <button
                className="button access-submit"
                disabled={
                  busy ||
                  (mode !== "forgot" && !token) ||
                  (!!notice && mode === "verify")
                }
              >
                {busy
                  ? "Enviando…"
                  : mode === "forgot"
                    ? "Enviar link"
                    : mode === "reset"
                      ? "Salvar nova senha"
                      : "Confirmar e-mail"}
              </button>
            </fieldset>
          </form>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="form-success">
              {notice}
            </p>
          )}
          <p className="access-switch">
            <Link to="/entrar">Voltar para entrar</Link> ·{" "}
            <Link to="/recuperar-senha">Solicitar novo link</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
