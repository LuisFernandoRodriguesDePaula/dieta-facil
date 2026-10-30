import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Food, Basis, Unit } from "../foods/food-types";
import { bases, units, compatibleUnits } from "../foods/food-types";
import { localDate } from "../../lib/dates";
type Values = {
  basis: Basis;
  referenceQuantity: number;
  unit: Unit;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  energy: number | null;
  source: string;
  version: number;
};
type Ref = { revision: number; values: Values };
type Totals = {
  name: string;
  known: Record<string, number>;
  missing: Record<string, number>;
};
const labels = {
  protein: "Proteínas (g)",
  carbs: "Carboidratos (g)",
  fat: "Gorduras (g)",
  energy: "Energia (kcal)",
};
export default function NutrientPanel({
  foods,
  prefix,
  timezone,
}: {
  foods: Food[];
  prefix: string;
  timezone: string;
}) {
  const [selected, setSelected] = useState("");
  const [basis, setBasis] = useState<Basis>("AS_SOLD");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const food = foods.find((f) => f.id === selected);
  const path = prefix + "/foods/" + selected + "/nutrients";
  const ref = useQuery({
    queryKey: ["nutrients", prefix, selected, basis],
    queryFn: () => api<Ref[]>(path + "?basis=" + basis),
    enabled: !!food,
  });
  const totals = useQuery({
    queryKey: ["nutrient-preview", prefix],
    queryFn: () =>
      api<Totals[]>(prefix + "/nutrient-preview?date=" + localDate(timezone)),
  });
  const values = ref.data?.[0]?.values;
  return (
    <section className="plan-meal" aria-label="Composição nutricional">
      <h2>Nutrientes dos alimentos</h2>
      <p>
        Cadastre os valores do rótulo ou da sua referência. Campos vazios
        significam informação desconhecida.
      </p>
      <div className="plan-row">
        <label>
          Alimento para composição
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setNotice("");
            }}
          >
            <option value="">Selecione um alimento</option>
            {foods.map((f) => (
              <option value={f.id} key={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado da referência
          <select
            value={basis}
            onChange={(e) => {
              setBasis(e.target.value as Basis);
              setNotice("");
            }}
          >
            {Object.entries(bases).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {ref.isError && (
        <p role="alert">
          Não foi possível carregar a composição.{" "}
          <button onClick={() => ref.refetch()}>Tentar novamente</button>
        </p>
      )}
      {food && ref.isPending && <p role="status">Carregando composição…</p>}
      {food && ref.isSuccess && (
        <form
          key={selected + basis + (ref.data[0]?.revision ?? 0)}
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const number = (key: string) =>
              data.get(key) === "" ? null : Number(data.get(key));
            setBusy(true);
            setNotice("");
            try {
              await api(path, "PUT", {
                basis,
                referenceQuantity: number("referenceQuantity"),
                unit: data.get("unit"),
                protein: number("protein"),
                carbs: number("carbs"),
                fat: number("fat"),
                energy: number("energy"),
                source: data.get("source"),
                version: ref.data[0]?.revision ?? 0,
              });
              await client.invalidateQueries({
                queryKey: ["nutrients", prefix, selected, basis],
              });
              await client.invalidateQueries({
                queryKey: ["nutrient-preview", prefix],
              });
              setNotice("Composição salva.");
            } catch (err) {
              setNotice(
                err instanceof Error ? err.message : "Não foi possível salvar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            <div className="plan-row">
              <label>
                Quantidade de referência
                <input
                  name="referenceQuantity"
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  required
                  defaultValue={values?.referenceQuantity ?? 100}
                />
              </label>
              <label>
                Unidade da referência
                <select
                  name="unit"
                  defaultValue={values?.unit ?? food.baseUnit}
                >
                  {compatibleUnits(food.unit).map((u) => (
                    <option value={u} key={u}>
                      {units[u]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="plan-row">
              {Object.entries(labels).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    type="number"
                    min="0"
                    step="0.000001"
                    defaultValue={values?.[key as keyof typeof labels] ?? ""}
                  />
                </label>
              ))}
            </div>
            <label>
              Fonte dos valores
              <input
                name="source"
                required
                maxLength={250}
                defaultValue={values?.source ?? ""}
                placeholder="Ex.: rótulo do produto, porção de 100 g"
              />
            </label>
            <button className="button">
              {busy ? "Salvando…" : "Salvar composição"}
            </button>
          </fieldset>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
      <details>
        <summary>Prévia nutricional das refeições de hoje</summary>
        <p>
          Estimativa com o catálogo atual e as trocas do dia. Não é um registro
          de consumo nem um cálculo histórico congelado.
        </p>
        {totals.isPending ? (
          <p role="status">Calculando…</p>
        ) : totals.isError ? (
          <button onClick={() => totals.refetch()}>
            Tentar calcular novamente
          </button>
        ) : totals.data?.length ? (
          totals.data.map((meal, index) => (
            <article className="plan-meal" key={index}>
              <h3>{meal.name}</h3>
              {Object.entries(labels).map(([key, label]) => (
                <p key={key}>
                  {label}:{" "}
                  {Number(meal.known[key]).toLocaleString("pt-BR", {
                    maximumFractionDigits: 2,
                  })}
                  {meal.missing[key] > 0
                    ? ` · subtotal parcial (${meal.missing[key]} alimento(s) sem dado)`
                    : ""}
                </p>
              ))}
            </article>
          ))
        ) : (
          <p>Nenhuma refeição prevista hoje.</p>
        )}
      </details>
    </section>
  );
}
