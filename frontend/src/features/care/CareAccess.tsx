import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { ApiError } from "../../lib/api";
import { useSession } from "../auth/session";
import { PersonalNav } from "../personal";
import { useFeatures } from "./features";
import "../plans/plans.css";
const failure = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Não foi possível conectar. Tente novamente.";
export function CareLayout({
  children,
  professional = false,
  focused = false,
}: {
  children: ReactNode;
  professional?: boolean;
  focused?: boolean;
}) {
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
        <p role="alert">{failure(session.error)}</p>
        <button onClick={() => session.refetch()}>Tentar novamente</button>
      </main>
    );
  if (!session.data) return <Navigate to="/entrar" replace />;
  return (
    <main className="plan-page">
      {!focused && <PersonalNav />}
      {professional && session.data.role !== "NUTRITIONIST" ? (
        <>
          <h1>Área do nutricionista</h1>
          <p>Acesse sua dieta pelo espaço do cliente.</p>
          <Link to="/conta/dieta">Minha dieta</Link>
        </>
      ) : (
        children
      )}
    </main>
  );
}
export function FeatureGate({
  children,
  professional = false,
}: {
  children: ReactNode;
  professional?: boolean;
}) {
  const session = useSession();
  const features = useFeatures();
  if (session.isPending || (!professional && features.isPending))
    return (
      <main className="plan-page" role="status">
        Carregando recursos…
      </main>
    );
  if (!session.data) return <Navigate to="/entrar" replace />;
  if (!professional && features.isError)
    return (
      <CareLayout>
        <p role="alert">{failure(features.error)}</p>
        <button onClick={() => features.refetch()}>Tentar novamente</button>
      </CareLayout>
    );
  if (
    professional
      ? session.data.role !== "NUTRITIONIST"
      : !features.data?.inventoryEnabled
  )
    return (
      <CareLayout>
        <h1>{professional ? "Dieta acompanhada" : "Recursos Premium"}</h1>
        <p>
          {professional
            ? "Seu nutricionista configura os alimentos e as porções do plano."
            : "Estoque, compras e preparo estão desativados nesta conta. Sua dieta continua disponível."}
        </p>
        <Link to={professional ? "/conta/dieta" : "/conta/premium"}>
          {professional ? "Consultar minha dieta" : "Conhecer os recursos"}
        </Link>
      </CareLayout>
    );
  return children;
}
