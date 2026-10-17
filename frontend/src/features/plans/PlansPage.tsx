import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../auth/session";
import { bases, units, compatibleUnits } from "../foods/food-types";
import type { Basis, Unit, FoodListing, Food } from "../foods/food-types";
import "./plans.css";

type Item = {
  foodId: string;
  name?: string;
  quantity: string;
  unit: Unit;
  basis: Basis;
};
type Meal = {
  id: string;
  name: string;
  time: string;
  days: number[];
  items: Item[];
};
type Plan = {
  version: number;
  effectiveFrom: string | null;
  meals: Meal[];
  revisionDates: string[];
};
type Occurrence = Meal & { mealId: string; date: string; status: string };
type Schedule = { date: string; timezone: string; meals: Occurrence[] };
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export function localDate(timezone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join("-");
}
export default function PlansPage({ agenda = false }: { agenda?: boolean }) {
  const session = useSession();
  if (session.isPending)
    return (
      <main className="plan-page" role="status">
        Verificando sua sessão…
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
    <Workspace
      key={session.data.id + agenda}
      userId={session.data.id}
      timezone={session.data.timezone}
      agenda={agenda}
    />
  );
}
function Workspace({
  userId,
  timezone,
  agenda,
}: {
  userId: string;
  timezone: string;
  agenda: boolean;
}) {
  const today = localDate(timezone);
  const [date, setDate] = useState(today);
  return (
    <main className="plan-page">
      <Link className="access-brand" to="/">
        Dieta Fácil
      </Link>
      <nav aria-label="Área pessoal">
        <Link to="/conta">Minha conta</Link>
        <Link to="/conta/alimentos">Alimentos</Link>
        <Link to="/conta/dieta">Minha dieta</Link>
        <Link to="/conta/agenda">Agenda</Link>
      </nav>
      <p className="eyebrow">SUA ROTINA</p>
      <h1>{agenda ? "Agenda de refeições" : "Minha dieta"}</h1>
      <p>
        {agenda
          ? "Veja as refeições previstas para cada dia. Agendar ou pular uma refeição não movimenta o estoque."
          : "Organize alimentos, quantidades e dias da semana. Cada revisão começa na data escolhida."}
      </p>
      <label className="plan-date">
        {agenda ? "Consultar dia" : "Revisão a partir de"}
        <input
          type="date"
          required
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </label>
      {agenda ? (
        <Agenda key={date} userId={userId} date={date} today={today} />
      ) : (
        <EditorLoader key={date} userId={userId} date={date} today={today} />
      )}
    </main>
  );
}
function failure(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Não foi possível conectar ao serviço. Tente novamente.";
}
function EditorLoader({
  userId,
  date,
  today,
}: {
  userId: string;
  date: string;
  today: string;
}) {
  const plan = useQuery({
    queryKey: ["plan", userId, date],
    queryFn: () => api<Plan>("/api/plan?date=" + date),
    retry: false,
  });
  const foods = useQuery({
    queryKey: ["plan-foods", userId],
    queryFn: () => api<FoodListing>("/api/foods?size=100&archived=false"),
    retry: false,
  });
  if (plan.isPending || foods.isPending)
    return <p role="status">Carregando dieta e alimentos…</p>;
  if (plan.isError || foods.isError)
    return (
      <div role="alert">
        <p>{failure(plan.error || foods.error)}</p>
        <button
          onClick={() => {
            void plan.refetch();
            void foods.refetch();
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  return (
    <Editor
      key={plan.data.version}
      initial={plan.data}
      foods={foods.data.items}
      date={date}
      today={today}
      refresh={() => plan.refetch()}
    />
  );
}
function Editor({
  initial,
  foods,
  date,
  today,
  refresh,
}: {
  initial: Plan;
  foods: Food[];
  date: string;
  today: string;
  refresh: () => unknown;
}) {
  const client = useQueryClient();
  const [meals, setMeals] = useState<Meal[]>(initial.meals);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const patch = (id: string, change: Partial<Meal>) =>
    setMeals((old) => old.map((m) => (m.id === id ? { ...m, ...change } : m)));
  const add = () =>
    setMeals((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        name: "",
        time: "08:00",
        days: [1, 2, 3, 4, 5, 6, 7],
        items: [],
      },
    ]);
  const save = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (meals.some((m) => !m.days.length || !m.items.length)) {
      setError("Escolha pelo menos um dia e um alimento em cada refeição.");
      return;
    }
    setSaving(true);
    try {
      await api<Plan>("/api/plan", "PUT", {
        version: initial.version,
        effectiveFrom: date,
        meals: meals.map((m) => ({
          ...m,
          items: m.items.map(({ foodId, quantity, unit, basis }) => ({
            foodId,
            quantity,
            unit,
            basis,
          })),
        })),
      });
      setNotice("Revisão salva.");
      await client.invalidateQueries({ queryKey: ["schedule"] });
      refresh();
    } catch (err) {
      setError(failure(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={save} className="plan-editor">
      <p>
        Revisões registradas:{" "}
        {initial.revisionDates.length
          ? initial.revisionDates.join(" · ")
          : "nenhuma"}
        .{" "}
        {initial.effectiveFrom &&
          "Exibindo a dieta vigente desde " + initial.effectiveFrom + "."}
      </p>
      {!foods.length && (
        <p className="form-notice">
          Cadastre alimentos no{" "}
          <Link to="/conta/alimentos">catálogo pessoal</Link> para montar suas
          refeições.
        </p>
      )}
      {date < today && (
        <p className="form-notice">
          Consulta de histórico. Para editar, escolha hoje ou uma data futura.
        </p>
      )}
      <fieldset disabled={saving || date < today}>
        {meals.map((meal, index) => (
          <section className="plan-meal" key={meal.id}>
            <div className="plan-row">
              <label>
                Nome da refeição
                <input
                  aria-label={"Nome da refeição " + (index + 1)}
                  required
                  maxLength={100}
                  value={meal.name}
                  onChange={(e) => patch(meal.id, { name: e.target.value })}
                />
              </label>
              <label>
                Horário
                <input
                  type="time"
                  required
                  value={meal.time.slice(0, 5)}
                  onChange={(e) => patch(meal.id, { time: e.target.value })}
                />
              </label>
            </div>
            <div
              className="plan-days"
              role="group"
              aria-label={"Dias de " + (meal.name || "refeição " + (index + 1))}
            >
              {weekdays.map((day, i) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={meal.days.includes(i + 1)}
                    onChange={(e) =>
                      patch(meal.id, {
                        days: e.target.checked
                          ? [...meal.days, i + 1]
                          : meal.days.filter((d) => d !== i + 1),
                      })
                    }
                  />
                  {day}
                </label>
              ))}
            </div>
            {meal.items.map((item, i) => (
              <div className="plan-item" key={i}>
                <label>
                  Alimento
                  <select
                    required
                    value={item.foodId}
                    onChange={(e) => {
                      const food = foods.find((f) => f.id === e.target.value)!;
                      patch(meal.id, {
                        items: meal.items.map((v, k) =>
                          k === i
                            ? { ...v, foodId: food.id, unit: food.unit }
                            : v,
                        ),
                      });
                    }}
                  >
                    {!foods.some((f) => f.id === item.foodId) && (
                      <option value={item.foodId}>
                        {item.name || "Alimento indisponível"} (arquivado)
                      </option>
                    )}
                    {foods.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantidade
                  <input
                    type="number"
                    required
                    min={item.unit === "UNIT" ? 1 : 0.000001}
                    step={item.unit === "UNIT" ? 1 : "0.000001"}
                    value={item.quantity}
                    onChange={(e) =>
                      patch(meal.id, {
                        items: meal.items.map((v, k) =>
                          k === i ? { ...v, quantity: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Unidade
                  <select
                    value={item.unit}
                    onChange={(e) =>
                      patch(meal.id, {
                        items: meal.items.map((v, k) =>
                          k === i ? { ...v, unit: e.target.value as Unit } : v,
                        ),
                      })
                    }
                  >
                    {compatibleUnits(item.unit).map((u) => (
                      <option key={u} value={u}>
                        {units[u]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estado
                  <select
                    value={item.basis}
                    onChange={(e) =>
                      patch(meal.id, {
                        items: meal.items.map((v, k) =>
                          k === i
                            ? { ...v, basis: e.target.value as Basis }
                            : v,
                        ),
                      })
                    }
                  >
                    {Object.entries(bases).map(([v, text]) => (
                      <option key={v} value={v}>
                        {text}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label={
                    "Remover alimento " + (i + 1) + " de " + meal.name
                  }
                  onClick={() =>
                    patch(meal.id, {
                      items: meal.items.filter((_, k) => k !== i),
                    })
                  }
                >
                  Remover
                </button>
              </div>
            ))}
            <div className="plan-actions">
              <button
                type="button"
                disabled={!foods.length || meal.items.length >= 40}
                onClick={() => {
                  const f = foods[0];
                  patch(meal.id, {
                    items: [
                      ...meal.items,
                      {
                        foodId: f.id,
                        quantity: "1",
                        unit: f.unit,
                        basis: "AS_SOLD",
                      },
                    ],
                  });
                }}
              >
                Adicionar alimento
              </button>
              <button
                type="button"
                disabled={meals.length >= 20}
                onClick={() =>
                  setMeals((old) => [
                    ...old,
                    {
                      ...meal,
                      id: crypto.randomUUID(),
                      name: meal.name + " (cópia)",
                      items: meal.items.map((i) => ({ ...i })),
                      days: [...meal.days],
                    },
                  ])
                }
              >
                Duplicar refeição
              </button>
              <button
                type="button"
                onClick={() =>
                  setMeals((old) => old.filter((m) => m.id !== meal.id))
                }
              >
                Excluir refeição
              </button>
            </div>
          </section>
        ))}
        <div className="plan-actions">
          <button type="button" disabled={meals.length >= 20} onClick={add}>
            Adicionar refeição
          </button>
          <button className="button" type="submit">
            {saving ? "Salvando…" : "Salvar revisão"}
          </button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}{" "}
          <button type="button" onClick={() => refresh()}>
            Recarregar dieta
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className="form-success">
          {notice}
        </p>
      )}
      <p className="access-note">
        As quantidades são as que você informa. Cru e preparado são tratados
        separadamente; não há conversão automática de rendimento.
      </p>
    </form>
  );
}
function Agenda({
  userId,
  date,
  today,
}: {
  userId: string;
  date: string;
  today: string;
}) {
  const schedule = useQuery({
    queryKey: ["schedule", userId, date],
    queryFn: () => api<Schedule>("/api/schedule?date=" + date),
    retry: false,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const skip = async (meal: Occurrence) => {
    setPending(true);
    setError("");
    try {
      await api("/api/schedule/skip", "POST", {
        date,
        mealId: meal.mealId,
        skipped: meal.status !== "SKIPPED",
      });
      await schedule.refetch();
    } catch (e) {
      setError(failure(e));
    } finally {
      setPending(false);
    }
  };
  if (schedule.isPending) return <p role="status">Carregando agenda…</p>;
  if (schedule.isError)
    return (
      <div role="alert">
        <p>{failure(schedule.error)}</p>
        <button onClick={() => schedule.refetch()}>Tentar novamente</button>
      </div>
    );
  return (
    <section>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p>Horários em {schedule.data.timezone}.</p>
      {!schedule.data.meals.length && (
        <p>
          Nenhuma refeição prevista neste dia.{" "}
          <Link to="/conta/dieta">Organizar minha dieta</Link>
        </p>
      )}
      {schedule.data.meals.map((meal) => (
        <article className="plan-meal" key={meal.id}>
          <div className="plan-row">
            <h2>
              {meal.time.slice(0, 5)} · {meal.name}
            </h2>
            <span>
              {meal.status === "PENDING"
                ? "Prevista"
                : meal.status === "SKIPPED"
                  ? "Pulada"
                  : "Consumida"}
            </span>
          </div>
          <ul>
            {meal.items.map((item, i) => (
              <li key={i}>
                {item.quantity} {units[item.unit]} de {item.name} ·{" "}
                {bases[item.basis]}
              </li>
            ))}
          </ul>
          {date <= today && meal.status !== "CONSUMED" && (
            <button disabled={pending} onClick={() => skip(meal)}>
              {meal.status === "SKIPPED"
                ? "Voltar a prevista"
                : "Marcar como pulada"}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
