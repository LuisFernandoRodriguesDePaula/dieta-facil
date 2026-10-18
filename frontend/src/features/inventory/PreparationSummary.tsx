import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api";
import { units } from "../foods/food-types";
import type { Unit } from "../foods/food-types";
export default function PreparationSummary({
  userId,
  today,
}: {
  userId: string;
  today: string;
}) {
  const end = new Date(today + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + 7);
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState(end.toISOString().slice(0, 10));
  const demand = useQuery({
    queryKey: ["preparation-demand", userId, from, until],
    queryFn: () =>
      api<{
        rows: {
          foodId: string;
          name: string;
          basis: string;
          unit: Unit;
          demand: string;
          covered: string;
          shortage: string;
        }[];
        warnings: string[];
      }>("/api/shopping/projection?from=" + from + "&until=" + until),
    retry: false,
  });
  const rows = demand.data?.rows.filter((r) => r.basis === "COOKED") || [];
  return (
    <section className="plan-meal">
      <h2>Quanto preparar no período</h2>
      <div className="plan-row">
        <label>
          Início do preparo planejado
          <input
            type="date"
            required
            min={today}
            value={from}
            onChange={(e) => {
              if (e.target.value) setFrom(e.target.value);
            }}
          />
        </label>
        <label>
          Até a véspera de
          <input
            type="date"
            required
            min={from}
            value={until}
            onChange={(e) => {
              if (e.target.value) setUntil(e.target.value);
            }}
          />
        </label>
      </div>
      {demand.isPending ? (
        <p role="status">Calculando preparo…</p>
      ) : demand.isError ? (
        <p role="alert">
          {demand.error instanceof ApiError
            ? demand.error.message
            : "Falha ao calcular preparo."}
        </p>
      ) : !rows.length ? (
        <p>Nenhum alimento está planejado como preparado no período.</p>
      ) : (
        rows.map((row) => (
          <p key={row.foodId}>
            <strong>{row.name}</strong>: {row.demand} {units[row.unit]}{" "}
            previstos, {row.covered} {units[row.unit]} cobertos por lotes
            preparados e {row.shortage} {units[row.unit]} ainda necessários.
          </p>
        ))
      )}
      <p>
        O saldo cru fica separado. Informe no registro abaixo o quanto utilizou
        e o rendimento que mediu; o sistema não presume uma proporção de
        cozimento.
      </p>
    </section>
  );
}
