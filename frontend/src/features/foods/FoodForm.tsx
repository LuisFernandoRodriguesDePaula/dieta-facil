import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { api } from "../../lib/api";
import { categories, frequencies, units, compatibleUnits } from "./food-types";
import type { Food } from "./food-types";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do alimento.")
    .max(120, "Use até 120 caracteres."),
  unit: z.enum(["G", "KG", "ML", "L", "UNIT"]),
  category: z.enum([
    "PRODUCE",
    "PROTEIN",
    "GRAINS",
    "DAIRY",
    "PANTRY",
    "OTHER",
  ]),
  purchaseFrequency: z.enum(["WEEKLY", "MONTHLY"]),
});
type Values = z.infer<typeof schema>;
export default function FoodForm({
  food,
  saved,
  cancel,
  failure,
  reload,
}: {
  food: Food | null;
  saved: (food: Food) => Promise<void>;
  cancel: () => void;
  failure: (error: unknown) => string;
  reload: () => void;
}) {
  const [error, setError] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: food
      ? {
          name: food.name,
          unit: food.unit,
          category: food.category,
          purchaseFrequency: food.purchaseFrequency,
        }
      : { name: "", unit: "G", category: "OTHER", purchaseFrequency: "WEEKLY" },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      const result = await api<Food>(
        food ? `/api/foods/${food.id}` : "/api/foods",
        food ? "PATCH" : "POST",
        food ? { ...values, version: food.version } : values,
      );
      await saved(result);
    } catch (problem) {
      setError(failure(problem));
    }
  });
  const allowedUnits = food
    ? compatibleUnits(food.unit)
    : (Object.keys(units) as (keyof typeof units)[]);
  return (
    <section className="catalog-panel" aria-labelledby="food-editor-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SEU CATÁLOGO</p>
          <h2 id="food-editor-heading">
            {food ? "Editar alimento" : "Novo alimento"}
          </h2>
        </div>
        <button
          className="icon-button"
          onClick={cancel}
          disabled={form.formState.isSubmitting}
          aria-label="Fechar formulário"
        >
          <X size={20} />
        </button>
      </div>
      <form className="food-form" onSubmit={submit} noValidate>
        <label htmlFor="food-name">Nome do alimento</label>
        <input
          autoFocus
          id="food-name"
          placeholder="Ex.: arroz integral"
          {...form.register("name")}
          aria-invalid={!!form.formState.errors.name}
          aria-describedby="food-name-error"
        />
        <span className="field-error" id="food-name-error">
          {form.formState.errors.name?.message}
        </span>
        <label htmlFor="food-unit">Unidade preferida</label>
        <select id="food-unit" {...form.register("unit")}>
          {allowedUnits.map((unit) => (
            <option key={unit} value={unit}>
              {units[unit]}
            </option>
          ))}
        </select>
        <small>
          {food
            ? "Você pode trocar a unidade dentro da mesma dimensão. Para mudar massa, volume ou contagem, cadastre outro alimento."
            : "Escolha massa, volume ou contagem. O estoque será cadastrado em uma etapa própria."}
        </small>
        <label htmlFor="food-category">Categoria de compra</label>
        <select id="food-category" {...form.register("category")}>
          {Object.entries(categories).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <label htmlFor="food-frequency">Frequência de compra</label>
        <select id="food-frequency" {...form.register("purchaseFrequency")}>
          {Object.entries(frequencies).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <small>
          É uma preferência para organizar compras, não um prazo de validade.
        </small>
        {error && (
          <p className="catalog-error" role="alert">
            {error}
            <button type="button" onClick={reload}>
              Fechar e recarregar catálogo
            </button>
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={cancel}
            disabled={form.formState.isSubmitting}
          >
            Cancelar
          </button>
          <button className="button" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Salvando…" : "Salvar alimento"}
          </button>
        </div>
      </form>
    </section>
  );
}
