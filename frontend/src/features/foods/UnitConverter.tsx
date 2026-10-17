import { useState } from "react";
import { api } from "../../lib/api";
import { bases, compatibleUnits, units } from "./food-types";
import type { Food, Unit, Basis } from "./food-types";

export default function UnitConverter({
  food,
  close,
  failure,
}: {
  food: Food;
  close: () => void;
  failure: (error: unknown) => string;
}) {
  const allowed = compatibleUnits(food.unit);
  const [quantity, setQuantity] = useState("1");
  const [from, setFrom] = useState<Unit>(food.unit);
  const [to, setTo] = useState<Unit>(
    allowed.find((unit) => unit !== food.unit) ?? food.unit,
  );
  const [basis, setBasis] = useState<Basis>("AS_SOLD");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <section className="catalog-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">SEM ARREDONDAR QUANTIDADES</p>
          <h2>Conferir unidades</h2>
        </div>
        <button className="secondary-button" onClick={close}>
          Fechar
        </button>
      </div>
      <p className="panel-description">
        {food.name} · Apenas conversão de unidades. Cru e cozido não são
        equivalentes.
      </p>
      <form
        className="food-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setResult("");
          const normalized = quantity.trim().replace(",", ".");
          if (
            !/^\d{1,12}(\.\d{1,6})?$/.test(normalized) ||
            !/[1-9]/.test(normalized)
          ) {
            setError(
              "Informe uma quantidade positiva, com até 12 dígitos inteiros e 6 decimais.",
            );
            return;
          }
          setPending(true);
          try {
            const converted = await api<{
              quantity: string;
              unit: Unit;
              basis: Basis;
            }>(`/api/foods/${food.id}/convert`, "POST", {
              quantity: normalized,
              from,
              to,
              basis,
            });
            setResult(
              `${converted.quantity.replace(".", ",")} ${units[converted.unit]} · ${bases[converted.basis]}`,
            );
          } catch (problem) {
            setError(failure(problem));
          } finally {
            setPending(false);
          }
        }}
      >
        <label htmlFor="convert-quantity">Quantidade</label>
        <input
          id="convert-quantity"
          disabled={pending}
          inputMode="decimal"
          value={quantity}
          onChange={(event) => {
            setQuantity(event.target.value);
            setResult("");
          }}
        />
        <div className="converter-units">
          <div>
            <label htmlFor="convert-from">De</label>
            <select
              id="convert-from"
              disabled={pending}
              value={from}
              onChange={(event) => {
                setFrom(event.target.value as Unit);
                setResult("");
              }}
            >
              {allowed.map((unit) => (
                <option key={unit} value={unit}>
                  {units[unit]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="convert-to">Para</label>
            <select
              id="convert-to"
              disabled={pending}
              value={to}
              onChange={(event) => {
                setTo(event.target.value as Unit);
                setResult("");
              }}
            >
              {allowed.map((unit) => (
                <option key={unit} value={unit}>
                  {units[unit]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="convert-basis">Referência da quantidade</label>
        <select
          id="convert-basis"
          disabled={pending}
          value={basis}
          onChange={(event) => {
            setBasis(event.target.value as Basis);
            setResult("");
          }}
        >
          {Object.entries(bases).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <small>
          A referência será mantida. Nenhuma quantidade de estoque é alterada.
        </small>
        {error && (
          <p className="catalog-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <output className="conversion-result" aria-live="polite">
            {result}
          </output>
        )}
        <button className="button" disabled={pending}>
          {pending ? "Convertendo…" : "Converter quantidade"}
        </button>
      </form>
    </section>
  );
}
