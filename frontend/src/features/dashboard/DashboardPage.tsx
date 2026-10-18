import { useShoppingPreferences } from "../shopping/preferences";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../auth/session";
import { PersonalNav } from "../personal";
import { localDate } from "../../lib/dates";
import { units, bases } from "../foods/food-types";
import type { Stock } from "../inventory/InventoryPage";
import type { Basis } from "../foods/food-types";
import "../plans/plans.css";
export default function DashboardPage() {
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
        <p role="alert">Não foi possível verificar a sessão.</p>
        <button onClick={() => session.refetch()}>Tentar novamente</button>
      </main>
    );
  if (!session.data)
    return <Navigate to="/entrar" replace state={{ requiresLogin: true }} />;
  return (
    <Dashboard
      key={session.data.id}
      userId={session.data.id}
      name={session.data.name}
      today={localDate(session.data.timezone)}
    />
  );
}
function Dashboard({
  userId,
  name,
  today,
}: {
  userId: string;
  name: string;
  today: string;
}) {
  const preferences = useShoppingPreferences(userId);
  const untilDate = new Date(today + "T12:00:00Z");
  untilDate.setUTCDate(untilDate.getUTCDate() + 7);
  const until =
    preferences.data?.nextPurchase || untilDate.toISOString().slice(0, 10);
  const soonDate = new Date(today + "T12:00:00Z");
  soonDate.setUTCDate(soonDate.getUTCDate() + 3);
  const soon = soonDate.toISOString().slice(0, 10);
  const stock = useQuery({
    queryKey: ["stock", userId],
    queryFn: () => api<Stock>("/api/inventory"),
    retry: false,
  });
  const projection = useQuery({
    enabled: !!preferences.data,
    queryKey: ["dashboard-coverage", userId, today, until],
    queryFn: () =>
      api<{
        rows: {
          foodId: string;
          name: string;
          basis: Basis;
          shortage: string;
          knowledge: string;
          unknownExpiry: boolean;
          firstShortage: string | null;
        }[];
      }>("/api/shopping/projection?from=" + today + "&until=" + until),
    retry: false,
  });
  const [scenario, setScenario] = useState("basic");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const client = useQueryClient();
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ message: string }>(
        "/api/onboarding/scenario?type=" + scenario,
        "POST",
      );
      setNotice(result.message);
      setConfirm(false);
      await client.invalidateQueries();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Não foi possível carregar o cenário.",
      );
    } finally {
      setBusy(false);
    }
  };
  const lots = stock.data?.lots.filter((l) => Number(l.quantity) > 0) || [];
  const expiring = lots.filter(
    (l) => l.expiry && l.expiry >= today && l.expiry <= soon,
  );
  const expired = lots.filter((l) => l.expiry && l.expiry < today);
  const unknown = lots.filter((l) => !l.expiry);
  return (
    <main className="plan-page">
      <PersonalNav />
      <p className="eyebrow">UMA ROTINA MAIS ORGANIZADA</p>
      <h1>Olá, {name.split(" ")[0]}.</h1>
      <p>Dieta, alimentos em casa e próximas compras no mesmo lugar.</p>
      <div className="dashboard-cards">
        <Link className="plan-meal" to="/conta/agenda">
          <h2>O que comer hoje</h2>
          <p>Abra sua agenda e confirme o que foi consumido.</p>
        </Link>
        <Link className="plan-meal" to="/conta/compras">
          <h2>O que precisa comprar</h2>
          <p>Calcule a necessidade até a próxima compra.</p>
        </Link>
        <Link className="plan-meal" to="/conta/estoque">
          <h2>O que já tem em casa</h2>
          <p>Confira lotes, quantidades e validades.</p>
        </Link>
      </div>
      {(stock.isPending ||
        (projection.isPending && !preferences.isError) ||
        preferences.isPending) && <p role="status">Carregando seu resumo…</p>}
      {(stock.isError || projection.isError || preferences.isError) && (
        <p role="alert">
          Parte do resumo não foi carregada.{" "}
          <button
            onClick={() => {
              void preferences.refetch();
              void stock.refetch();
              void projection.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {stock.data && (
        <section className="plan-meal">
          <h2>Atenção ao estoque</h2>
          {expired.length > 0 && (
            <>
              <h3>Validade ultrapassada</h3>
              {expired.map((l) => (
                <p key={l.id}>
                  {l.name} · {l.quantity} {units[l.unit]} · {l.expiry}
                </p>
              ))}
            </>
          )}
          <h3>Validades nos próximos 3 dias</h3>
          {expiring.length ? (
            expiring.map((l) => (
              <p key={l.id}>
                {l.name} · {bases[l.basis]} · {l.quantity} {units[l.unit]} ·{" "}
                {l.expiry}
              </p>
            ))
          ) : (
            <p>Nenhum lote cadastrado nessa faixa.</p>
          )}
          {unknown.length > 0 && (
            <p>
              {unknown.length} lote(s) sem validade informada. Confira no{" "}
              <Link to="/conta/estoque">estoque</Link>.
            </p>
          )}
          <small>
            As datas são as cadastradas por você. Elas não confirmam as
            condições de consumo.
          </small>
        </section>
      )}
      {projection.data && (
        <section className="plan-meal">
          <h2>Cobertura até a próxima compra</h2>
          {!projection.data.rows.length ? (
            <p>
              Comece pelo <Link to="/conta/alimentos">catálogo</Link> e pela{" "}
              <Link to="/conta/dieta">dieta</Link>, ou carregue o cenário
              fictício em uma conta vazia.
            </p>
          ) : (
            projection.data.rows.map((r) => (
              <p key={r.foodId + r.basis}>
                <strong>{r.name}</strong> · {bases[r.basis]}:{" "}
                {r.firstShortage
                  ? "primeira falta em " + r.firstShortage
                  : "quantidade cadastrada cobre o período"}
                {r.knowledge !== "KNOWN" ? " · estoque a conferir" : ""}
                {r.unknownExpiry ? " · validade desconhecida na cobertura" : ""}
              </p>
            ))
          )}
        </section>
      )}
      <section className="plan-meal">
        <h2>Experimentar com dados fictícios</h2>
        <p>
          Em uma conta vazia, carregue alimentos, dieta e lotes de exemplo para
          explorar o fluxo. Isso adiciona dados nesta conta e só pode ser feito
          uma vez. As validades e quantidades são fictícias.
        </p>
        <label>
          Cenário de demonstração
          <select
            value={scenario}
            disabled={busy || confirm}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option value="basic">Rotina simples</option>
            <option value="hypertrophy">
              Treino de hipertrofia · exemplo 82 kg / 1,80 m
            </option>
          </select>
        </label>
        {scenario === "hypertrophy" && (
          <p>
            Cinco refeições com fontes variadas de proteína, carboidratos,
            frutas e legumes. Exemplo para adulto fictício; porções não
            individualizadas. Cru e preparado ficam separados e as validades
            começam desconhecidas.
          </p>
        )}
        {confirm ? (
          <>
            <p>Carregar o cenário nesta conta?</p>
            <div className="plan-actions">
              <button className="button" disabled={busy} onClick={load}>
                Confirmar carga fictícia
              </button>
              <button disabled={busy} onClick={() => setConfirm(false)}>
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setConfirm(true)}>
            Carregar cenário fictício
          </button>
        )}
        {notice && (
          <p role="status" className="form-success">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
