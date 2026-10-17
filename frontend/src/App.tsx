import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Leaf,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  Menu,
  Salad,
  ShoppingBasket,
  Sprout,
  Utensils,
  X,
} from "lucide-react";
import "./App.css";

type Meal = {
  id: number;
  name: string;
  time: string;
  description: string;
  items: string[];
};
type Schedule = { demo: boolean; notice: string; meals: Meal[] };
const navigation = [
  { to: "/", label: "Meu dia", icon: LayoutDashboard },
  { to: "/minha-dieta", label: "Minha dieta", icon: Utensils },
  { to: "/alimentos", label: "Alimentos", icon: Salad },
  { to: "/compras", label: "Lista de compras", icon: ShoppingBasket },
  { to: "/preparo", label: "Planejar preparo", icon: ListChecks },
];
async function loadSchedule(): Promise<Schedule> {
  const response = await fetch("/api/demo/schedule");
  if (!response.ok)
    throw new Error("Não foi possível carregar o plano de demonstração.");
  return response.json();
}
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const schedule = useQuery({
    queryKey: ["demo-schedule"],
    queryFn: loadSchedule,
    retry: 1,
  });
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const meals = schedule.data?.meals ?? [];
  const done = meals.filter((meal) =>
    completed.includes(`${dateKey}:${meal.id}`),
  ).length;
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const toggleMeal = (id: number) => {
    const key = `${dateKey}:${id}`;
    setCompleted((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };
  const mealCards = (
    <div className="meal-list">
      {meals.map((meal, index) => {
        const checked = completed.includes(`${dateKey}:${meal.id}`);
        const icons = [<Sprout />, <Salad />, <Leaf />, <Utensils />];
        return (
          <article
            className={`meal-card ${checked ? "is-done" : ""}`}
            key={meal.id}
          >
            <div className="meal-time">
              <Clock3 size={15} />
              {meal.time}
            </div>
            <div className={`meal-icon tone-${index}`}>
              {icons[index % icons.length]}
            </div>
            <div className="meal-content">
              <h3>{meal.name}</h3>
              <p>{meal.description}</p>
              <div className="ingredients">
                {meal.items.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
            <button
              className="complete-button"
              aria-label={`${checked ? "Desmarcar" : "Marcar"} ${meal.name}`}
              aria-pressed={checked}
              onClick={() => toggleMeal(meal.id)}
            >
              {checked ? <Check size={19} /> : <span />}
            </button>
          </article>
        );
      })}
    </div>
  );
  return (
    <div className="app-shell">
      <button
        className="mobile-menu"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? "Fechar navegação" : "Abrir navegação"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X /> : <Menu />}
        <span>Dieta Fácil</span>
      </button>
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">
            <Sprout size={26} />
          </span>
          <span>
            Dieta<span className="brand-light">Fácil</span>
            <small>PLANEJAR. PREPARAR. VIVER.</small>
          </span>
        </NavLink>
        <p className="nav-label">SEU PLANEJAMENTO</p>
        <nav aria-label="Navegação principal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={22} />
          <strong>Um passo de cada vez.</strong>
          <p>Uma rotina mais organizada começa com pequenas escolhas.</p>
        </div>
        <div className="profile">
          <span className="avatar">DF</span>
          <div>
            <strong>Explore o Dieta Fácil</strong>
            <small>Ambiente de demonstração</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>Seu planejamento alimentar, mais simples.</span>
          <NavLink to="/sobre">
            <CircleHelp size={18} />
            Sobre a demonstração
          </NavLink>
        </header>
        <main>
          <div className="demo-banner">
            <span className="demo-dot" />
            <strong>Modo demonstração</strong>
            <span>Plano fictício · Dados de exemplo</span>
          </div>
          {schedule.isPending && (
            <div className="status-box" role="status">
              <LoaderCircle className="spin" /> Carregando suas refeições…
            </div>
          )}
          {schedule.isError && (
            <div className="status-box error" role="alert">
              <strong>O plano não carregou.</strong>
              <p>Verifique se o back-end está em execução na porta 8080.</p>
              <button className="button" onClick={() => schedule.refetch()}>
                Tentar novamente
              </button>
            </div>
          )}
          {schedule.isSuccess && meals.length === 0 && (
            <div className="status-box">
              Ainda não há refeições na demonstração.
            </div>
          )}
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <PageHeading
                    eyebrow="MAIS ORGANIZAÇÃO, MAIS LEVEZA"
                    title="Seu dia, bem planejado."
                    text="Cuide da sua rotina. A gente ajuda com o planejamento."
                  />
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="hero-label">
                        <Leaf size={15} />
                        SIMPLES COMO DEVE SER
                      </span>
                      <h2>
                        Menos contas.
                        <br />
                        Mais tempo para você.
                      </h2>
                      <p>
                        Suas refeições, compras e preparo
                        <br /> em um só lugar.
                      </p>
                      <NavLink className="hero-link" to="/minha-dieta">
                        Conhecer meu plano <ArrowRight size={17} />
                      </NavLink>
                    </div>
                    <div className="plate-art" aria-hidden="true">
                      <div className="plate">
                        <div className="greens">
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>
                        <div className="rice">
                          ••••
                          <br />
                          •••••
                          <br />
                          ••••
                        </div>
                        <div className="carrots">
                          <i />
                          <i />
                          <i />
                        </div>
                        <div className="tomatoes">
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                      <span className="art-spark">✦</span>
                      <div className="art-caption">
                        <Check size={14} /> Rotina mais leve
                      </div>
                    </div>
                  </section>
                  <div className="stats">
                    <div>
                      <span className="stat-icon">
                        <Utensils />
                      </span>
                      <div>
                        <small>Refeições planejadas</small>
                        <strong>
                          {meals.length}
                          <em>no dia</em>
                        </strong>
                      </div>
                    </div>
                    <div>
                      <span className="stat-icon peach">
                        <Check />
                      </span>
                      <div>
                        <small>Refeições marcadas</small>
                        <strong>
                          {done}
                          <em>de {meals.length}</em>
                        </strong>
                      </div>
                    </div>
                    <div>
                      <span className="stat-icon yellow">
                        <ShoppingBasket />
                      </span>
                      <div>
                        <small>Próximo passo</small>
                        <NavLink to="/compras">
                          Organizar as compras <ArrowRight size={15} />
                        </NavLink>
                      </div>
                    </div>
                  </div>
                  <div className="content-columns">
                    <section>
                      <div className="section-heading">
                        <div>
                          <h2>Suas refeições</h2>
                          <p>{dateLabel}</p>
                        </div>
                        <div className="date-controls">
                          <button
                            aria-label="Dia anterior"
                            onClick={() => setDayOffset(dayOffset - 1)}
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button onClick={() => setDayOffset(0)}>Hoje</button>
                          <button
                            aria-label="Próximo dia"
                            onClick={() => setDayOffset(dayOffset + 1)}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                      {mealCards}
                      <p className="muted footnote">
                        As marcações são uma simulação e duram enquanto esta
                        página estiver aberta. O plano de exemplo se repete
                        todos os dias.
                      </p>
                    </section>
                    <aside className="right-column">
                      <div className="progress-card">
                        <span className="eyebrow">NO SEU RITMO</span>
                        <h3>Cada refeição conta</h3>
                        <div
                          className="progress-ring"
                          style={{
                            background: `conic-gradient(#28734e ${meals.length ? (done / meals.length) * 360 : 0}deg, #e6eee5 0deg)`,
                          }}
                        >
                          <div>
                            <strong>
                              {done}
                              <span>/{meals.length}</span>
                            </strong>
                            <small>marcadas</small>
                          </div>
                        </div>
                        <p>
                          Marque as refeições para
                          <br />
                          acompanhar seu dia.
                        </p>
                      </div>
                      <NavLink className="prep-card" to="/preparo">
                        <ListChecks />
                        <h3>
                          Prepare hoje.
                          <br />
                          Simplifique amanhã.
                        </h3>
                        <p>
                          Veja como vamos organizar o preparo da sua semana.
                        </p>
                        <span>
                          Planejar preparo <ArrowRight size={16} />
                        </span>
                      </NavLink>
                    </aside>
                  </div>
                </>
              }
            />
            <Route
              path="/minha-dieta"
              element={
                <>
                  <PageHeading
                    eyebrow="SEU PLANO"
                    title="Uma rotina com espaço para você."
                    text="Conheça as quatro refeições do nosso plano de exemplo."
                  />
                  {mealCards}
                  <p className="muted footnote">
                    Este plano fictício se repete na demonstração. Edição e
                    recorrência por dia serão implementadas na próxima etapa.
                  </p>
                </>
              }
            />
            <Route
              path="/alimentos"
              element={
                <>
                  <PageHeading
                    eyebrow="CATÁLOGO DE EXEMPLO"
                    title="O que faz parte do seu dia."
                    text="Itens utilizados no plano fictício, consultados no back-end."
                  />
                  <div className="food-grid">
                    {[...new Set(meals.flatMap((meal) => meal.items))].map(
                      (item) => (
                        <div className="food-card" key={item}>
                          <Salad size={23} />
                          <span>{item}</span>
                        </div>
                      ),
                    )}
                  </div>
                </>
              }
            />
            <Route
              path="/compras"
              element={
                <FeaturePreview
                  kind="Compras"
                  title="Sua lista começa no seu plano."
                  text="Na próxima etapa, você poderá escolher um período e gerar uma lista com as quantidades de cada alimento, agrupadas por categoria."
                  items={[
                    "Contagem das refeições no período escolhido",
                    "Conversão entre unidades compatíveis",
                    "Marcação de produtos comprados",
                  ]}
                />
              }
            />
            <Route
              path="/preparo"
              element={
                <FeaturePreview
                  kind="Preparo"
                  title="Uma semana mais organizada."
                  text="O resumo de preparo vai somar os alimentos para o período escolhido, indicando a referência crua, cozida ou como vendida."
                  items={[
                    "Totais para vários dias",
                    "Referência de peso explícita",
                    "Sem estimativas automáticas de rendimento",
                  ]}
                />
              }
            />
            <Route
              path="/sobre"
              element={
                <>
                  <PageHeading
                    eyebrow="PRIMEIRA ENTREGA"
                    title="Uma boa base para crescer."
                    text="Dieta Fácil é um projeto de portfólio em desenvolvimento."
                  />
                  <div className="info-panel">
                    <h2>O que você está experimentando</h2>
                    <p>
                      A interface consulta uma API Java com dados fictícios
                      armazenados no PostgreSQL. A navegação funciona em celular
                      e computador.
                    </p>
                    <h3>O que vem depois</h3>
                    <p>
                      Cadastro e login, catálogo pessoal, edição de refeições,
                      cálculo de compras e planejamento do preparo.
                    </p>
                    <h3>Sobre os dados</h3>
                    <p>
                      {schedule.data?.notice ??
                        "Todos os alimentos e refeições são exemplos de demonstração."}{" "}
                      Não cadastre dados pessoais nesta versão. Ela ainda não
                      possui autenticação.
                    </p>
                  </div>
                </>
              }
            />
            <Route
              path="*"
              element={
                <>
                  <PageHeading
                    eyebrow="PÁGINA NÃO ENCONTRADA"
                    title="Vamos voltar ao seu dia?"
                    text="Este endereço não faz parte da demonstração."
                  />
                  <NavLink className="button" to="/">
                    Voltar ao início
                  </NavLink>
                </>
              }
            />
          </Routes>
          <footer>
            <span>
              <Sprout size={15} />
              Dieta Fácil
            </span>
            <span>Feito para simplificar sua rotina.</span>
            <small>Dados fictícios · Projeto em desenvolvimento</small>
          </footer>
        </main>
      </div>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <div className="today-pill">
        <CalendarDays size={17} />
        Seu planejamento
      </div>
    </div>
  );
}
function FeaturePreview({
  kind,
  title,
  text,
  items,
}: {
  kind: string;
  title: string;
  text: string;
  items: string[];
}) {
  return (
    <>
      <PageHeading
        eyebrow={`${kind.toUpperCase()} · EM DESENVOLVIMENTO`}
        title={title}
        text={text}
      />
      <div className="info-panel feature-preview">
        <span className="feature-icon">
          <ShoppingBasket size={35} />
        </span>
        <h2>Já temos o primeiro ingrediente: seu plano.</h2>
        <p>Os cálculos serão implementados e testados em uma etapa própria.</p>
        <ul>
          {items.map((item) => (
            <li key={item}>
              <Check size={17} />
              {item}
            </li>
          ))}
        </ul>
        <NavLink className="button" to="/minha-dieta">
          Ver plano de exemplo <ArrowRight size={16} />
        </NavLink>
      </div>
    </>
  );
}
