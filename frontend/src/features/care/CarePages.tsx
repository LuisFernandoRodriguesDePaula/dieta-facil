import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { localDate } from "../../lib/dates";
import { CareLayout } from "./CareAccess";
import { useFeatures } from "./features";
import { EditorLoader } from "../plans/PlansPage";
import type { Occurrence, Schedule } from "../plans/PlansPage";
import { DietApiContext } from "../plans/DietApi";
import SwapPanel from "../plans/SwapPanel";
import { useFoods } from "../foods/useFoods";
import { units, categories } from "../foods/food-types";
import type { Stock } from "../inventory/InventoryPage";
import "../plans/plans.css";
import "./care.css";

type CareLink = {
  id: string;
  clientId: string | null;
  name: string;
  email: string;
  professionalName: string;
  status: string;
  expiresAt: string;
};
type Evaluation = {
  id: string;
  date: string;
  version: number;
  authorName: string;
  weight: number;
  height: number | null;
  waist: number | null;
  goal: string;
  notes: string;
};
const failure = (e: unknown) =>
  e instanceof ApiError
    ? e.message
    : "Não foi possível conectar. Tente novamente.";
export function ResultsPage() {
  return (
    <CareLayout>
      <h1>Meus resultados</h1>
      <p>
        Veja as avaliações registradas pelo seu nutricionista. Você não precisa
        preencher dados todos os dias.
      </p>
      <OwnResults />
    </CareLayout>
  );
}
function OwnResults() {
  const query = useQuery({
    queryKey: ["results"],
    queryFn: () => api<Evaluation[]>("/api/results"),
    retry: false,
  });
  return (
    <>
      {query.isPending ? (
        <p role="status">Carregando avaliações…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{failure(query.error)}</p>
          <button onClick={() => query.refetch()}>Tentar novamente</button>
        </div>
      ) : (
        <ResultsHistory evaluations={query.data} />
      )}
    </>
  );
}
function ResultsHistory({
  evaluations,
  onEdit,
}: {
  evaluations: Evaluation[];
  onEdit?: (e: Evaluation) => void;
}) {
  if (!evaluations.length)
    return (
      <section className="diet-empty">
        <h2>Uma evolução, mês a mês</h2>
        <p>
          As avaliações aparecerão aqui quando seu nutricionista registrar o
          primeiro acompanhamento.
        </p>
      </section>
    );
  const chart = [...evaluations].reverse();
  const weights = chart.map((e) => Number(e.weight));
  const min = Math.min(...weights) - 1,
    max = Math.max(...weights) + 1;
  return (
    <>
      <section className="care-chart">
        <h2>Histórico de peso</h2>
        <p>
          O peso é um dos registros do acompanhamento. As medidas e observações
          complementam cada avaliação.
        </p>
        {chart.length > 1 && (
          <svg
            role="img"
            aria-label="Evolução de peso; valores detalhados nas avaliações abaixo"
            viewBox="0 0 600 160"
          >
            <path d="M20 140 H580" stroke="#c9d5c8" />
            <polyline
              fill="none"
              stroke="#284e3d"
              strokeWidth="3"
              points={chart
                .map(
                  (e, i) =>
                    `${20 + (i * 560) / (chart.length - 1)},${140 - ((Number(e.weight) - min) / (max - min)) * 120}`,
                )
                .join(" ")}
            />
            {chart.map((e, i) => (
              <circle
                key={e.id}
                cx={20 + (i * 560) / (chart.length - 1)}
                cy={140 - ((Number(e.weight) - min) / (max - min)) * 120}
                r="5"
                fill="#284e3d"
              />
            ))}
          </svg>
        )}
      </section>
      <div className="care-evaluations">
        {evaluations.map((e) => (
          <article className="plan-meal" key={e.id}>
            <header className="plan-row">
              <h2>
                {new Intl.DateTimeFormat("pt-BR", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(e.date + "T12:00:00Z"))}
              </h2>
              <span>{e.date.split("-").reverse().join("/")}</span>
            </header>
            <dl className="care-measures">
              <div>
                <dt>Peso</dt>
                <dd>{Number(e.weight).toLocaleString("pt-BR")} kg</dd>
              </div>
              {e.height != null && (
                <div>
                  <dt>Altura</dt>
                  <dd>{Number(e.height).toLocaleString("pt-BR")} cm</dd>
                </div>
              )}
              {e.waist != null && (
                <div>
                  <dt>Cintura</dt>
                  <dd>{Number(e.waist).toLocaleString("pt-BR")} cm</dd>
                </div>
              )}
            </dl>
            {e.goal && (
              <p>
                <strong>Objetivo:</strong> {e.goal}
              </p>
            )}
            {e.notes && <p className="care-notes">{e.notes}</p>}
            <p className="access-note">Registrado por {e.authorName}</p>
            {onEdit && (
              <button onClick={() => onEdit(e)}>
                Editar avaliação deste mês
              </button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
export function CarePage() {
  return (
    <CareLayout>
      <h1>Meu nutricionista</h1>
      <p>Você controla quem pode acompanhar sua dieta e seus resultados.</p>
      <Relationships />
    </CareLayout>
  );
}
function Relationships() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["care"],
    queryFn: () => api<CareLink[]>("/api/care"),
    retry: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");
  const act = async (id: string, action: string) => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/care/${id}/${action}`, "POST", {});
      setConfirm("");
      await client.invalidateQueries();
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  };
  if (query.isPending) return <p role="status">Carregando acompanhamento…</p>;
  if (query.isError)
    return (
      <div role="alert">
        <p>{failure(query.error)}</p>
        <button onClick={() => query.refetch()}>Tentar novamente</button>
      </div>
    );
  const links = query.data.filter((l) => l.status !== "REVOKED");
  return (
    <>
      {!links.length && (
        <section className="diet-empty">
          <h2>Seu acompanhamento começa com um convite</h2>
          <p>
            Peça ao nutricionista para convidar o e-mail da sua conta. O convite
            aparecerá aqui para você aceitar.
          </p>
        </section>
      )}
      {links.map((l) => (
        <article className="plan-meal" key={l.id}>
          <p className="eyebrow">
            {l.status === "ACTIVE"
              ? "ACOMPANHAMENTO ATIVO"
              : "CONVITE RECEBIDO"}
          </p>
          <h2>{l.professionalName}</h2>
          <p>
            {l.status === "ACTIVE"
              ? "Pode configurar sua dieta, liberar alternativas e registrar avaliações mensais."
              : "Ao aceitar, você autoriza este profissional a acessar sua dieta e resultados e a registrar seu acompanhamento."}
          </p>
          <div className="plan-actions">
            {l.status === "PENDING" && (
              <button
                className="button"
                disabled={busy}
                onClick={() => act(l.id, "accept")}
              >
                Aceitar acompanhamento
              </button>
            )}
            <button
              disabled={busy}
              onClick={() =>
                confirm === l.id ? act(l.id, "revoke") : setConfirm(l.id)
              }
            >
              {confirm === l.id
                ? "Confirmar revogação"
                : l.status === "ACTIVE"
                  ? "Revogar acesso"
                  : "Recusar convite"}
            </button>
          </div>
        </article>
      ))}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p className="access-note">
        Revogar encerra o acesso do profissional. Sua dieta e o histórico de
        avaliações continuam na sua conta.
      </p>
    </>
  );
}
export function ProfessionalPage() {
  return (
    <CareLayout professional>
      <h1>Meus clientes</h1>
      <p>Prepare a dieta e acompanhe os resultados em um único espaço.</p>
      <ProfessionalClients />
    </CareLayout>
  );
}
function ProfessionalClients() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ["clients"],
    queryFn: () => api<CareLink[]>("/api/professional/clients"),
    retry: false,
  });
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState<string | null>(null);
  const status = (l: CareLink) =>
    l.status === "ACTIVE"
      ? "active"
      : new Date(l.expiresAt).getTime() <= now
        ? "expired"
        : "pending";
  const links = (query.data ?? []).filter((l) => l.status !== "REVOKED");
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const visible = links.filter(
    (l) =>
      (filter === "all" || status(l) === filter) &&
      normalize(l.name + " " + l.email).includes(normalize(search.trim())),
  );
  const act = async (path: string, body: unknown, message: string) => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(path, "POST", body);
      setConfirm(null);
      setNow(Date.now());
      await client.invalidateQueries({ queryKey: ["clients"] });
      setNotice(message);
      return true;
    } catch (err) {
      setError(failure(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <form
        className="plan-meal"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await act(
              "/api/professional/clients",
              { name, email },
              "Convite disponível na conta do cliente por sete dias. Nenhum e-mail foi enviado.",
            )
          ) {
            setName("");
            setEmail("");
          }
        }}
      >
        <h2>Convidar cliente</h2>
        <p>
          Informe o e-mail que a pessoa usa ou usará para criar a conta. O
          cliente precisa aceitar o vínculo antes de você acessar os dados.
        </p>
        <fieldset disabled={busy}>
          <div className="plan-row">
            <label>
              Nome do cliente
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              E-mail do cliente
              <input
                required
                type="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
          <button className="button care-submit">
            {busy ? "Aguarde…" : "Criar convite"}
          </button>
        </fieldset>
      </form>
      {notice && (
        <p role="status" className="form-success">
          {notice}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {query.isPending ? (
        <p role="status">Carregando clientes…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{failure(query.error)}</p>
          <button onClick={() => query.refetch()}>
            Tentar carregar clientes novamente
          </button>
        </div>
      ) : (
        <section aria-label="Lista de clientes">
          <div className="care-client-tools">
            <label>
              Buscar cliente
              <input
                type="search"
                value={search}
                placeholder="Nome ou e-mail"
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Situação
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Todos ({links.length})</option>
                <option value="active">
                  Vinculados (
                  {links.filter((l) => status(l) === "active").length})
                </option>
                <option value="pending">
                  Aguardando aceite (
                  {links.filter((l) => status(l) === "pending").length})
                </option>
                <option value="expired">
                  Convites expirados (
                  {links.filter((l) => status(l) === "expired").length})
                </option>
              </select>
            </label>
          </div>
          <p className="access-note" aria-live="polite">
            {visible.length} de {links.length} clientes
          </p>
          {!links.length ? (
            <div className="diet-empty">
              <h2>Seu primeiro acompanhamento começa aqui</h2>
              <p>
                Crie um convite acima. Quando o cliente aceitar, você poderá
                preparar a dieta e registrar as avaliações.
              </p>
            </div>
          ) : !visible.length ? (
            <div className="diet-empty">
              <h2>Nenhum cliente encontrado</h2>
              <p>Tente outro nome, e-mail ou situação.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Limpar busca e filtro
              </button>
            </div>
          ) : (
            <div className="care-client-grid">
              {visible.map((l) => (
                <article className="plan-meal" key={l.id} aria-label={l.name}>
                  <span className="eyebrow">
                    {status(l) === "active"
                      ? "VINCULADO"
                      : status(l) === "expired"
                        ? "CONVITE EXPIRADO"
                        : "AGUARDANDO ACEITE"}
                  </span>
                  <h2>{l.name}</h2>
                  <p>{l.email}</p>
                  {l.status === "ACTIVE" ? (
                    <Link to={"/profissional/clientes/" + l.clientId}>
                      Abrir acompanhamento →
                    </Link>
                  ) : (
                    <>
                      <p className="access-note">
                        {status(l) === "expired"
                          ? "Renove o convite para permitir o aceite."
                          : "Disponível até " +
                            new Intl.DateTimeFormat("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(l.expiresAt)) +
                            ". O convite aparece dentro da conta do cliente."}
                      </p>
                      <div className="plan-actions">
                        <button
                          disabled={busy}
                          onClick={() =>
                            act(
                              "/api/professional/clients",
                              { name: l.name, email: l.email },
                              "Convite renovado por sete dias. Nenhum e-mail foi enviado.",
                            )
                          }
                        >
                          Renovar convite
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => setConfirm(l.id)}
                        >
                          Cancelar convite
                        </button>
                      </div>
                      {confirm === l.id && (
                        <div
                          className="care-confirm"
                          role="group"
                          aria-label={"Cancelar convite de " + l.name}
                        >
                          <p>
                            Este convite deixará de permitir o aceite. Você
                            poderá criar outro depois.
                          </p>
                          <button
                            disabled={busy}
                            onClick={() =>
                              act(
                                "/api/care/" + l.id + "/revoke",
                                {},
                                "Convite cancelado.",
                              )
                            }
                          >
                            Confirmar cancelamento
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setConfirm(null)}
                          >
                            Manter convite
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
export function ProfessionalClientPage() {
  return (
    <CareLayout professional>
      <ProfessionalClient />
    </CareLayout>
  );
}
function ProfessionalClient() {
  const { clientId } = useParams();
  const prefix = "/api/professional/clients/" + clientId;
  const profile = useQuery({
    queryKey: ["client", clientId],
    queryFn: () =>
      api<{ id: string; name: string; timezone: string }>(prefix + "/profile"),
    retry: false,
  });
  if (profile.isPending) return <p role="status">Carregando cliente…</p>;
  if (profile.isError)
    return (
      <div role="alert">
        <p>{failure(profile.error)}</p>
        <button onClick={() => profile.refetch()}>Tentar novamente</button>
        <Link to="/profissional">Voltar aos clientes</Link>
      </div>
    );
  return (
    <DietApiContext.Provider value={prefix}>
      <ClientWorkspace
        key={clientId}
        id={profile.data.id}
        name={profile.data.name}
        timezone={profile.data.timezone}
        prefix={prefix}
      />
    </DietApiContext.Provider>
  );
}
function ClientWorkspace({
  id,
  name,
  timezone,
  prefix,
}: {
  id: string;
  name: string;
  timezone: string;
  prefix: string;
}) {
  const today = localDate(timezone);
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState("diet");
  const [meal, setMeal] = useState<Occurrence | null>(null);
  const schedule = useQuery({
    queryKey: ["schedule", id, date],
    queryFn: () => api<Schedule>(prefix + "/schedule?date=" + date),
    retry: false,
    enabled: tab === "diet",
  });
  return (
    <>
      <Link to="/profissional">← Meus clientes</Link>
      <h1>{name}</h1>
      <div
        className="care-tabs"
        role="group"
        aria-label="Acompanhamento do cliente"
      >
        {[
          ["diet", "Dieta"],
          ["foods", "Alimentos"],
          ["results", "Avaliações mensais"],
          ["reports", "Bioimpedância e relatórios"],
        ].map(([key, text]) => (
          <button
            aria-pressed={tab === key}
            key={key}
            onClick={() => setTab(key)}
          >
            {text}
          </button>
        ))}
      </div>
      {tab === "diet" ? (
        <>
          <ImportPlaceholder
            subject="dieta"
            description="Espaço reservado para trazer uma dieta de outro sistema. Nesta versão, preencha as refeições e porções abaixo."
          />
          <label className="plan-date">
            Revisão a partir de
            <input
              type="date"
              required
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
          <EditorLoader key={date} userId={id} date={date} today={today} />
          <section className="plan-meal">
            <h2>Alternativas autorizadas</h2>
            <p>
              Salve a dieta e escolha uma refeição para vincular as opções que o
              cliente poderá usar.
            </p>
            {schedule.isError && <p role="alert">{failure(schedule.error)}</p>}
            <div className="plan-actions">
              {schedule.data?.meals
                .filter((m) => m.status === "PENDING")
                .map((m) => (
                  <button
                    disabled={date < today}
                    key={m.id}
                    onClick={() => setMeal(m)}
                  >
                    Configurar trocas de {m.name}
                  </button>
                ))}
            </div>
          </section>
        </>
      ) : tab === "foods" ? (
        <>
          <ImportPlaceholder
            subject="alimentos"
            description="Espaço reservado para importar um catálogo de alimentos. O cadastro manual continua disponível abaixo."
          />
          <ClientFoods id={id} prefix={prefix} />
        </>
      ) : tab === "results" ? (
        <>
          <ImportPlaceholder
            subject="avaliações"
            description="Espaço reservado para importar avaliações anteriores. Por enquanto, registre os dados mensais manualmente."
          />
          <ProfessionalResults id={id} prefix={prefix} today={today} />
        </>
      ) : (
        <section className="plan-meal">
          <h2>Bioimpedância e relatórios</h2>
          <p>
            Este espaço reunirá os relatórios do cliente quando a importação
            estiver disponível.
          </p>
          <ImportPlaceholder
            subject="relatórios de bioimpedância"
            description="Os formatos e os sistemas de origem serão definidos em uma próxima etapa. Nenhum relatório é recebido, armazenado ou exibido nesta versão."
          />
          <p>
            Para o acompanhamento atual, use Avaliações mensais para registrar
            peso, medidas opcionais e observações.
          </p>
        </section>
      )}{" "}
      {meal && (
        <SwapPanel
          userId={id}
          date={date}
          meal={meal}
          configure
          onClose={() => setMeal(null)}
          onSaved={() => setMeal(null)}
        />
      )}
    </>
  );
}
function ImportPlaceholder({
  subject,
  description,
}: {
  subject: string;
  description: string;
}) {
  return (
    <section className="care-import" aria-label={"Importação de " + subject}>
      <p className="eyebrow">IMPORTAÇÃO · EM BREVE</p>
      <p>{description}</p>
      <label>
        Arquivo de {subject}
        <input type="file" disabled />
      </label>
      <p className="access-note">
        Campo reservado. Importação indisponível nesta versão.
      </p>
    </section>
  );
}
function ClientFoods({ id, prefix }: { id: string; prefix: string }) {
  const query = useFoods(id, prefix);
  const client = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <form
        className="plan-meal"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          setBusy(true);
          setError("");
          try {
            await api(prefix + "/foods", "POST", {
              name: data.get("name"),
              unit: data.get("unit"),
              category: data.get("category"),
              purchaseFrequency: "WEEKLY",
            });
            form.reset();
            await client.invalidateQueries({ queryKey: ["all-foods", id] });
          } catch (err) {
            setError(failure(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Alimentos do plano</h2>
        <p>
          Cadastre os alimentos uma vez para usar nas refeições e nas
          alternativas deste cliente.
        </p>
        <fieldset disabled={busy}>
          <label>
            Nome do alimento
            <input name="name" required maxLength={120} />
          </label>
          <div className="plan-row">
            <label>
              Unidade
              <select name="unit">
                {Object.entries(units).map(([key, text]) => (
                  <option key={key} value={key}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria
              <select name="category">
                {Object.entries(categories).map(([key, text]) => (
                  <option key={key} value={key}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="button care-submit">Adicionar alimento</button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
      </form>
      {query.isError ? (
        <div role="alert">
          <p>{failure(query.error)}</p>
          <button onClick={() => query.refetch()}>Tentar novamente</button>
        </div>
      ) : (
        <ul>
          {query.data?.map((f) => (
            <li key={f.id}>
              {f.name} · {units[f.unit]}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
function ProfessionalResults({
  id,
  prefix,
  today,
}: {
  id: string;
  prefix: string;
  today: string;
}) {
  const query = useQuery({
    queryKey: ["results", id],
    queryFn: () => api<Evaluation[]>(prefix + "/results"),
    retry: false,
  });
  const [editing, setEditing] = useState<Evaluation | null | undefined>(
    undefined,
  );
  return (
    <>
      <div className="plan-actions">
        <button
          className="button"
          disabled={!query.isSuccess}
          onClick={() =>
            setEditing(
              query.data?.find(
                (e) => e.date.slice(0, 7) === today.slice(0, 7),
              ) ?? null,
            )
          }
        >
          Registrar avaliação mensal
        </button>
      </div>
      {editing !== undefined && (
        <EvaluationForm
          key={editing?.id ?? "new"}
          existing={editing}
          today={today}
          prefix={prefix}
          all={query.data ?? []}
          onClose={() => setEditing(undefined)}
        />
      )}{" "}
      {query.isPending ? (
        <p role="status">Carregando avaliações…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{failure(query.error)}</p>
          <button onClick={() => query.refetch()}>Tentar novamente</button>
        </div>
      ) : (
        <ResultsHistory evaluations={query.data} onEdit={setEditing} />
      )}
    </>
  );
}
function EvaluationForm({
  existing,
  today,
  prefix,
  all,
  onClose,
}: {
  existing: Evaluation | null;
  today: string;
  prefix: string;
  all: Evaluation[];
  onClose: () => void;
}) {
  const [date, setDate] = useState(existing?.date ?? today);
  const [version, setVersion] = useState(existing?.version ?? 0);
  const [weight, setWeight] = useState(String(existing?.weight ?? ""));
  const [height, setHeight] = useState(String(existing?.height ?? ""));
  const [waist, setWaist] = useState(String(existing?.waist ?? ""));
  const [goal, setGoal] = useState(existing?.goal ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const client = useQueryClient();
  return (
    <form
      className="plan-meal"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await api(prefix + "/results", "PUT", {
            date,
            version,
            weight: Number(weight),
            height: height ? Number(height) : null,
            waist: waist ? Number(waist) : null,
            goal,
            notes,
          });
          await client.invalidateQueries({ queryKey: ["results"] });
          onClose();
        } catch (err) {
          setError(failure(err));
          setConflict(err instanceof ApiError && err.status === 409);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Avaliação mensal</h2>
      <fieldset disabled={busy}>
        <label>
          Data da avaliação
          <input
            type="date"
            required
            max={today}
            value={date}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              const sameMonth = next.slice(0, 7) === date.slice(0, 7);
              setDate(next);
              if (!sameMonth) {
                const found = all.find(
                  (v) => v.date.slice(0, 7) === next.slice(0, 7),
                );
                setVersion(found?.version ?? 0);
                setWeight(String(found?.weight ?? ""));
                setHeight(String(found?.height ?? ""));
                setWaist(String(found?.waist ?? ""));
                setGoal(found?.goal ?? "");
                setNotes(found?.notes ?? "");
              }
            }}
          />
        </label>
        <div className="care-form-grid">
          {[
            ["Peso (kg)", weight, setWeight, "500"],
            ["Altura (cm) · opcional", height, setHeight, "300"],
            ["Cintura (cm) · opcional", waist, setWaist, "300"],
          ].map(([label, value, setter, max]) => (
            <label key={label as string}>
              {label as string}
              <input
                type="number"
                min="1"
                max={max as string}
                step="0.01"
                required={label === "Peso (kg)"}
                value={value as string}
                onChange={(e) =>
                  (setter as (v: string) => void)(e.target.value)
                }
              />
            </label>
          ))}
        </div>
        <label>
          Objetivo
          <input
            maxLength={500}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </label>
        <label>
          Observações da avaliação
          <textarea
            rows={4}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <p className="access-note">
          Um registro por mês. Ao editar um mês existente, o registro será
          atualizado.
        </p>
        <div className="plan-actions">
          <button className="button">Salvar avaliação</button>
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <div className="care-confirm">
          <p>
            Suas alterações continuam neste formulário. Você pode copiar suas
            observações antes de carregar a avaliação salva. Carregar
            substituirá os campos pela versão atual.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const latest = await api<Evaluation[]>(prefix + "/results");
                const found = latest.find(
                  (e) => e.date.slice(0, 7) === date.slice(0, 7),
                );
                if (found) {
                  setDate(found.date);
                  setVersion(found.version);
                  setWeight(String(found.weight));
                  setHeight(String(found.height ?? ""));
                  setWaist(String(found.waist ?? ""));
                  setGoal(found.goal);
                  setNotes(found.notes);
                } else {
                  setVersion(0);
                }
                await client.invalidateQueries({ queryKey: ["results"] });
                setConflict(false);
                setError("");
              } catch (err) {
                setError(failure(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            Carregar avaliação atual
          </button>
        </div>
      )}
    </form>
  );
}
export function PremiumPage() {
  return (
    <CareLayout>
      <h1>Recursos Premium</h1>
      <p>
        A dieta e o acompanhamento funcionam no Básico. Estoque, compras e
        preparo são extras opcionais.
      </p>
      <PremiumControls />
    </CareLayout>
  );
}
function PremiumControls() {
  const features = useFeatures();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const review = useQuery({
    queryKey: ["inventory-review"],
    queryFn: () => api<Stock>("/api/features/inventory-review"),
    enabled:
      features.data?.inventoryAllowed === true &&
      !features.data.inventoryEnabled,
    retry: false,
  });
  const act = async (path: string, body: unknown) => {
    setBusy(true);
    setError("");
    try {
      await api(path, "POST", body);
      setNotice(
        "Preferências atualizadas. Nenhuma refeição anterior foi descontada.",
      );
      setReviewed(false);
      await client.invalidateQueries();
    } catch (e) {
      setError(failure(e));
    } finally {
      setBusy(false);
    }
  };
  if (features.isPending) return <p role="status">Carregando plano…</p>;
  if (features.isError) return <p role="alert">{failure(features.error)}</p>;
  const f = features.data;
  return (
    <>
      <section className="plan-meal">
        <p className="eyebrow">
          {f.tier === "BASIC" ? "PLANO BÁSICO" : "PLANO PREMIUM"}
        </p>
        <h2>
          {f.inventoryEnabled
            ? "Controle de estoque ativado"
            : "Dieta sem controle de estoque"}
        </h2>
        <p>
          {f.inventoryEnabled
            ? "Confirmar uma refeição pode baixar as porções previstas. Você pode desativar esse controle a qualquer momento."
            : "Consultar a dieta e registrar refeições não baixa produtos. Os saldos existentes são preservados."}
        </p>
        <ul>
          <li>Estoque por lotes e validade</li>
          <li>Compras com base no consumo previsto</li>
          <li>Preparo e baixa dos ingredientes</li>
        </ul>
        {f.inventoryEnabled ? (
          <button
            disabled={busy}
            onClick={() =>
              act("/api/features/inventory", {
                enabled: false,
                reviewed: false,
              })
            }
          >
            Desativar controle de estoque
          </button>
        ) : f.inventoryAllowed ? (
          <>
            <h3>Conferir antes de ativar</h3>
            {review.isPending ? (
              <p role="status">Carregando saldos preservados…</p>
            ) : review.isError ? (
              <p role="alert">{failure(review.error)}</p>
            ) : (
              <>
                <ul>
                  {review.data.lots.map((l) => (
                    <li key={l.id}>
                      {l.name} ·{" "}
                      {l.basis === "COOKED"
                        ? "preparado"
                        : l.basis === "RAW"
                          ? "cru"
                          : "como vendido"}{" "}
                      · {l.quantity} {units[l.unit]}
                    </li>
                  ))}
                </ul>
                {!review.data.lots.length && <p>Seu estoque começa vazio.</p>}
                <label className="swap-toggle">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />{" "}
                  Conferi os saldos e quero ativar o controle
                </label>
                <button
                  className="button care-submit"
                  disabled={busy || !reviewed}
                  onClick={() =>
                    act("/api/features/inventory", { enabled: true, reviewed })
                  }
                >
                  Ativar controle de estoque
                </button>
              </>
            )}
          </>
        ) : (
          <p>
            Os recursos adicionais ficam indisponíveis no Básico. Não há
            contratação ou cobrança nesta versão demonstrável.
          </p>
        )}
      </section>
      {import.meta.env.DEV && (
        <section className="plan-meal">
          <h2>Simulação de plano · demonstração local</h2>
          <p>Permite testar as duas experiências, sem pagamento.</p>
          <button
            disabled={busy}
            onClick={() =>
              act("/api/demo/features", {
                tier: f.tier === "BASIC" ? "PREMIUM" : "BASIC",
              })
            }
          >
            {f.tier === "BASIC"
              ? "Experimentar Premium na demonstração"
              : "Voltar ao Básico"}
          </button>
        </section>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
