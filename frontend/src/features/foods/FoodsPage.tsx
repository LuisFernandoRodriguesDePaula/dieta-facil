import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Calculator,
  LoaderCircle,
  Pencil,
  Plus,
  Salad,
  Search,
  Sprout,
} from "lucide-react";
import { ApiError, api } from "../../lib/api";
import { sessionKey, useSession } from "../auth/session";
import FoodForm from "./FoodForm";
import UnitConverter from "./UnitConverter";
import { categories, frequencies, units } from "./food-types";
import type { Food, FoodListing } from "./food-types";
import "./foods.css";

export default function FoodsPage() {
  const session = useSession();
  if (session.isPending)
    return (
      <div className="catalog-loading" role="status">
        Verificando sua sessão…
      </div>
    );
  if (session.isError)
    return (
      <div className="catalog-loading">
        <p role="alert">Não foi possível verificar sua conta.</p>
        <button className="button" onClick={() => session.refetch()}>
          Tentar novamente
        </button>
        <Link to="/">Voltar à demonstração</Link>
      </div>
    );
  if (!session.data)
    return <Navigate to="/entrar" replace state={{ requiresLogin: true }} />;
  return (
    <Catalog
      key={session.data.id}
      userId={session.data.id}
      name={session.data.name}
    />
  );
}

