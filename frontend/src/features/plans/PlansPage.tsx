import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Clock3,
  Utensils,
  CalendarDays,
  Plus,
  ChevronDown,
  Info,
  Upload,
  ChevronUp,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../auth/session";
import { bases, units, compatibleUnits } from "../foods/food-types";
import type { Basis, Unit, Food } from "../foods/food-types";
import "./plans.css";
import { useFoods } from "../foods/useFoods";
import { localDate } from "../../lib/dates";
import { PersonalNav } from "../personal";

import DayPanel from "./DayPanel";
import { useDietApi } from "./DietApi";
import MealDialog from "./MealDialog";

export type Item = {
  foodId: string;
  name?: string;
  quantity: string;
  unit: Unit;
  basis: Basis;
};
export type Meal = {
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
export type Occurrence = Meal & {
  mealId: string;
  date: string;
  status: string;
};
export type Schedule = { date: string; timezone: string; meals: Occurrence[] };
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
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
      professional={session.data.role === "NUTRITIONIST"}
    />
  );
}
function Workspace({
  userId,
  timezone,
  agenda,
  professional,
}: {
  userId: string;
  timezone: string;
  agenda: boolean;
  professional: boolean;
}) {
  const today = localDate(timezone);
  const [date, setDate] = useState(today);
  const [params, setParams] = useSearchParams();
  const editing = professional && !agenda && params.get("editar") === "1";
  return (
    <main className="plan-page">
      <PersonalNav />
      {professional && <p className="eyebrow">SUA ROTINA</p>}
      <div className="diet-title-row">
        <h1>
          {editing
            ? "Editar dieta"
            : agenda
              ? "Agenda de refeições"
              : "Minha dieta"}
        </h1>
        {!agenda && professional && (
          <button onClick={() => setParams(editing ? {} : { editar: "1" })}>
            {editing ? "Voltar às refeições" : "Editar dieta"}
          </button>
        )}
      </div>
      {professional && (
        <p>
          {editing
            ? "Organize refeições e porções. As mudanças começam na data escolhida."
            : "O que comer, na hora certa. Troque um alimento ou confirme sua refeição por aqui."}
        </p>
      )}
      {professional && (
        <label className="plan-date">
          {editing ? "Aplicar dieta a partir de" : "Consultar dia"}
          <input
            type="date"
            required
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
      )}
      {editing ? (
        <EditorLoader key={date} userId={userId} date={date} today={today} />
      ) : (
        <DayPanel
          key={date}
          userId={userId}
          date={date}
          today={today}
          timezone={timezone}
          clientView={!professional}
        />
      )}
      {!professional && (
        <details className="diet-secondary-controls">
          <summary>Consultar outro dia</summary>
          <label className="plan-date">
            Consultar dia
            <input
              type="date"
              required
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
        </details>
      )}
    </main>
  );
}
function failure(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Não foi possível conectar ao serviço. Tente novamente.";
}
export function EditorLoader({
  userId,
  date,
  today,
  applyToday = false,
  onDateChange,
  toolbarTarget,
}: {
  userId: string;
  date: string;
  today: string;
  applyToday?: boolean;
  onDateChange?: (date: string) => void;
  toolbarTarget?: HTMLElement | null;
}) {
  const prefix = useDietApi();
  const [notice, setNotice] = useState("");
  const plan = useQuery({
    queryKey: ["plan", userId, date],
    queryFn: () => api<Plan>(prefix + "/plan?date=" + date),
    retry: false,
  });
  const foods = useFoods(userId, prefix);
  const active = useQuery({
    queryKey: ["plan", userId, today],
    queryFn: () => api<Plan>(prefix + "/plan?date=" + today),
    enabled: applyToday,
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
    <>
      <Editor
        key={plan.data.version}
        initial={plan.data}
        foods={foods.data}
        date={date}
        today={today}
        refresh={() => plan.refetch()}
        onNotice={setNotice}
        applyToday={applyToday}
        onDateChange={onDateChange}
        activeEffectiveFrom={active.data?.effectiveFrom}
        toolbarTarget={toolbarTarget}
      />
      {notice && (
        <p role="status" className="form-success">
          {notice}
        </p>
      )}
    </>
  );
}
function Editor({
  initial,
  foods,
  date,
  today,
  refresh,
  onNotice,
  applyToday,
  onDateChange,
  activeEffectiveFrom,
  toolbarTarget,
}: {
  initial: Plan;
  foods: Food[];
  date: string;
  today: string;
  refresh: () => unknown;
  onNotice: (value: string) => void;
  applyToday?: boolean;
  onDateChange?: (date: string) => void;
  activeEffectiveFrom?: string | null;
  toolbarTarget?: HTMLElement | null;
}) {
  const prefix = useDietApi();
  const client = useQueryClient();
  const [meals, setMeals] = useState<Meal[]>(initial.meals);
  const [history, setHistory] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const clean = JSON.stringify(meals) === JSON.stringify(initial.meals);
  const isActive =
    applyToday &&
    !!initial.effectiveFrom &&
    initial.effectiveFrom === activeEffectiveFrom &&
    clean;
  const [opened, setOpened] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const patch = (id: string, change: Partial<Meal>) =>
    setMeals((old) => old.map((m) => (m.id === id ? { ...m, ...change } : m)));
  const add = () => {
    const id = crypto.randomUUID();
    setMeals((old) => [
      ...old,
      { id, name: "", time: "08:00", days: [1, 2, 3, 4, 5, 6, 7], items: [] },
    ]);
    setOpened([id]);
  };
  const save = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    onNotice("");
    const form = e.currentTarget;
    const invalid = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input,select",
      ),
    ).find((field) => !field.validity.valid);
    if (invalid) {
      const id = invalid.closest<HTMLElement>("[data-meal-id]")?.dataset.mealId;
      if (id) setOpened([id]);
      requestAnimationFrame(() => {
        invalid.focus();
        invalid.reportValidity();
      });
      return;
    }
    const incomplete = meals.find((m) => !m.days.length || !m.items.length);
    if (incomplete) {
      setOpened([incomplete.id]);
      requestAnimationFrame(() =>
        document
          .getElementById("meal-fields-" + incomplete.id)
          ?.querySelector<HTMLInputElement>("input")
          ?.focus(),
      );
      setError("Escolha pelo menos um dia e um alimento em cada refeição.");
      return;
    }
    setSaving(true);
    try {
      await api<Plan>(prefix + "/plan", "PUT", {
        version: initial.version,
        effectiveFrom: applyToday ? today : date,
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
      onNotice(applyToday ? "Dieta ativa para o cliente." : "Dieta salva.");
      await client.invalidateQueries({ queryKey: ["schedule"] });
      await client.invalidateQueries({ queryKey: ["plan"] });
      refresh();
      if (applyToday) onDateChange?.(today);
    } catch (err) {
      setError(failure(err));
    } finally {
      setSaving(false);
    }
  };
  const tools = (
    <div className="plan-editor-tools">
      <span className="plan-meal-count">
        {meals.length} {meals.length === 1 ? "refeição" : "refeições"}
      </span>
      {!!initial.revisionDates.length && (
        <button
          type="button"
          className="plan-history-icon"
          aria-label="Informações e versões da dieta"
          title="Informações e versões da dieta"
          onClick={() => setHistory(true)}
        >
          <Info size={20} aria-hidden="true" />
        </button>
      )}
      {applyToday && (
        <button
          type="button"
          className="plan-import-button"
          onClick={() => setImportOpen(true)}
        >
          <Upload size={18} aria-hidden="true" /> Importar dieta
        </button>
      )}
    </div>
  );
  return (
    <form onSubmit={save} noValidate className="plan-editor">
      <div
        className="plan-editor-intro"
        hidden={!!toolbarTarget && !!meals.length}
      >
        <div>
          {!applyToday && <h2>Dieta</h2>}
          {!meals.length && (
            <p>
              Defina o horário, escolha os dias e adicione as porções de cada
              alimento.
            </p>
          )}
        </div>
        {!toolbarTarget && tools}
      </div>
      {toolbarTarget && createPortal(tools, toolbarTarget)}
      {importOpen && (
        <MealDialog title="Importar dieta" onClose={() => setImportOpen(false)}>
          <p>
            A importação por link está em planejamento. Nesta versão, monte ou
            edite as refeições no painel.
          </p>
          <label>
            Link da dieta
            <input
              type="url"
              placeholder="https://…"
              disabled
              aria-describedby="diet-import-note"
            />
          </label>
          <p id="diet-import-note" className="access-note">
            Nenhum link é enviado ou armazenado. A dieta atual permanece
            intacta.
          </p>
          <button type="button" onClick={() => setImportOpen(false)}>
            Voltar à dieta
          </button>
        </MealDialog>
      )}
      {history && (
        <MealDialog title="Versões da dieta" onClose={() => setHistory(false)}>
          <p>Deseja consultar outras versões da dieta deste cliente?</p>
          {!clean && (
            <p className="form-notice">
              Ao escolher outra versão, as alterações ainda não aplicadas serão
              descartadas.
            </p>
          )}
          <div className="plan-history-options">
            {initial.revisionDates.map((d) => (
              <button
                key={d}
                type="button"
                disabled={!onDateChange}
                onClick={() => {
                  onDateChange?.(d);
                  setHistory(false);
                }}
              >
                {d.split("-").reverse().join("/")}
                {d === activeEffectiveFrom ? " · Ativa" : ""}
              </button>
            ))}
          </div>
          {applyToday && (
            <button
              type="button"
              onClick={() => {
                onDateChange?.(today);
                setHistory(false);
              }}
            >
              Voltar à dieta atual
            </button>
          )}
        </MealDialog>
      )}
      {applyToday && date !== today && (
        <p className="access-note">
          Consultando versão de {date.split("-").reverse().join("/")}. Alterar
          para esta dieta aplica as refeições a partir de hoje.
        </p>
      )}
      {!foods.length && (
        <p className="form-notice">
          {prefix === "/api" ? (
            <>
              Cadastre alimentos no{" "}
              <Link to="/conta/alimentos">catálogo pessoal</Link> para montar
              suas refeições.
            </>
          ) : (
            "Abra a aba Alimentos e cadastre os alimentos do cliente antes de montar as refeições."
          )}
        </p>
      )}
      {date < today && (
        <p className="form-notice">
          Consulta de histórico. Para editar, escolha hoje ou uma data futura.
        </p>
      )}
      {!!meals.length && (
        <div className="plan-expand-actions">
          <button
            type="button"
            onClick={() => setOpened(meals.map((m) => m.id))}
          >
            <ChevronDown size={16} aria-hidden="true" /> Expandir todas
          </button>
          <button type="button" onClick={() => setOpened([])}>
            <ChevronUp size={16} aria-hidden="true" /> Recolher todas
          </button>
        </div>
      )}
      <fieldset disabled={saving}>
        {meals.map((meal, index) => (
          <section
            className="plan-meal plan-meal-editor"
            key={meal.id}
            data-meal-id={meal.id}
            aria-label={"Editar " + (meal.name || "refeição " + (index + 1))}
          >
            <header className="plan-meal-banner">
              <h2>
                <button
                  type="button"
                  className="plan-meal-toggle"
                  aria-label={"Editar refeição " + (meal.name || index + 1)}
                  aria-expanded={opened.includes(meal.id)}
                  aria-controls={"meal-fields-" + meal.id}
                  onClick={() =>
                    setOpened((old) =>
                      old.includes(meal.id)
                        ? old.filter((id) => id !== meal.id)
                        : [meal.id],
                    )
                  }
                >
                  <span className="plan-meal-symbol">
                    <Utensils size={23} aria-hidden="true" />
                  </span>
                  <span className="plan-meal-identity">
                    <span className="plan-meal-title">
                      {meal.name || "Nova refeição"}
                    </span>
                    <span className="plan-meal-meta">
                      {meal.days.length === 7
                        ? "Todos os dias"
                        : meal.days.length
                          ? weekdays
                              .filter((_, i) => meal.days.includes(i + 1))
                              .join(" · ")
                          : "Sem dias selecionados"}{" "}
                      · {meal.items.length}{" "}
                      {meal.items.length === 1 ? "alimento" : "alimentos"}
                    </span>
                  </span>
                  <span className="plan-time-badge">
                    <Clock3 size={16} aria-hidden="true" />
                    {meal.time.slice(0, 5)}
                  </span>
                  <ChevronDown
                    size={20}
                    aria-hidden="true"
                    className={opened.includes(meal.id) ? "is-open" : ""}
                  />
                </button>
              </h2>
            </header>
            <div
              id={"meal-fields-" + meal.id}
              hidden={!opened.includes(meal.id)}
            >
              <fieldset disabled={date < today}>
                <div className="plan-meal-fields">
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
                <div className="plan-week-heading">
                  <h3>
                    <CalendarDays size={18} aria-hidden="true" /> Dias da semana
                  </h3>
                </div>
                <div className="plan-day-shortcuts">
                  <button
                    type="button"
                    onClick={() =>
                      patch(meal.id, { days: [1, 2, 3, 4, 5, 6, 7] })
                    }
                  >
                    Todos os dias
                  </button>
                  <button
                    type="button"
                    onClick={() => patch(meal.id, { days: [1, 2, 3, 4, 5] })}
                  >
                    Segunda a sexta
                  </button>
                  <button
                    type="button"
                    onClick={() => patch(meal.id, { days: [6, 7] })}
                  >
                    Fim de semana
                  </button>
                </div>
                <div
                  className="plan-days"
                  role="group"
                  aria-label={
                    "Dias de " + (meal.name || "refeição " + (index + 1))
                  }
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
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
                {!meal.items.length && (
                  <p className="plan-no-ingredients">
                    Adicione o primeiro alimento desta refeição.
                  </p>
                )}
                <div className="plan-ingredients">
                  {meal.items.map((item, i) => (
                    <div className="plan-item" key={i}>
                      <label>
                        Alimento
                        <select
                          required
                          value={item.foodId}
                          onChange={(e) => {
                            const food = foods.find(
                              (f) => f.id === e.target.value,
                            )!;
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
                                k === i
                                  ? { ...v, quantity: e.target.value }
                                  : v,
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
                                k === i
                                  ? { ...v, unit: e.target.value as Unit }
                                  : v,
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
                </div>
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
                    <Plus size={16} aria-hidden="true" /> Adicionar alimento
                  </button>
                  <button
                    type="button"
                    disabled={meals.length >= 20}
                    onClick={() => {
                      const id = crypto.randomUUID();
                      setMeals((old) => [
                        ...old,
                        {
                          ...meal,
                          id,
                          name: meal.name + " (cópia)",
                          items: meal.items.map((i) => ({ ...i })),
                          days: [...meal.days],
                        },
                      ]);
                      setOpened([id]);
                    }}
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
              </fieldset>
            </div>
          </section>
        ))}
        <div className="plan-actions plan-editor-footer">
          <button
            type="button"
            disabled={meals.length >= 20 || date < today}
            onClick={add}
          >
            Adicionar refeição
          </button>
          <button
            className={
              "button" +
              (applyToday
                ? isActive
                  ? " plan-active-button"
                  : " plan-apply-pending"
                : "")
            }
            type="submit"
            disabled={isActive || (date < today && !applyToday)}
          >
            {saving
              ? "Aplicando…"
              : applyToday
                ? isActive
                  ? "Dieta ativa"
                  : "Alterar para esta dieta"
                : "Salvar dieta"}
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
      <p className="access-note">
        As quantidades são as que você informa. Cru e preparado são tratados
        separadamente; não há conversão automática de rendimento.
      </p>
    </form>
  );
}
