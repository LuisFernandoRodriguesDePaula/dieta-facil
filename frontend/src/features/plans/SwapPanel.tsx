import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, PackageCheck, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { bases, units, compatibleUnits } from "../foods/food-types";
import type { Food, Basis, Unit } from "../foods/food-types";
import { useFoods } from "../foods/useFoods";
import type { Item, Occurrence } from "./PlansPage";
import MealDialog from "./MealDialog";

type Alternative = {
  item: Item;
  available: string;
  knowledge: string;
  selectable: boolean;
  blockedReason?: string;
};
type Options = {
  fingerprint: string;
  version: number;
  enabled: boolean;
  source: Item;
  alternatives: Alternative[];
};
const failure = (e: unknown) =>
  e instanceof ApiError ? e.message : "Falha de conexão. Tente novamente.";
function balance(option: Alternative) {
  if (!option.selectable)
    return option.blockedReason || "Alternativa indisponível";
  if (option.knowledge !== "KNOWN")
    return "Conferir estoque · saldo incompleto";
  return Number(option.available) >= Number(option.item.quantity)
    ? "Saldo registrado suficiente"
    : "Precisa comprar ou preparar";
}
export default function SwapPanel({
  userId,
  date,
  meal,
  configure,
  onClose,
  onSaved,
}: {
  userId: string;
  date: string;
  meal: Occurrence;
  configure: boolean;
  onClose: () => void;
  onSaved: (id: string, message: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(configure);
  const [busy, setBusy] = useState(false);
  const options = useQuery({
    queryKey: ["substitutions", userId, date, meal.mealId, index],
    queryFn: () =>
      api<Options>(
        `/api/plan/substitutions?date=${date}&mealId=${meal.mealId}&itemIndex=${index}`,
      ),
    retry: false,
  });
  return (
    <MealDialog
      title={editing ? "Configurar trocas" : "Trocar alimento"}
      busy={busy}
      onClose={onClose}
    >
      <p className="swap-meal-name">
        {meal.time.slice(0, 5)} · {meal.name}
      </p>
      <label>
        Qual alimento?
        <select
          value={index}
          disabled={busy}
          onChange={(e) => setIndex(Number(e.target.value))}
        >
          {meal.items.map((item, i) => (
            <option key={i} value={i}>
              {item.name} · {item.quantity} {units[item.unit]}
            </option>
          ))}
        </select>
      </label>
      {options.isPending ? (
        <p role="status">Carregando alternativas…</p>
      ) : options.isError ? (
        <div role="alert">
          <p>{failure(options.error)}</p>
          <button onClick={() => options.refetch()}>Tentar novamente</button>
        </div>
      ) : editing ? (
        <RulesEditor
          key={index + ":" + options.data.version}
          userId={userId}
          date={date}
          mealId={meal.mealId}
          index={index}
          options={options.data}
          onBusy={setBusy}
          onSaved={async () => {
            await options.refetch();
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <Choice
          key={index + ":" + options.data.version}
          date={date}
          meal={meal}
          index={index}
          options={options.data}
          onConfigure={() => setEditing(true)}
          onBusy={setBusy}
          onSaved={onSaved}
        />
      )}
    </MealDialog>
  );
}
function Choice({
  date,
  meal,
  index,
  options,
  onConfigure,
  onBusy,
  onSaved,
}: {
  date: string;
  meal: Occurrence;
  index: number;
  options: Options;
  onConfigure: () => void;
  onBusy: (v: boolean) => void;
  onSaved: (id: string, text: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [scope, setScope] = useState("ONCE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const previous = useRef({ signature: "", id: "" });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        onBusy(true);
        setError("");
        const payload = {
          date,
          mealId: meal.mealId,
          itemIndex: index,
          fingerprint: options.fingerprint,
          ruleVersion: options.version,
          alternativeIndex: Number(selected),
          scope,
        };
        const signature = JSON.stringify(payload);
        if (previous.current.signature !== signature)
          previous.current = { signature, id: crypto.randomUUID() };
        try {
          const result = await api<{ actionId: string; message: string }>(
            "/api/schedule/substitute",
            "POST",
            { ...payload, requestId: previous.current.id },
          );
          onSaved(result.actionId, result.message);
        } catch (err) {
          setError(failure(err));
        } finally {
          lock.current = false;
          setBusy(false);
          onBusy(false);
        }
      }}
    >
      {!options.enabled || !options.alternatives.length ? (
        <div className="swap-empty">
          <ArrowLeftRight size={26} />
          <h3>Este alimento está sem trocas liberadas</h3>
          <p>Vincule as alternativas e suas porções para escolher por aqui.</p>
        </div>
      ) : (
        <fieldset disabled={busy}>
          <legend>Escolha uma alternativa cadastrada</legend>
          <div className="swap-choices">
            {options.alternatives.map((option, i) => (
              <label
                className={
                  "swap-option " + (selected === String(i) ? "selected" : "")
                }
                key={i}
              >
                <input
                  type="radio"
                  name="alternative"
                  required
                  value={i}
                  disabled={!option.selectable}
                  checked={selected === String(i)}
                  onChange={(e) => setSelected(e.target.value)}
                />
                <span>
                  <strong>{option.item.name}</strong>
                  <span>
                    {option.item.quantity} {units[option.item.unit]} ·{" "}
                    {bases[option.item.basis]}
                  </span>
                  <small>
                    <PackageCheck size={14} />
                    {balance(option)}
                  </small>
                  <small>
                    Saldo registrado: {option.available}{" "}
                    {units[option.item.unit]}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <p className="access-note">
            O saldo não reserva alimentos para outras refeições. Confira as
            condições e a validade antes de consumir.
          </p>
          <label>
            Aplicar troca
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="ONCE">Só nesta refeição</option>
              <option value="NEXT">Nesta e nas próximas</option>
            </select>
          </label>
          <p className="access-note">
            {scope === "NEXT"
              ? "Atualiza esta refeição na dieta a partir deste dia, até a próxima revisão já agendada. Registros consumidos e trocas individuais são preservados."
              : "Muda apenas esta refeição neste dia. Sua dieta habitual continua igual."}{" "}
            O estoque só diminui ao confirmar o consumo.
          </p>
          <button className="button swap-apply" disabled={!selected || busy}>
            {busy ? "Aplicando…" : "Confirmar troca"}
          </button>
        </fieldset>
      )}
      <button
        type="button"
        className="meal-text-button"
        disabled={busy}
        onClick={onConfigure}
      >
        Configurar alternativas e porções
      </button>
      <p className="access-note">
        As porções são definidas por você no plano; não calculamos equivalência
        nutricional.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}
function RulesEditor({
  userId,
  date,
  mealId,
  index,
  options,
  onBusy,
  onSaved,
  onCancel,
}: {
  userId: string;
  date: string;
  mealId: string;
  index: number;
  options: Options;
  onBusy: (v: boolean) => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const foods = useFoods(userId);
  const client = useQueryClient();
  const [items, setItems] = useState<Item[]>(
    options.alternatives.map((a) => a.item),
  );
  const [enabled, setEnabled] = useState(
    options.version === 0 ? true : options.enabled,
  );
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const patch = (i: number, change: Partial<Item>) =>
    setItems((old) =>
      old.map((item, k) => (k === i ? { ...item, ...change } : item)),
    );
  if (foods.isPending) return <p role="status">Carregando seu catálogo…</p>;
  if (foods.isError)
    return (
      <div role="alert">
        <p>{failure(foods.error)}</p>
        <button onClick={() => foods.refetch()}>Tentar novamente</button>
      </div>
    );
  const available = foods.data.filter((f) => f.id !== options.source.foodId);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        onBusy(true);
        setError("");
        try {
          await api("/api/plan/substitutions", "PUT", {
            date,
            mealId,
            itemIndex: index,
            fingerprint: options.fingerprint,
            version: options.version,
            enabled,
            alternatives: items.map(({ foodId, quantity, unit, basis }) => ({
              foodId,
              quantity,
              unit,
              basis,
            })),
          });
          await client.invalidateQueries({ queryKey: ["substitutions"] });
          onSaved();
        } catch (err) {
          setError(failure(err));
        } finally {
          lock.current = false;
          setBusy(false);
          onBusy(false);
        }
      }}
    >
      <p>
        Defina o que pode substituir{" "}
        <strong>
          {options.source.name} · {options.source.quantity}{" "}
          {units[options.source.unit]}
        </strong>{" "}
        nesta refeição. Cada alternativa precisa de uma porção própria.
      </p>
      <fieldset disabled={busy}>
        <label className="swap-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{" "}
          Permitir trocas para este alimento
        </label>
        {items.map((item, i) => (
          <section
            className="swap-rule"
            key={i}
            aria-label={"Alternativa " + (i + 1)}
          >
            <label>
              Alimento alternativo {i + 1}
              <select
                required
                value={item.foodId}
                onChange={(e) => {
                  const food = foods.data.find(
                    (f) => f.id === e.target.value,
                  ) as Food;
                  patch(i, { foodId: food.id, unit: food.baseUnit });
                }}
              >
                {!foods.data.some((f) => f.id === item.foodId) && (
                  <option value={item.foodId}>{item.name} (arquivado)</option>
                )}
                {available.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="swap-rule-portion">
              <label>
                Porção {i + 1}
                <input
                  required
                  type="number"
                  min={item.unit === "UNIT" ? 1 : 0.000001}
                  step={item.unit === "UNIT" ? 1 : 0.000001}
                  value={item.quantity}
                  onChange={(e) => patch(i, { quantity: e.target.value })}
                />
              </label>
              <label>
                Unidade {i + 1}
                <select
                  value={item.unit}
                  onChange={(e) => patch(i, { unit: e.target.value as Unit })}
                >
                  {compatibleUnits(item.unit).map((u) => (
                    <option key={u} value={u}>
                      {units[u]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Estado {i + 1}
              <select
                value={item.basis}
                onChange={(e) => patch(i, { basis: e.target.value as Basis })}
              >
                {Object.entries(bases).map(([key, text]) => (
                  <option key={key} value={key}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="meal-text-button"
              aria-label={"Remover alternativa " + (i + 1)}
              onClick={() => setItems((old) => old.filter((_, k) => k !== i))}
            >
              <Trash2 size={15} />
              Remover alternativa
            </button>
          </section>
        ))}
        <button
          type="button"
          disabled={!available.length || items.length >= 10}
          onClick={() => {
            const food = available[0];
            setItems((old) => [
              ...old,
              {
                foodId: food.id,
                name: food.name,
                quantity: "",
                unit: food.baseUnit,
                basis: "AS_SOLD",
              },
            ]);
          }}
        >
          <Plus size={16} /> Adicionar alternativa
        </button>
        {!available.length && (
          <p>
            Cadastre outro alimento no catálogo para vincular uma alternativa.
          </p>
        )}
        <p className="access-note">
          Desmarcar a permissão bloqueia as próximas trocas e mantém as
          alternativas cadastradas. Alterar a porção original da dieta exige
          revisar essa configuração.
        </p>
        <div className="plan-actions">
          <button className="button">
            {busy ? "Salvando…" : "Salvar alternativas"}
          </button>
          <button type="button" onClick={onCancel}>
            Voltar
          </button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </form>
  );
}
