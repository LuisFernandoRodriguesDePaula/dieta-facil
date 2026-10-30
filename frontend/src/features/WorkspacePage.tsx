import { Link, useParams } from "react-router-dom";
import { CareLayout } from "./care/CareAccess";
import "./workspace.css";
const modules = [
  [
    "inicio",
    "Visão geral",
    "Organize o acompanhamento e as próximas ações.",
    ["Pendências", "Próximos retornos", "Últimos acompanhamentos"],
  ],
  [
    "atendimento",
    "Atendimento e IA",
    "Dúvidas contextualizadas pela dieta, com supervisão profissional.",
    [
      "Caixa de entrada",
      "Revisão de respostas IA",
      "Orientações publicadas",
      "Configuração e limites",
    ],
  ],
  [
    "nutrientes",
    "Nutrientes",
    "Composição nutricional com fonte e porção de referência.",
    [
      "Catálogo e referências",
      "Medidas e conversões",
      "Totais por refeição e dia",
    ],
  ],
  [
    "check-ins",
    "Check-ins",
    "Acompanhamento periódico separado do registro de refeições.",
    ["Modelos de formulário", "Programação", "Respostas recebidas"],
  ],
  [
    "metas",
    "Metas e atividades",
    "Objetivos definidos pelo profissional para cada acompanhamento.",
    ["Metas em andamento", "Atividades", "Histórico"],
  ],
  [
    "jornadas",
    "Jornadas",
    "Etapas, responsáveis e próximas ações do acompanhamento.",
    ["Modelos de jornada", "Etapas e tarefas", "Acompanhamentos"],
  ],
  [
    "crm",
    "CRM",
    "Organização dos contatos e estágios de acompanhamento.",
    ["Etapas", "Segmentos", "Próximos contatos"],
  ],
  [
    "relatorios",
    "Relatórios",
    "Evolução do paciente e visão da operação com dados rastreáveis.",
    ["Evolução individual", "Acompanhamento", "Indicadores do consultório"],
  ],
  [
    "importacao",
    "Importações",
    "Arquivo, prévia e revisão antes de aplicar informações.",
    ["Dieta", "Clientes", "Avaliações e bioimpedância"],
  ],
  [
    "agenda",
    "Agenda",
    "Consultas, retornos e disponibilidade do profissional.",
    ["Calendário", "Disponibilidade", "Google Agenda"],
  ],
  [
    "financeiro",
    "Financeiro",
    "Controle dos contratos de acompanhamento e valores a receber.",
    ["Receitas e recebimentos", "Vencimentos", "Conciliação"],
  ],
  [
    "planos",
    "Planos de acompanhamento",
    "Contratos do paciente separados da dieta e da assinatura do sistema.",
    ["Contratos", "Renovações", "Histórico"],
  ],
  [
    "comunicacao",
    "Comunicação",
    "Preferências e envios por canais autorizados.",
    ["Caixa interna", "E-mail e WhatsApp", "Entregas e lembretes"],
  ],
  [
    "equipe",
    "Equipe e clínica",
    "Papéis e responsabilidades com acesso restrito.",
    ["Organização", "Colaboradores", "Permissões"],
  ],
  [
    "materiais",
    "Materiais",
    "Orientações e conteúdos publicados pelo profissional.",
    ["Biblioteca", "Conteúdos compartilhados", "Modelos"],
  ],
  [
    "comunidade",
    "Comunidade e desafios",
    "Hipótese futura, opcional e sujeita à validação.",
    ["Atividades coletivas", "Privacidade", "Participação"],
  ],
  [
    "configuracoes",
    "Configurações",
    "Preferências, integrações, identidade visual e operação.",
    [
      "Perfil e marca",
      "Integrações",
      "Notificações",
      "Auditoria e privacidade",
    ],
  ],
] as const;
const patientModules = [
  [
    "inicio",
    "Acompanhamento",
    "Seu espaço de acompanhamento.",
    ["Próximas etapas", "Orientações"],
  ],
  [
    "atendimento",
    "Atendimento",
    "Consulte orientações e acompanhe suas dúvidas.",
    ["Minhas dúvidas", "Respostas do nutricionista"],
  ],
  [
    "check-ins",
    "Check-ins",
    "Questionários periódicos definidos pelo nutricionista.",
    ["Para responder", "Histórico"],
  ],
  [
    "metas",
    "Metas e atividades",
    "Objetivos publicados pelo profissional.",
    ["Metas", "Atividades"],
  ],
  [
    "agenda",
    "Consultas",
    "Organize seus próximos atendimentos.",
    ["Próximas consultas", "Histórico"],
  ],
  [
    "materiais",
    "Materiais",
    "Conteúdos compartilhados pelo nutricionista.",
    ["Orientações", "Documentos"],
  ],
] as const;
export default function WorkspacePage({
  patient = false,
}: {
  patient?: boolean;
}) {
  const { module = "inicio" } = useParams();
  const items = patient ? patientModules : modules;
  const selected = items.find((m) => m[0] === module);
  const prefix = patient ? "/conta/acompanhamento/" : "/profissional/painel/";
  return (
    <CareLayout professional={!patient}>
      <div className="workspace-shell">
        <nav
          className="workspace-nav"
          aria-label={
            patient ? "Módulos do acompanhamento" : "Módulos do consultório"
          }
        >
          {items.map(([id, title]) => (
            <Link
              key={id}
              to={prefix + id}
              aria-current={module === id ? "page" : undefined}
            >
              {title}
            </Link>
          ))}
          <Link to={patient ? "/conta/dieta" : "/profissional"}>
            {patient ? "Abrir minha dieta" : "Abrir clientes e dietas"}
          </Link>
        </nav>
        <section className="workspace-content">
          {!selected ? (
            <>
              <h1>Área não encontrada</h1>
              <Link to={prefix + "inicio"}>Voltar à visão geral</Link>
            </>
          ) : (
            <>
              <header>
                <span className="workspace-status">Estrutura inicial</span>
                <h1>{selected[1]}</h1>
                <p>{selected[2]}</p>
              </header>
              <p className="workspace-note">
                Esta área está em preparação. Ainda não há cadastro, envio ou
                processamento neste painel.
              </p>
              {selected[0] === "inicio" && (
                <div className="workspace-shortcuts">
                  <Link to={patient ? "/conta/dieta" : "/profissional"}>
                    {patient
                      ? "Consultar dieta"
                      : "Gerenciar clientes e dietas"}
                  </Link>
                  <Link
                    to={patient ? "/conta/resultados" : prefix + "atendimento"}
                  >
                    {patient
                      ? "Consultar resultados"
                      : "Conhecer a central de atendimento"}
                  </Link>
                </div>
              )}
              <div className="workspace-grid">
                {selected[3].map((title) => (
                  <article key={title}>
                    <h2>{title}</h2>
                    <p>
                      O conteúdo será disponibilizado após a implementação desta
                      etapa.
                    </p>
                    <span className="workspace-status">Em planejamento</span>
                  </article>
                ))}
              </div>
              {selected[0] === "atendimento" && (
                <aside className="workspace-note">
                  O atendimento por IA começará com respostas revisadas pelo
                  nutricionista. Não há IA ativa nem envio de mensagens nesta
                  versão.
                </aside>
              )}
            </>
          )}
        </section>
      </div>
    </CareLayout>
  );
}
