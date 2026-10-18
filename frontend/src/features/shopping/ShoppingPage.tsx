import { useShoppingPreferences, nextPurchase } from "./preferences";
import type { ShoppingPreferences } from "./preferences";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../auth/session";
import { localDate } from "../../lib/dates";
import { EntryForm } from "../inventory/InventoryPage";
import { PersonalNav } from "../personal";
import { useCommand } from "../../lib/useCommand";
import { useFoods } from "../foods/useFoods";
import { bases, units } from "../foods/food-types";
import type { Basis, Unit } from "../foods/food-types";
type Row = {
  foodId: string;
  name: string;
  basis: Basis;
  unit: Unit;
  demand: string;
  available: string;
  covered: string;
  shortage: string;
  firstShortage: string | null;
  knowledge: string;
  unknownExpiry: boolean;
  frequency: string;
};
type Projection = {
  from: string;
  until: string;
  rows: Row[];
  warnings: string[];
};
type List = {
  id: string;
  version: number;
  status: string;
  projection: Projection;
  adjustments: Record<string, string>;
  received: Record<string, string>;
  stale: boolean;
  createdAt: string;
};
const rowKey = (row: Row) => row.foodId + ":" + row.basis;
const statuses: Record<string, string> = {
  DRAFT: "Planejada",
  PARTIAL: "Recebida parcialmente",
  COMPLETED: "Encerrada",
  CANCELLED: "Cancelada",
};
export default function ShoppingPage() {
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
    <ShoppingLoader
      key={session.data.id}
      userId={session.data.id}
      today={localDate(session.data.timezone)}
    />
  );
}
function ShoppingLoader({ userId, today }: { userId: string; today: string }) {
  const preferences = useShoppingPreferences(userId);
  if (preferences.isPending)
    return (
      <main className="plan-page" role="status">
        Carregando preferências…
      </main>
    );
  if (preferences.isError)
    return (
      <main className="plan-page">
        <p role="alert">Falha ao carregar preferências.</p>
        <button onClick={() => preferences.refetch()}>Tentar novamente</button>
      </main>
    );
  return (
    <Shopping
      userId={userId}
      today={today}
      initialPreferences={preferences.data}
    />
  );
}
function Shopping({
  userId,
  today,
  initialPreferences,
}: {
  userId: string;
  today: string;
  initialPreferences: ShoppingPreferences;
}) {
  const client = useQueryClient();
  const command = useCommand();
  const foods = useFoods(userId);
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState(initialPreferences.nextPurchase);
  const [cycle, setCycle] = useState(initialPreferences.cycle);
  const [weekday, setWeekday] = useState(initialPreferences.weekday);
  const [monthDay, setMonthDay] = useState(initialPreferences.monthDay);
  const [preferencesNotice, setPreferencesNotice] = useState("");
  const [range, setRange] = useState<{ from: string; until: string } | null>(
    null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lists = useQuery({
    queryKey: ["shopping-lists", userId],
    queryFn: () => api<List[]>("/api/shopping/lists"),
    retry: false,
  });
  const preview = useQuery({
    queryKey: ["projection", userId, range],
    queryFn: () =>
      api<Projection>(
        "/api/shopping/projection?from=" +
          range!.from +
          "&until=" +
          range!.until,
      ),
    enabled: !!range,
    retry: false,
  });
  const active = lists.data?.find((l) => l.id === selected);
  const generate = async () => {
    if (!range) return;
    setBusy(true);
    setError("");
    try {
      const list = await api<List>("/api/shopping/lists", "POST", range);
      await lists.refetch();
      setSelected(list.id);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Não foi possível salvar a lista.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="plan-page">
      <PersonalNav />
      <p className="eyebrow">COMPRAR COM CLAREZA</p>
      <h1>Minhas compras</h1>
      <p>
        Compare a dieta com o estoque até a próxima compra. Criar uma lista não
        adiciona produtos ao estoque.
      </p>
      <form
        className="plan-meal"
        onSubmit={(e) => {
          e.preventDefault();
          setRange({ from, until });
        }}
      >
        <h2>Planejar o período</h2>
        <div className="plan-item">
          <label>
            Ritmo de compras
            <select
              value={cycle}
              onChange={(e) => {
                setCycle(e.target.value);
                setUntil(nextPurchase(from, e.target.value, weekday, monthDay));
              }}
            >
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
            </select>
          </label>
          {cycle === "WEEKLY" ? (
            <label>
              Dia da semana
              <select
                value={weekday}
                onChange={(e) => {
                  const day = Number(e.target.value);
                  setWeekday(day);
                  setUntil(nextPurchase(from, cycle, day, monthDay));
                }}
              >
                {[
                  "Segunda",
                  "Terça",
                  "Quarta",
                  "Quinta",
                  "Sexta",
                  "Sábado",
                  "Domingo",
                ].map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Dia do mês
              <input
                type="number"
                required
                min="1"
                max="31"
                value={monthDay}
                onChange={(e) => {
                  const day = Number(e.target.value);
                  setMonthDay(day);
                  if (day >= 1 && day <= 31)
                    setUntil(nextPurchase(from, cycle, weekday, day));
                }}
              />
            </label>
          )}
          <label>
            Comprar em
            <input
              type="date"
              required
              min={today}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setUntil(
                  nextPurchase(e.target.value, cycle, weekday, monthDay),
                );
              }}
            />
          </label>
          <label>
            Próxima compra
            <input
              type="date"
              required
              min={from}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <button className="button">Calcular necessidade</button>
        </div>
        <p>
          O cálculo inclui o dia da compra atual e vai até a véspera da próxima.
          Você pode ajustar as datas.
        </p>
      </form>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api("/api/shopping/preferences", "PUT", {
              cycle,
              weekday,
              monthDay,
            });
            setPreferencesNotice("Ritmo de compras salvo.");
            await client.invalidateQueries({
              queryKey: ["shopping-preferences", userId],
            });
            await client.invalidateQueries({
              queryKey: ["dashboard-coverage", userId],
            });
          } catch (e) {
            setError(
              e instanceof ApiError
                ? e.message
                : "Falha ao salvar preferência.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        Salvar ritmo de compras
      </button>
      {preferencesNotice && <p role="status">{preferencesNotice}</p>}
      {preview.isFetching && <p role="status">Calculando…</p>}
      {preview.isError && (
        <p role="alert">
          {preview.error instanceof ApiError
            ? preview.error.message
            : "Falha ao calcular."}
        </p>
      )}
      {preview.data && (
        <section>
          <h2>Sugestão para o período</h2>
          <ProjectionRows projection={preview.data} />
          <button className="button" disabled={busy} onClick={generate}>
            Salvar lista de compras
          </button>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      <section className="plan-meal">
        <h2>Listas salvas</h2>
        {lists.isPending ? (
          <p>Carregando listas…</p>
        ) : lists.isError ? (
          <p role="alert">
            Falha ao carregar listas.{" "}
            <button onClick={() => lists.refetch()}>Tentar novamente</button>
          </p>
        ) : !lists.data?.length ? (
          <p>Nenhuma lista salva.</p>
        ) : (
          <div className="plan-actions">
            {lists.data.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l.id)}
                aria-pressed={selected === l.id}
              >
                {l.projection.from} a {l.projection.until} ·{" "}
                {statuses[l.status]}
              </button>
            ))}
          </div>
        )}
      </section>
      {active && (
        <ListEditor
          key={active.id + ":" + active.version}
          list={active}
          busy={busy}
          update={async (body) => {
            setBusy(true);
            setError("");
            try {
              await api("/api/shopping/lists/" + active.id, "PUT", {
                version: active.version,
                ...body,
              });
              await lists.refetch();
            } catch (e) {
              setError(e instanceof ApiError ? e.message : "Falha ao salvar.");
            } finally {
              setBusy(false);
            }
          }}
          recalculate={async () => {
            setBusy(true);
            setError("");
            try {
              await api(
                "/api/shopping/lists/" + active.id + "/recalculate",
                "POST",
                { version: active.version },
              );
              await lists.refetch();
            } catch (e) {
              setError(
                e instanceof ApiError ? e.message : "Falha ao recalcular.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {foods.data && (
        <section>
          <p>
            {active
              ? "O recebimento será vinculado à lista selecionada."
              : "Sem lista selecionada: o recebimento será registrado como compra avulsa."}
          </p>
          {active && (
            <button onClick={() => setSelected(null)}>
              Registrar compra avulsa
            </button>
          )}
          <EntryForm
            key={active?.id || "avulsa"}
            foods={foods.data}
            today={today}
            busy={
              command.busy ||
              (!!active && ["COMPLETED", "CANCELLED"].includes(active.status))
            }
            purchase
            submit={async (entry) => {
              const ok = await command.run("/api/shopping/receipts", {
                listId: active?.id || null,
                entry,
              });
              if (ok)
                await client.invalidateQueries({ queryKey: ["projection"] });
              return ok;
            }}
          />
        </section>
      )}
      {command.error && (
        <p role="alert" className="form-error">
          {command.error}
        </p>
      )}
      {command.notice && (
        <p role="status" className="form-success">
          {command.notice}
        </p>
      )}
    </main>
  );
}
function ProjectionRows({ projection }: { projection: Projection }) {
  const [showCovered, setShowCovered] = useState(false);
  return (
    <>
      {projection.warnings.map((w) => (
        <p className="form-notice" key={w}>
          {w}
        </p>
      ))}
      {projection.rows.some((row) => Number(row.shortage) === 0) && (
        <button type="button" onClick={() => setShowCovered(!showCovered)}>
          {showCovered
            ? "Ocultar alimentos já cobertos"
            : "Mostrar alimentos já cobertos"}
        </button>
      )}
      {projection.rows
        .filter((row) => showCovered || Number(row.shortage) > 0)
        .map((row) => (
          <article className="plan-meal" key={rowKey(row)}>
            <h3>
              {row.name} · {bases[row.basis]}
            </h3>
            <p>
              Necessário:{" "}
              <strong>
                {row.demand} {units[row.unit]}
              </strong>{" "}
              · Em estoque no início: {row.available} · Cobertura calculada:{" "}
              {row.covered}
            </p>
            <p>
              Falta no período:{" "}
              <strong>
                {row.shortage} {units[row.unit]}
              </strong>
              {row.firstShortage
                ? " · Primeira falta: " + row.firstShortage
                : ""}
            </p>
            {row.knowledge !== "KNOWN" && (
              <p>
                Saldo {row.knowledge === "UNKNOWN" ? "desconhecido" : "parcial"}
                : confira os produtos que já tem.
              </p>
            )}
            {row.unknownExpiry && (
              <p>Cobertura estimada: há lote sem validade.</p>
            )}
          </article>
        ))}
    </>
  );
}
function ListEditor({
  list,
  busy,
  update,
  recalculate,
}: {
  list: List;
  busy: boolean;
  update: (body: {
    adjustments: Record<string, string>;
    status: string;
  }) => Promise<void>;
  recalculate: () => Promise<void>;
}) {
  const [adjustments, setAdjustments] = useState(list.adjustments);
  const [status, setStatus] = useState(list.status);
  const [showAll, setShowAll] = useState(false);
  const closed = ["COMPLETED", "CANCELLED"].includes(list.status);
  return (
    <section className="plan-meal">
      <h2>Lista selecionada · {statuses[list.status]}</h2>
      {list.stale && (
        <p className="form-notice" role="status">
          Dieta, estoque ou período mudaram. Esta lista mostra um cálculo
          anterior. Recalcule para atualizar a necessidade; os ajustes manuais
          dos itens que continuarem serão mantidos.
        </p>
      )}
      <button disabled={busy || closed} onClick={recalculate}>
        Recalcular necessidade atual
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void update({ adjustments, status });
        }}
      >
        <fieldset
          disabled={busy || list.status === "CANCELLED"}
          style={{ border: 0, padding: 0, minWidth: 0 }}
        >
          <button type="button" onClick={() => setShowAll(!showAll)}>
            {showAll
              ? "Exibir só itens necessários"
              : "Mostrar todos os itens do plano"}
          </button>
          {list.projection.rows
            .filter(
              (row) =>
                showAll ||
                Number(adjustments[rowKey(row)] ?? row.shortage) > 0 ||
                Number(list.received[rowKey(row)] || 0) > 0,
            )
            .map((row) => (
              <div className="plan-meal" key={rowKey(row)}>
                <strong>
                  {row.name} · {bases[row.basis]}
                </strong>
                <p>
                  Sugestão do cálculo salvo: {row.shortage} {units[row.unit]} ·
                  Recebido nesta lista: {list.received[rowKey(row)] || "0"}{" "}
                  {units[row.unit]}
                </p>
                <label>
                  Quantidade planejada ({units[row.unit]})
                  <input
                    required
                    type="number"
                    min="0"
                    step={row.unit === "UNIT" ? 1 : "0.000001"}
                    value={adjustments[rowKey(row)] ?? row.shortage}
                    onChange={(e) =>
                      setAdjustments({
                        ...adjustments,
                        [rowKey(row)]: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
            ))}
          <label>
            Situação da lista
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(statuses).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <div className="plan-actions">
            <button className="button">Salvar ajustes e situação</button>
          </div>
        </fieldset>
      </form>
      <p>
        Encerrar ou cancelar a lista não movimenta o estoque. As quantidades
        recebidas são registradas separadamente, no formulário de recebimento.
      </p>
    </section>
  );
}