function Catalog({ userId, name }: { userId: string; name: string }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<Food | "new" | null>(null);
  const [converting, setConverting] = useState<Food | null>(null);
  const [archiving, setArchiving] = useState<Food | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const foods = useQuery<FoodListing>({
    queryKey: ["foods", userId, query, archived, page],
    queryFn: () =>
      api(
        `/api/foods?q=${encodeURIComponent(query)}&archived=${archived}&page=${page}&size=20`,
      ),
    retry: false,
    staleTime: 0,
  });
  const expired = foods.error instanceof ApiError && foods.error.status === 401;
  useEffect(() => {
    if (expired) {
      client.clear();
      client.setQueryData(sessionKey, null);
      navigate("/entrar", { replace: true, state: { expired: true } });
    }
  }, [expired, client, navigate]);
  const failure = (problem: unknown) => {
    if (problem instanceof ApiError && problem.status === 401) {
      client.clear();
      client.setQueryData(sessionKey, null);
      navigate("/entrar", { replace: true, state: { expired: true } });
    }
    return problem instanceof ApiError
      ? problem.message
      : "Não foi possível conectar. Tente novamente.";
  };
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ["foods", userId] });
  };
  const archive = async (food: Food, value: boolean) => {
    setPendingId(food.id);
    setError("");
    setNotice("");
    try {
      await api<Food>(`/api/foods/${food.id}/archive`, "PATCH", {
        archived: value,
        version: food.version,
      });
      setArchiving(null);
      setNotice(
        value
          ? "Alimento arquivado. Ele foi preservado e pode ser restaurado."
          : "Alimento restaurado no catálogo ativo.",
      );
      if ((foods.data?.items.length ?? 0) === 1 && page > 0) setPage(page - 1);
      await refresh();
    } catch (problem) {
      setArchiving(null);
      setError(failure(problem));
    } finally {
      setPendingId("");
    }
  };
  const changeTab = (value: boolean) => {
    setArchived(value);
    setPage(0);
    setEditor(null);
    setConverting(null);
    setNotice("");
    setError("");
  };
  return (
    <>
      <div className="catalog-shell" inert={archiving !== null}>
        <header className="catalog-header">
          <Link className="catalog-brand" to="/">
            <Sprout />
            Dieta Fácil
          </Link>
          <div>
            <span>{name}</span>
            <Link to="/conta">
              Minha conta <ArrowRight size={15} />
            </Link>
          </div>
        </header>
        <main className="catalog-main">
          <Link className="back-link" to="/conta">
            <ArrowLeft size={16} />
            Voltar à minha conta
          </Link>
          <div className="catalog-heading">
            <div>
              <p className="eyebrow">SUA BASE PARA PLANEJAR MELHOR</p>
              <h1>
                Seus alimentos<span>.</span>
              </h1>
              <p>Um catálogo só seu, organizado do seu jeito.</p>
            </div>
            <button
              className="button"
              onClick={() => {
                setEditor("new");
                setConverting(null);
                setNotice("");
              }}
            >
              <Plus size={18} />
              Novo alimento
            </button>
          </div>
          <div className="catalog-tip">
            <Salad size={23} />
            <p>
              <strong>Comece pelo que faz parte da sua rotina.</strong>
              <span>
                Cadastre nome, unidade e categoria. Quantidades de dieta e
                estoque entram nas próximas etapas.
              </span>
            </p>
          </div>
          <div className="catalog-toolbar">
            <div
              className="catalog-tabs"
              role="group"
              aria-label="Situação dos alimentos"
            >
              <button aria-pressed={!archived} onClick={() => changeTab(false)}>
                Ativos
              </button>
              <button aria-pressed={archived} onClick={() => changeTab(true)}>
                Arquivados
              </button>
            </div>
            <form
              className="catalog-search"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(search.trim());
                setPage(0);
              }}
            >
              <label className="sr-only" htmlFor="food-search">
                Buscar alimento
              </label>
              <input
                id="food-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={120}
                placeholder="Buscar pelo nome…"
              />
              <button aria-label="Buscar">
                <Search size={18} />
              </button>
            </form>
          </div>
          {notice && (
            <p className="catalog-success" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="catalog-error" role="alert">
              {error}{" "}
              <button
                onClick={() => {
                  setEditor(null);
                  setConverting(null);
                  refresh();
                }}
              >
                Recarregar catálogo
              </button>
            </p>
          )}
          <div
            className={`catalog-content ${editor || converting ? "with-panel" : ""}`}
          >
            <section
              className="catalog-results"
              aria-label="Catálogo de alimentos"
            >
              <div className="results-heading">
                <h2>
                  {archived ? "Alimentos arquivados" : "Catálogo pessoal"}
                </h2>
                {foods.data && (
                  <span>
                    {foods.data.totalElements}{" "}
                    {foods.data.totalElements === 1 ? "alimento" : "alimentos"}
                  </span>
                )}
              </div>
              {foods.isPending && (
                <div className="catalog-empty" role="status">
                  <LoaderCircle className="spin" />
                  Carregando alimentos…
                </div>
              )}
              {foods.isError && !expired && (
                <div className="catalog-empty">
                  <p role="alert">{failure(foods.error)}</p>
                  <button className="button" onClick={() => foods.refetch()}>
                    Tentar novamente
                  </button>
                </div>
              )}
              {foods.data?.items.length === 0 && (
                <div className="catalog-empty">
                  <Salad size={38} />
                  <h3>
                    {query
                      ? "Nenhum alimento encontrado."
                      : archived
                        ? "Nenhum alimento arquivado."
                        : "Seu catálogo começa aqui."}
                  </h3>
                  <p>
                    {query
                      ? "Tente outro nome ou limpe a busca."
                      : archived
                        ? "Os alimentos arquivados ficam preservados nesta lista."
                        : "Adicione seu primeiro alimento para preparar a base da sua dieta."}
                  </p>
                  {query ? (
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setQuery("");
                        setSearch("");
                        setPage(0);
                      }}
                    >
                      Limpar busca
                    </button>
                  ) : (
                    !archived && (
                      <button
                        className="button"
                        onClick={() => setEditor("new")}
                      >
                        Cadastrar primeiro alimento
                      </button>
                    )
                  )}
                </div>
              )}
              <div className="personal-food-list">
                {foods.data?.items.map((food) => (
                  <article key={food.id} className="personal-food">
                    <div className="personal-food-icon">
                      <Salad size={23} />
                    </div>
                    <div className="personal-food-info">
                      <h3>{food.name}</h3>
                      <p>
                        {categories[food.category]}
                        <span>·</span>
                        {frequencies[food.purchaseFrequency]}
                      </p>
                      <small>
                        Unidade: <strong>{units[food.unit]}</strong> · Base:{" "}
                        {units[food.baseUnit]}
                      </small>
                    </div>
                    <div className="food-actions">
                      {archived ? (
                        <button
                          className="secondary-button"
                          disabled={!!pendingId}
                          onClick={() => archive(food, false)}
                          aria-label={`Restaurar ${food.name}`}
                        >
                          Restaurar
                        </button>
                      ) : (
                        <>
                          <button
                            className="icon-button"
                            aria-label={`Converter unidades de ${food.name}`}
                            title="Conferir unidades"
                            onClick={() => {
                              setConverting(food);
                              setEditor(null);
                            }}
                          >
                            <Calculator size={18} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Editar ${food.name}`}
                            title="Editar alimento"
                            onClick={() => {
                              setEditor(food);
                              setConverting(null);
                            }}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={!!pendingId}
                            aria-label={`Arquivar ${food.name}`}
                            title="Arquivar alimento"
                            onClick={() => setArchiving(food)}
                          >
                            <Archive size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {foods.data && foods.data.totalPages > 1 && (
                <div className="catalog-pagination">
                  <button
                    className="secondary-button"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </button>
                  <span>
                    Página {page + 1} de {foods.data.totalPages}
                  </span>
                  <button
                    className="secondary-button"
                    disabled={page + 1 >= foods.data.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </section>
            {editor && (
              <FoodForm
                key={
                  editor === "new" ? "new" : `${editor.id}:${editor.version}`
                }
                food={editor === "new" ? null : editor}
                cancel={() => setEditor(null)}
                failure={failure}
                reload={() => {
                  setEditor(null);
                  refresh();
                }}
                saved={async (food) => {
                  const creating = editor === "new";
                  setEditor(null);
                  setNotice(
                    `${food.name}: ${creating ? "cadastrado" : "atualizado"} com sucesso.`,
                  );
                  if (creating) {
                    setArchived(false);
                    setSearch("");
                    setQuery("");
                    setPage(0);
                  }
                  await refresh();
                }}
              />
            )}
            {converting && (
              <UnitConverter
                key={converting.id}
                food={converting}
                close={() => setConverting(null)}
                failure={failure}
              />
            )}
          </div>
          <p className="catalog-footnote">
            O catálogo registra alimentos, não o saldo que você tem em casa.
            Arquivar preserva o cadastro; não exclui histórico.
          </p>
        </main>
      </div>
      {archiving && (
        <ArchiveDialog
          food={archiving}
          pending={!!pendingId}
          cancel={() => setArchiving(null)}
          confirm={() => archive(archiving, true)}
        />
      )}
    </>
  );
}

function ArchiveDialog({
  food,
  pending,
  cancel,
  confirm,
}: {
  food: Food;
  pending: boolean;
  cancel: () => void;
  confirm: () => void;
}) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelButton.current?.focus();
  }, []);
  return (
    <div className="catalog-modal-backdrop">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="archive-title"
        aria-describedby="archive-description"
        className="catalog-modal"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) cancel();
          if (event.key === "Tab") {
            event.preventDefault();
            (document.activeElement === cancelButton.current
              ? confirmButton
              : cancelButton
            ).current?.focus();
          }
        }}
      >
        <Archive size={28} />
        <h2 id="archive-title">Arquivar {food.name}?</h2>
        <p id="archive-description">
          O alimento sairá do catálogo ativo, mas será preservado. Você poderá
          restaurá-lo na aba Arquivados.
        </p>
        <div className="form-actions">
          <button
            ref={cancelButton}
            className="secondary-button"
            onClick={cancel}
            disabled={pending}
          >
            Cancelar
          </button>
          <button
            ref={confirmButton}
            className="button"
            onClick={confirm}
            disabled={pending}
          >
            {pending ? "Arquivando…" : "Confirmar arquivamento"}
          </button>
        </div>
      </section>
    </div>
  );
}
