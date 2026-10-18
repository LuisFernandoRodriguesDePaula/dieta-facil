import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useSession } from "./session";
import { PersonalNav } from "../personal";
import "../plans/plans.css";
export default function SecurityPage() {
  const session = useSession();
  if (session.isPending)
    return (
      <main className="plan-page" role="status">
        Verificando sessão…
      </main>
    );
  if (session.isError)
    return (
      <main className="plan-page">
        <p role="alert">Falha ao verificar sua conta.</p>
        <button onClick={() => session.refetch()}>Tentar novamente</button>
      </main>
    );
  if (!session.data) return <Navigate to="/entrar" replace />;
  return (
    <Security
      key={session.data.id}
      email={session.data.email}
      userId={session.data.id}
    />
  );
}
function Security({ email, userId }: { email: string; userId: string }) {
  const status = useQuery({
    queryKey: ["account-status", userId],
    queryFn: () =>
      api<{
        emailVerified: boolean;
        emailVerificationRequired: boolean;
        recoveryAvailable: boolean;
      }>("/api/account/status"),
    retry: false,
  });

  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const send = async (kind: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ message: string }>(
        "/api/auth/" + kind,
        "POST",
        { email },
      );
      setNotice(result.message);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Falha ao enviar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="plan-page">
      <PersonalNav />
      <h1>Segurança e privacidade</h1>
      <section className="plan-meal">
        <h2>Seu acesso</h2>
        <p>{email}</p>
        {status.isPending ? (
          <p role="status">Carregando situação…</p>
        ) : status.isError ? (
          <p role="alert">
            Falha ao verificar confirmação.{" "}
            <button onClick={() => status.refetch()}>Tentar novamente</button>
          </p>
        ) : (
          <p>
            {status.data.emailVerified
              ? "E-mail confirmado."
              : "E-mail ainda não confirmado."}
          </p>
        )}
        <div className="plan-actions">
          <button disabled={busy} onClick={() => send("forgot-password")}>
            Receber link para trocar senha
          </button>
          {!status.data?.emailVerified && (
            <button disabled={busy} onClick={() => send("resend-verification")}>
              Reenviar confirmação de e-mail
            </button>
          )}
        </div>
        <p>
          Depois de redefinir a senha, entre novamente nos seus dispositivos.
        </p>
      </section>
      <section className="plan-meal">
        <h2>Excluir minha conta</h2>
        <p>
          A exclusão remove o perfil, alimentos, dieta, estoque, compras e
          histórico desta conta do banco ativo. É definitiva. Cópias de
          segurança seguem a política de retenção do operador.
        </p>
        {deleting ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("/api/account", "DELETE", { password, confirmation });
                window.location.replace("/entrar?conta=excluida");
              } catch (e) {
                setError(
                  e instanceof ApiError
                    ? e.message
                    : "Falha ao excluir. Confira se a operação foi concluída antes de tentar novamente.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Senha atual
              <input
                required
                type="password"
                autoComplete="current-password"
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Digite EXCLUIR para confirmar
              <input
                required
                pattern="EXCLUIR"
                autoComplete="off"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <div className="plan-actions">
              <button
                className="danger-button"
                disabled={busy || confirmation !== "EXCLUIR"}
              >
                Excluir definitivamente minha conta
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDeleting(false);
                  setPassword("");
                  setConfirmation("");
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button className="danger-button" onClick={() => setDeleting(true)}>
            Quero excluir minha conta
          </button>
        )}
      </section>
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
    </main>
  );
}
