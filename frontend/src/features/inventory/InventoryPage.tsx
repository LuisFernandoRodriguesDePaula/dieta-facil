import PreparationSummary from "./PreparationSummary";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useSession } from "../auth/session";
import { localDate } from "../../lib/dates";
import { PersonalNav } from "../personal";
import { useCommand } from "../../lib/useCommand";

import { bases, units, compatibleUnits } from "../foods/food-types";
import type { Food, Basis, Unit } from "../foods/food-types";
import "../plans/plans.css";
import { useFoods } from "../foods/useFoods";

export type Entry = {
  foodId: string;
  basis: Basis;
  quantity: string;
  unit: Unit;
  location: string;
  condition: string;
  receivedDate: string;
  expiry: string | null;
  expirySource: string;
  openedDate: string | null;
  preparedDate: string | null;
  knowledge: string;
};
type Lot = {
  id: string;
  foodId: string;
  name: string;
  basis: Basis;
  quantity: string;
  unit: Unit;
  location: string;
  condition: string;
  expiry: string | null;
  expirySource: string;
  receivedDate: string;
  version: number;
  openedDate: string | null;
  preparedDate: string | null;
};
type Operation = {
  id: string;
  kind: string;
  createdAt: string;
  reversed: boolean;
  movements: {
    lotId: string;
    foodName: string;
    basis: Basis;
    delta: string;
    unit: Unit;
  }[];
};
export type Stock = {
  lots: Lot[];
  accounts: {
    foodId: string;
    name: string;
    basis: Basis;
    quantity: string;
    unit: Unit;
    knowledge: string;
  }[];
  history: Operation[];
};
const locations: Record<string, string> = {
  PANTRY: "Despensa",
  FRIDGE: "Geladeira",
  FREEZER: "Freezer",
};
const conditions: Record<string, string> = {
  SEALED: "Fechado",
  OPENED: "Aberto",
  PREPARED: "Preparado",
};
const knowledge: Record<string, string> = {
  KNOWN: "Conferido",
  UNKNOWN: "Desconhecido",
  PARTIAL: "Parcial",
};
const kinds: Record<string, string> = {
  ENTRY: "Entrada",
  DISCARD: "Descarte / ajuste",
  PREPARE: "Preparo",
  CONSUME: "Consumo",
  REVERSAL: "Estorno",
  PURCHASE: "Compra recebida",
};
export default function InventoryPage({
  preparation = false,
}: {
  preparation?: boolean;
}) {
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
    <Inventory
      key={session.data.id}
      userId={session.data.id}
      today={localDate(session.data.timezone)}
      preparation={preparation}
    />
  );
}
function Inventory({
  userId,
  today,
  preparation,
}: {
  userId: string;
  today: string;
  preparation: boolean;
}) {
  const stock = useQuery({
    queryKey: ["stock", userId],
    queryFn: () => api<Stock>("/api/inventory"),
    retry: false,
  });
  const foods = useFoods(userId);
  const command = useCommand();
  const [discard, setDiscard] = useState<Lot | null>(null);
  const [editing, setEditing] = useState<Lot | null>(null);
  const [reverse, setReverse] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState("");
  const [basis, setBasis] = useState<Basis>("AS_SOLD");
  const [certainty, setCertainty] = useState("KNOWN");
  const [knowledgeError, setKnowledgeError] = useState("");
  const client = useQueryClient();
  const setKnowledge = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setKnowledgeError("");
    try {
      await api("/api/inventory/knowledge", "PUT", {
        foodId: selected,
        basis,
        knowledge: certainty,
      });
      await client.invalidateQueries();
    } catch (e) {
      setKnowledgeError(
        e instanceof ApiError ? e.message : "Falha ao salvar conferência.",
      );
    }
  };
  return (
    <main className="plan-page">
      <PersonalNav />
      <p className="eyebrow">SUA COZINHA</p>
      <h1>{preparation ? "Preparar alimentos" : "Meu estoque"}</h1>
      <p>
        {preparation
          ? "Informe quanto saiu do estoque cru e quanto o preparo rendeu. O rendimento é medido por você."
          : "Cadastre o que você já tem em casa. Cada lote mantém sua quantidade, validade e armazenamento."}
      </p>
      {(stock.isPending || foods.isPending) && (
        <p role="status">Carregando estoque…</p>
      )}
      {(stock.isError || foods.isError) && (
        <p role="alert">
          Não foi possível carregar.{" "}
          <button
            onClick={() => {
              void stock.refetch();
              void foods.refetch();
            }}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {preparation && <PreparationSummary userId={userId} today={today} />}
      {foods.data && (
        <EntryForm
          foods={foods.data}
          today={today}
          busy={command.busy}
          preparation={preparation}
          submit={async (entry, input) =>
            command.run(
              preparation
                ? "/api/inventory/preparations"
                : "/api/inventory/entries",
              preparation
                ? {
                    foodId: entry.foodId,
                    inputQuantity: input,
                    inputUnit: entry.unit,
                    output: entry,
                  }
                : entry,
            )
          }
        />
      )}
      {command.error && (
        <p className="form-error" role="alert">
          {command.error}
        </p>
      )}
      {command.notice && (
        <p className="form-success" role="status">
          {command.notice}
        </p>
      )}
      {!preparation && foods.data && (
        <form className="plan-meal" onSubmit={setKnowledge}>
          <h2>Conferência de estoque</h2>
          <p>
            Marque “Conferido” somente depois de cadastrar todos os lotes deste
            alimento e estado. Um alimento sem cadastro tem saldo desconhecido,
            não zero.
          </p>
          <div className="plan-item">
            <label>
              Alimento
              <select
                required
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Selecione</option>
                {foods.data.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Estado
              <select
                value={basis}
                onChange={(e) => setBasis(e.target.value as Basis)}
              >
                {Object.entries(bases).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Conferência
              <select
                value={certainty}
                onChange={(e) => setCertainty(e.target.value)}
              >
                {Object.entries(knowledge).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <button>Salvar conferência</button>
          </div>
          {knowledgeError && <p role="alert">{knowledgeError}</p>}
        </form>
      )}
      {stock.data && (
        <>
          <section className="plan-meal">
            <h2>Saldo cadastrado</h2>
            {!stock.data.accounts.length && (
              <p>Você ainda não cadastrou seu estoque.</p>
            )}
            {stock.data.accounts.map((a) => (
              <p key={a.foodId + a.basis}>
                <strong>{a.name}</strong> · {bases[a.basis]}: {a.quantity}{" "}
                {units[a.unit]} · {knowledge[a.knowledge]}
              </p>
            ))}
            <p>
              Este total inclui lotes vencidos. A sugestão de compras considera
              a validade em cada dia de uso.
            </p>
          </section>
          <h2>Lotes</h2>
          {stock.data.lots
            .filter((l) => Number(l.quantity) > 0)
            .map((l) => (
              <article className="plan-meal" key={l.id}>
                <button type="button" onClick={() => setEditing(l)}>
                  Editar armazenamento e validade
                </button>
                <h3>
                  {l.name} · {l.quantity} {units[l.unit]}
                </h3>
                <p>
                  {bases[l.basis]} · {locations[l.location]} ·{" "}
                  {conditions[l.condition]}
                </p>
                <p>
                  {l.expiry
                    ? l.expiry < today
                      ? "Vencido em " + l.expiry
                      : "Validade: " + l.expiry
                    : "Validade desconhecida"}
                  {l.expirySource === "ESTIMATE"
                    ? " (estimativa informada)"
                    : ""}
                </p>
                <button
                  disabled={command.busy}
                  onClick={() => {
                    setDiscard(l);
                    setQty("");
                    setReason("");
                  }}
                >
                  Descartar / reduzir saldo
                </button>
              </article>
            ))}
          <p className="access-note">
            A validade cadastrada ajuda a planejar. Ela não confirma que um
            alimento está próprio para consumo. Use as orientações do rótulo e
            do fabricante para armazenamento.
          </p>
          {editing && (
            <StorageEditor
              key={editing.id}
              lot={editing}
              today={today}
              close={() => setEditing(null)}
              done={async () => {
                await client.invalidateQueries();
              }}
            />
          )}
          {discard && (
            <form
              className="plan-meal"
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await command.run("/api/inventory/discards", {
                    lotId: discard.id,
                    quantity: qty,
                    unit: discard.unit,
                    reason,
                  })
                )
                  setDiscard(null);
              }}
            >
              <h2>Reduzir saldo de {discard.name}</h2>
              <label>
                Quantidade ({units[discard.unit]})
                <input
                  required
                  type="number"
                  min={discard.unit === "UNIT" ? 1 : 0.000001}
                  step={discard.unit === "UNIT" ? 1 : "0.000001"}
                  max={discard.quantity}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </label>
              <label>
                Motivo
                <input
                  required
                  maxLength={200}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <div className="plan-actions">
                <button disabled={command.busy}>Confirmar redução</button>
                <button type="button" onClick={() => setDiscard(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
          <h2>Histórico recente</h2>
          {stock.data.history.map((o) => (
            <article className="plan-meal" key={o.id}>
              <strong>{kinds[o.kind] || o.kind}</strong> ·{" "}
              <time>{new Date(o.createdAt).toLocaleString("pt-BR")}</time>
              {o.movements.map((m, i) => (
                <p key={i}>
                  {m.foodName} · {bases[m.basis]}: {m.delta} {units[m.unit]}
                </p>
              ))}
              {o.reversed ? (
                <span>Estornada</span>
              ) : (
                o.kind !== "REVERSAL" && (
                  <button
                    disabled={command.busy}
                    onClick={() => setReverse(o.id)}
                  >
                    Estornar operação
                  </button>
                )
              )}
            </article>
          ))}
          {reverse && (
            <section
              className="plan-meal"
              role="region"
              aria-label="Confirmar estorno"
            >
              <p>
                O estorno registra os movimentos contrários. Ele será bloqueado
                se faltar saldo para devolver uma entrada.
              </p>
              <div className="plan-actions">
                <button
                  disabled={command.busy}
                  onClick={async () => {
                    if (
                      await command.run("/api/inventory/reversals", {
                        operationId: reverse,
                      })
                    )
                      setReverse(null);
                  }}
                >
                  Confirmar estorno
                </button>
                <button onClick={() => setReverse(null)}>Cancelar</button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
function StorageEditor({
  lot,
  today,
  close,
  done,
}: {
  lot: Lot;
  today: string;
  close: () => void;
  done: () => Promise<void>;
}) {
  const [location, setLocation] = useState(lot.location);
  const [condition, setCondition] = useState(lot.condition);
  const [expiry, setExpiry] = useState(lot.expiry || "");
  const [source, setSource] = useState(
    lot.expirySource === "UNKNOWN" ? "USER" : lot.expirySource,
  );
  const [opened, setOpened] = useState(lot.openedDate || today);
  const [prepared, setPrepared] = useState(lot.preparedDate || today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="plan-meal"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await api("/api/inventory/lots/" + lot.id, "PUT", {
            version: lot.version,
            location,
            condition,
            expiry: expiry || null,
            expirySource: expiry ? source : "UNKNOWN",
            openedDate: condition === "OPENED" ? opened : lot.openedDate,
            preparedDate:
              condition === "PREPARED" ? prepared : lot.preparedDate,
          });
          await done();
          close();
        } catch (e) {
          setError(
            e instanceof ApiError
              ? e.message
              : "Falha ao salvar armazenamento.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Armazenamento de {lot.name}</h2>
      <p>
        Mudar o local não altera a validade. Confira o rótulo e informe
        explicitamente qualquer correção de data.
      </p>
      <div className="plan-item">
        <label>
          Local
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {Object.entries(locations).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Condição
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            {Object.entries(conditions).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Validade
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </label>
        {expiry && (
          <label>
            Origem da data
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="LABEL">Rótulo</option>
              <option value="USER">Informada por mim</option>
              <option value="ESTIMATE">Estimativa minha</option>
            </select>
          </label>
        )}
        {condition === "OPENED" && (
          <label>
            Data da abertura
            <input
              required
              type="date"
              min={lot.receivedDate}
              max={today}
              value={opened}
              onChange={(e) => setOpened(e.target.value)}
            />
          </label>
        )}
        {condition === "PREPARED" && (
          <label>
            Data de preparo
            <input
              required
              type="date"
              min={lot.receivedDate}
              max={today}
              value={prepared}
              onChange={(e) => setPrepared(e.target.value)}
            />
          </label>
        )}
      </div>
      <div className="plan-actions">
        <button className="button" disabled={busy}>
          Salvar armazenamento
        </button>
        <button type="button" disabled={busy} onClick={close}>
          Cancelar
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function EntryForm({
  foods,
  today,
  busy,
  preparation = false,
  submit,
  purchase = false,
}: {
  foods: Food[];
  today: string;
  busy: boolean;
  preparation?: boolean;
  purchase?: boolean;
  submit: (entry: Entry, input?: string) => Promise<boolean>;
}) {
  const [foodId, setFoodId] = useState("");
  const food = foods.find((f) => f.id === foodId);
  const [basis, setBasis] = useState<Basis>("AS_SOLD");
  const [quantity, setQuantity] = useState("");
  const [input, setInput] = useState("");
  const [unit, setUnit] = useState<Unit>("G");
  const [location, setLocation] = useState("FRIDGE");
  const [condition, setCondition] = useState("SEALED");
  const [received, setReceived] = useState(today);
  const [expiry, setExpiry] = useState("");
  const [source, setSource] = useState("LABEL");
  const [certainty, setCertainty] = useState("PARTIAL");
  const [opened, setOpened] = useState(today);
  const [prepared, setPrepared] = useState(today);
  return (
    <form
      className="plan-meal"
      onSubmit={async (e) => {
        e.preventDefault();
        const entry: Entry = {
          foodId,
          basis: preparation ? "COOKED" : basis,
          quantity,
          unit,
          location,
          condition: preparation ? "PREPARED" : condition,
          receivedDate: preparation ? today : received,
          expiry: expiry || null,
          expirySource: expiry ? source : "UNKNOWN",
          openedDate: condition === "OPENED" ? opened : null,
          preparedDate: preparation
            ? today
            : condition === "PREPARED"
              ? prepared
              : null,
          knowledge: certainty,
        };
        if (await submit(entry, input)) {
          setQuantity("");
          setInput("");
        }
      }}
    >
      <h2>
        {preparation
          ? "Registrar preparo"
          : purchase
            ? "Receber uma compra"
            : "Adicionar lote"}
      </h2>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <div className="plan-item">
          <label>
            Alimento
            <select
              required
              value={foodId}
              onChange={(e) => {
                const f = foods.find((f) => f.id === e.target.value);
                setFoodId(e.target.value);
                if (f) setUnit(f.unit);
              }}
            >
              <option value="">Selecione</option>
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          {!preparation && (
            <label>
              Estado
              <select
                value={basis}
                onChange={(e) => setBasis(e.target.value as Basis)}
              >
                {Object.entries(bases).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
          {preparation && (
            <label>
              Quantidade crua utilizada
              <input
                type="number"
                required
                min={unit === "UNIT" ? 1 : 0.000001}
                step={unit === "UNIT" ? 1 : "0.000001"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>
          )}
          <label>
            {preparation ? "Rendimento preparado" : "Quantidade"}
            <input
              type="number"
              required
              min={unit === "UNIT" ? 1 : 0.000001}
              step={unit === "UNIT" ? 1 : "0.000001"}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
          <label>
            Unidade
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
            >
              {compatibleUnits(food?.unit || unit).map((u) => (
                <option key={u} value={u}>
                  {units[u]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Armazenamento
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {Object.entries(locations).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          {!preparation && (
            <>
              <label>
                Condição
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  {Object.entries(conditions).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data da entrada
                <input
                  type="date"
                  required
                  max={today}
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                />
              </label>
            </>
          )}
          {condition === "OPENED" && !preparation && (
            <label>
              Data de abertura
              <input
                type="date"
                required
                min={received}
                max={today}
                value={opened}
                onChange={(e) => setOpened(e.target.value)}
              />
            </label>
          )}
          {condition === "PREPARED" && !preparation && (
            <label>
              Data do preparo
              <input
                type="date"
                required
                min={received}
                max={today}
                value={prepared}
                onChange={(e) => setPrepared(e.target.value)}
              />
            </label>
          )}
          <label>
            Validade (opcional)
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          {expiry && (
            <label>
              Origem da validade
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="LABEL">Rótulo</option>
                <option value="USER">Informada por mim</option>
                <option value="ESTIMATE">Estimativa minha</option>
              </select>
            </label>
          )}
          {!preparation && !purchase && (
            <label>
              Conhecimento do saldo
              <select
                value={certainty}
                onChange={(e) => setCertainty(e.target.value)}
              >
                <option value="PARTIAL">Ainda falta conferir</option>
                <option value="KNOWN">Todos os lotes foram cadastrados</option>
              </select>
            </label>
          )}
        </div>
        <p>
          {preparation
            ? "O preparo baixa o saldo cru e cria um lote preparado. O consumo posterior usará esse lote."
            : "Sem validade informada, o lote fica marcado como desconhecido. Nenhum prazo é calculado automaticamente."}
        </p>
        <button className="button" disabled={!foods.length}>
          {busy
            ? "Registrando…"
            : preparation
              ? "Confirmar preparo"
              : purchase
                ? "Confirmar recebimento"
                : "Salvar lote"}
        </button>
      </fieldset>
    </form>
  );
}
