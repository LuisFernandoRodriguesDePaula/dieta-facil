import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  Check,
  Clock3,
  Settings2,
  Undo2,
  Utensils,
} from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { bases, units } from "../foods/food-types";
import type { Occurrence, Schedule } from "./PlansPage";
import MealDialog from "./MealDialog";
import SwapPanel from "./SwapPanel";
import { useFeatures } from "../care/features";

function message(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Não foi possível conectar. Tente novamente.";
}
type LastAction = { kind: "swap"; id: string };
type MealAction = {
  occurrenceId: string;
  id: string;
  kind: "checkin" | "consumption";
};
export default function DayPanel({
  userId,
  date,
  today,
  timezone,
  clientView = false,
}: {
  userId: string;
  date: string;
  today: string;
  timezone: string;
  clientView?: boolean;
}) {
  const client = useQueryClient();
  const features = useFeatures();
  const schedule = useQuery({
    queryKey: ["schedule", userId, date],
    queryFn: () => api<Schedule>("/api/schedule?date=" + date),
    retry: false,
  });
  const actions = useQuery({
    queryKey: ["meal-actions", userId, date],
    queryFn: () => api<MealAction[]>("/api/meals/checkins?date=" + date),
    retry: false,
  });
  const [consuming, setConsuming] = useState<Occurrence | null>(null);
  const [actual, setActual] = useState<string[]>([]);
  const [swap, setSwap] = useState<{
    meal: Occurrence;
    configure: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const requestKey = useRef({ signature: "", key: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [last, setLast] = useState<LastAction | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const refresh = () => client.invalidateQueries();
  const run = async (
    path: string,
    body: unknown,
    success: string,
    kind?: "consumption" | "checkin",
  ) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    const signature = path + JSON.stringify(body);
    if (requestKey.current.signature !== signature)
      requestKey.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await api<{
        operationId?: string;
        id?: string;
        message?: string;
      }>(
        path,
        "POST",
        kind === "checkin"
          ? { ...(body as object), requestId: requestKey.current.key }
          : body,
        requestKey.current.key,
      );
      requestKey.current = { signature: "", key: "" };
      setNotice(result?.message || success);
      setLast(null);
      await refresh();
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (schedule.isPending || features.isPending || actions.isPending)
    return <p role="status">Carregando suas refeições…</p>;
  if (schedule.isError || features.isError || actions.isError)
    return (
      <div role="alert">
        <p>{message(schedule.error || features.error || actions.error)}</p>
        <button
          onClick={() => {
            void schedule.refetch();
            void features.refetch();
            void actions.refetch();
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  const meals = [...schedule.data.meals].sort(
    (a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name),
  );
  const consumed = meals.filter((m) => m.status === "CONSUMED").length;
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const pending = meals.filter((m) => m.status === "PENDING");
  const next =
    date === today
      ? (pending.find((m) => m.time.slice(0, 5) >= time) ?? pending[0])?.id
      : undefined;
  return (
    <section className="daily-diet" aria-label="Refeições do dia">
      <div className="diet-summary">
        <div>
          <span className="eyebrow">NO SEU RITMO</span>
          <h2>
            {date === today
              ? "Seu dia, refeição por refeição"
              : "Seu planejamento do dia"}
          </h2>
          <p>
            {consumed} de {meals.length} refeições consumidas
          </p>
        </div>
        <progress
          aria-label="Refeições consumidas"
          value={consumed}
          max={meals.length || 1}
        />
      </div>
      <p className="diet-timezone">
        Horários em {schedule.data.timezone}. Registrar “Já comi” é opcional;
        uma refeição sem registro não significa que você deixou de comer.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <div role="status" className="diet-feedback">
          <span>{notice}</span>
          {last && (
            <button
              disabled={busy}
              onClick={() =>
                run(
                  "/api/schedule/substitute/undo",
                  { actionId: last.id },
                  "Troca desfeita.",
                )
              }
            >
              <Undo2 size={16} /> Desfazer
            </button>
          )}
        </div>
      )}
      {!meals.length && (
        <div className="diet-empty">
          <Utensils size={32} />
          <h2>Seu dia começa por aqui</h2>
          <p>Nenhuma refeição prevista neste dia.</p>
          <Link
            to={clientView ? "/conta/nutricionista" : "/conta/dieta?editar=1"}
          >
            {clientView ? "Ver meu acompanhamento" : "Organizar minha dieta"}
          </Link>
        </div>
      )}
      <div className="meal-timeline">
        {meals.map((meal) => (
          <article
            className={
              "daily-meal " +
              (meal.id === next ? "is-next " : "") +
              (meal.status === "CONSUMED" ? "is-consumed" : "")
            }
            key={meal.id}
            aria-label={meal.name}
          >
            <header className="daily-meal-header">
              <span className="diet-meal-time">
                <Clock3 size={17} />
                <time>{meal.time.slice(0, 5)}</time>
              </span>
              <span
                className={"meal-status status-" + meal.status.toLowerCase()}
              >
                {meal.status === "CONSUMED"
                  ? "Consumida"
                  : meal.status === "SKIPPED"
                    ? "Pulada"
                    : meal.id === next
                      ? "A seguir"
                      : "Prevista"}
              </span>
            </header>
            <h2>{meal.name}</h2>
            <ul className="meal-foods">
              {meal.items.map((item, i) => (
                <li key={i}>
                  <span>
                    {item.name}
                    <small>{bases[item.basis]}</small>
                  </span>
                  <strong>
                    {Number(item.quantity).toLocaleString("pt-BR", {
                      maximumFractionDigits: 6,
                    })}{" "}
                    {units[item.unit]}
                  </strong>
                </li>
              ))}
            </ul>
            <footer className="daily-meal-actions">
              {meal.status === "CONSUMED" &&
                actions.data
                  .filter((a) => a.occurrenceId === meal.id)
                  .map((action) => (
                    <button
                      key={action.id}
                      disabled={busy}
                      aria-label={"Desfazer consumo de " + meal.name}
                      onClick={() =>
                        run(
                          action.kind === "checkin"
                            ? "/api/meals/checkins/undo"
                            : "/api/inventory/reversals",
                          action.kind === "checkin"
                            ? { id: action.id }
                            : { operationId: action.id },
                          "Registro da refeição desfeito.",
                        )
                      }
                    >
                      <Undo2 size={16} /> Desfazer refeição
                    </button>
                  ))}
              {meal.status === "PENDING" && date >= today && (
                <button
                  disabled={busy}
                  onClick={() => setSwap({ meal, configure: false })}
                >
                  <ArrowLeftRight size={16} /> Trocar alimento
                </button>
              )}
              {meal.status === "PENDING" && date <= today && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    if (!features.data.inventoryEnabled) {
                      void run(
                        "/api/meals/checkins",
                        {
                          date,
                          mealId: meal.mealId,
                          items: meal.items.map(
                            ({ foodId, quantity, unit, basis }) => ({
                              foodId,
                              quantity,
                              unit,
                              basis,
                            }),
                          ),
                        },
                        "Refeição registrada.",
                        "checkin",
                      );
                      return;
                    }
                    setConsuming(meal);
                    setActual(meal.items.map((i) => i.quantity));
                  }}
                >
                  <Check size={17} />{" "}
                  {clientView ? "Já comi" : "Confirmar consumo"}
                </button>
              )}
              {!clientView && meal.status !== "CONSUMED" && date <= today && (
                <button
                  className="meal-text-button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      "/api/schedule/skip",
                      {
                        date,
                        mealId: meal.mealId,
                        skipped: meal.status !== "SKIPPED",
                      },
                      meal.status === "SKIPPED"
                        ? "Refeição voltou a prevista."
                        : "Refeição pulada. O estoque não mudou.",
                    )
                  }
                >
                  {meal.status === "SKIPPED"
                    ? "Voltar a prevista"
                    : "Marcar como pulada"}
                </button>
              )}
              {!clientView && meal.status === "PENDING" && date >= today && (
                <button
                  className="meal-text-button"
                  aria-label={"Configurar trocas de " + meal.name}
                  disabled={busy}
                  onClick={() => setSwap({ meal, configure: true })}
                >
                  <Settings2 size={16} /> Configurar trocas
                </button>
              )}
            </footer>
          </article>
        ))}
      </div>
      {consuming && (
        <MealDialog
          title={"Confirmar consumo de " + consuming.name}
          busy={busy}
          onClose={() => setConsuming(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run(
                  clientView
                    ? "/api/meals/checkins"
                    : "/api/inventory/consumptions",
                  {
                    date,
                    mealId: consuming.mealId,
                    items: consuming.items.map((item, i) => ({
                      foodId: item.foodId,
                      basis: item.basis,
                      quantity: clientView ? item.quantity : actual[i],
                      unit: item.unit,
                    })),
                  },
                  "Refeição consumida. Estoque atualizado.",
                  clientView ? "checkin" : "consumption",
                )
              )
                setConsuming(null);
            }}
          >
            <p>
              Confira as porções que você comeu. Ao confirmar, elas serão
              baixadas do estoque. Alimentos preparados usam o saldo preparado.
            </p>
            {clientView && (
              <ul className="meal-foods">
                {consuming.items.map((item, i) => (
                  <li key={i}>
                    <span>
                      {item.name}
                      <small>{bases[item.basis]}</small>
                    </span>
                    <strong>
                      {item.quantity} {units[item.unit]}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
            <fieldset disabled={busy}>
              {!clientView &&
                consuming.items.map((item, i) => (
                  <label key={i}>
                    {item.name} · {bases[item.basis]} ({units[item.unit]})
                    <input
                      required
                      type="number"
                      min={item.unit === "UNIT" ? 1 : 0.000001}
                      step={item.unit === "UNIT" ? 1 : 0.000001}
                      value={actual[i]}
                      onChange={(e) =>
                        setActual((old) =>
                          old.map((v, k) => (k === i ? e.target.value : v)),
                        )
                      }
                    />
                  </label>
                ))}
              <div className="plan-actions">
                <button className="button">
                  {busy ? "Confirmando…" : "Confirmar e baixar estoque"}
                </button>
                <button type="button" onClick={() => setConsuming(null)}>
                  Cancelar
                </button>
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </form>
        </MealDialog>
      )}
      {swap && (
        <SwapPanel
          userId={userId}
          date={date}
          meal={swap.meal}
          configure={swap.configure}
          onClose={() => setSwap(null)}
          onSaved={async (id, text) => {
            setLast({ kind: "swap", id });
            setNotice(text);
            setSwap(null);
            await refresh();
          }}
        />
      )}
    </section>
  );
}
