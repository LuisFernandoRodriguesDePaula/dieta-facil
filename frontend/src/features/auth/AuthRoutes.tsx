import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ArrowLeft, ArrowRight, LogOut, Sprout } from "lucide-react";
import { ApiError, api } from "../../lib/api";
import App from "../../App";
import "./auth.css";

export type Profile = {
  id: string;
  name: string;
  email: string;
  timezone: string;
};
const sessionKey = ["session"];
const timezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
const emailField = z
  .string()
  .trim()
  .email("Informe um e-mail válido.")
  .max(254);
const passwordField = z
  .string()
  .min(10, "Use pelo menos 10 caracteres.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "A senha deve ter até 72 bytes. Caracteres acentuados podem ocupar mais de um byte.",
  );
const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Informe sua senha."),
});
const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe seu nome.")
      .max(100, "Use até 100 caracteres."),
    email: emailField,
    password: passwordField,
    confirmation: z.string(),
    timezone: z.string().min(1, "Informe seu fuso horário.").max(100),
  })
  .refine((input) => input.password === input.confirmation, {
    message: "As senhas devem ser iguais.",
    path: ["confirmation"],
  });
const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome.").max(100),
  timezone: z.string().min(1, "Informe seu fuso horário.").max(100),
});

function useSession() {
  return useQuery<Profile | null>({
    queryKey: sessionKey,
    queryFn: async () => {
      try {
        return await api<Profile>("/api/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 0,
  });
}

export default function AuthRoutes() {
  return (
    <Routes>
      <Route path="/entrar" element={<AccessPage registerMode={false} />} />
      <Route path="/cadastro" element={<AccessPage registerMode />} />
      <Route path="/conta" element={<AccountPage />} />
      <Route path="*" element={<App />} />
    </Routes>
  );
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="access-layout">
      <aside className="access-intro">
        <Link to="/" className="access-brand">
          <Sprout /> Dieta Fácil
        </Link>
        <div>
          <p className="eyebrow">SUA ROTINA, MAIS LEVE</p>
          <h1>
            Um espaço para
            <br />
            cuidar do seu dia.
          </h1>
          <p>
            Comece pela sua conta. Aos poucos, vamos conectar sua dieta, seu
            estoque e suas compras.
          </p>
        </div>
        <small>
          Projeto em desenvolvimento · A demonstração usa dados fictícios.
        </small>
      </aside>
      <main className="access-main">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} />
          Explorar demonstração
        </Link>
        {children}
      </main>
    </div>
  );
}

function AccessPage({ registerMode }: { registerMode: boolean }) {
  const session = useSession();
  if (session.isPending)
    return (
      <AuthFrame>
        <p role="status">Verificando sua sessão…</p>
      </AuthFrame>
    );
  if (session.isError)
    return (
      <AuthFrame>
        <ServiceError retry={() => session.refetch()} />
      </AuthFrame>
    );
  if (session.data) return <Navigate to="/conta" replace />;
  return (
    <AuthFrame>{registerMode ? <RegisterForm /> : <LoginForm />}</AuthFrame>
  );
}

function LoginForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: location.state?.email ?? "", password: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    setError("");
    try {
      const user = await api<Profile>("/api/auth/login", "POST", values);
      client.clear();
      client.setQueryData(sessionKey, user);
      navigate("/conta", { replace: true });
    } catch (failure) {
      setError(message(failure));
    }
  });
  return (
    <section className="access-card">
      <p className="eyebrow">BEM-VINDO DE VOLTA</p>
      <h2>Entre na sua conta.</h2>
      <p>Acesse seu espaço pessoal no Dieta Fácil.</p>
      {location.state?.registered && (
        <p className="form-success" role="status">
          Conta criada! Entre com seu e-mail e senha.
        </p>
      )}
      {location.state?.expired && (
        <p className="form-notice" role="status">
          Sua sessão terminou. Entre novamente para continuar.
        </p>
      )}
      {location.state?.requiresLogin && (
        <p className="form-notice" role="status">
          Entre para acessar sua conta.
        </p>
      )}
      <form onSubmit={submit} noValidate>
        <label htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
          aria-describedby="login-email-error"
        />
        <FieldError
          id="login-email-error"
          text={form.formState.errors.email?.message}
        />
        <label htmlFor="login-password">Senha</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
          aria-invalid={!!form.formState.errors.password}
          aria-describedby="login-password-error"
        />
        <FieldError
          id="login-password-error"
          text={form.formState.errors.password?.message}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button access-submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Entrando…" : "Entrar"}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="access-switch">
        Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
      </p>
      <p className="access-note">
        A recuperação de senha ainda não está disponível nesta versão local.
      </p>
    </section>
  );
}

function RegisterForm() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmation: "",
      timezone: timezone(),
    },
  });
  const submit = form.handleSubmit(
    async ({ confirmation: _confirmation, ...values }) => {
      setError("");
      try {
        await api<Profile>("/api/auth/register", "POST", values);
        form.reset();
        navigate("/entrar", {
          replace: true,
          state: { registered: true, email: values.email },
        });
      } catch (failure) {
        setError(message(failure));
      }
    },
  );
  return (
    <section className="access-card">
      <p className="eyebrow">SEU PRIMEIRO PASSO</p>
      <h2>Crie seu espaço.</h2>
      <p>Uma conta para organizar sua rotina.</p>
      <form onSubmit={submit} noValidate>
        <label htmlFor="register-name">Nome</label>
        <input
          id="register-name"
          autoComplete="name"
          {...form.register("name")}
          aria-invalid={!!form.formState.errors.name}
          aria-describedby="register-name-error"
        />
        <FieldError
          id="register-name-error"
          text={form.formState.errors.name?.message}
        />
        <label htmlFor="register-email">E-mail</label>
        <input
          id="register-email"
          type="email"
          autoComplete="username"
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
          aria-describedby="register-email-error"
        />
        <FieldError
          id="register-email-error"
          text={form.formState.errors.email?.message}
        />
        <label htmlFor="register-password">Senha</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
          aria-invalid={!!form.formState.errors.password}
          aria-describedby="register-password-error password-help"
        />
        <small id="password-help">
          Use pelo menos 10 caracteres, até 72 bytes.
        </small>
        <FieldError
          id="register-password-error"
          text={form.formState.errors.password?.message}
        />
        <label htmlFor="register-confirmation">Confirmar senha</label>
        <input
          id="register-confirmation"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmation")}
          aria-invalid={!!form.formState.errors.confirmation}
          aria-describedby="register-confirmation-error"
        />
        <FieldError
          id="register-confirmation-error"
          text={form.formState.errors.confirmation?.message}
        />
        <label htmlFor="register-timezone">Fuso horário</label>
        <input
          id="register-timezone"
          list="timezones"
          {...form.register("timezone")}
          aria-invalid={!!form.formState.errors.timezone}
          aria-describedby="register-timezone-error"
        />
        <Timezones />
        <FieldError
          id="register-timezone-error"
          text={form.formState.errors.timezone?.message}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button access-submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Criando conta…" : "Criar conta"}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="access-switch">
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
      <p className="access-note">
        Versão local em desenvolvimento. Use dados de teste; dieta e estoque
        pessoais serão adicionados nas próximas entregas.
      </p>
    </section>
  );
}

function AccountPage() {
  const session = useSession();
  if (session.isPending)
    return (
      <AuthFrame>
        <p role="status">Carregando sua conta…</p>
      </AuthFrame>
    );
  if (session.isError)
    return (
      <AuthFrame>
        <ServiceError retry={() => session.refetch()} />
      </AuthFrame>
    );
  if (!session.data)
    return <Navigate to="/entrar" replace state={{ requiresLogin: true }} />;
  return (
    <AuthFrame>
      <AccountForm key={session.data.id} user={session.data} />
    </AuthFrame>
  );
}

function AccountForm({ user }: { user: Profile }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, timezone: user.timezone },
  });
  const fail = (failure: unknown) => {
    if (failure instanceof ApiError && failure.status === 401) {
      client.clear();
      client.setQueryData(sessionKey, null);
      navigate("/entrar", { replace: true, state: { expired: true } });
    } else setError(message(failure));
  };
  const save = form.handleSubmit(async (values) => {
    setError("");
    setSuccess("");
    try {
      const updated = await api<Profile>("/api/me", "PATCH", values);
      client.setQueryData(sessionKey, updated);
      form.reset({ name: updated.name, timezone: updated.timezone });
      setSuccess("Perfil atualizado.");
    } catch (failure) {
      fail(failure);
    }
  });
  const logout = async () => {
    setLoggingOut(true);
    setError("");
    setSuccess("");
    try {
      await api<void>("/api/auth/logout", "POST");
      client.clear();
      client.setQueryData(sessionKey, null);
      navigate("/entrar", { replace: true });
    } catch (failure) {
      fail(failure);
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <section className="access-card">
      <p className="eyebrow">SUA CONTA</p>
      <h2>Olá, {user.name.split(" ")[0]}.</h2>
      <p>Seu acesso pessoal está pronto.</p>
      <div className="account-email">
        <strong>E-mail da conta</strong>
        <span>{user.email}</span>
      </div>
      <form onSubmit={save} noValidate>
        <label htmlFor="profile-name">Nome</label>
        <input
          id="profile-name"
          autoComplete="name"
          {...form.register("name")}
          aria-invalid={!!form.formState.errors.name}
          aria-describedby="profile-name-error"
        />
        <FieldError
          id="profile-name-error"
          text={form.formState.errors.name?.message}
        />
        <label htmlFor="profile-timezone">Fuso horário</label>
        <input
          id="profile-timezone"
          list="timezones"
          {...form.register("timezone")}
          aria-invalid={!!form.formState.errors.timezone}
          aria-describedby="profile-timezone-error"
        />
        <Timezones />
        <FieldError
          id="profile-timezone-error"
          text={form.formState.errors.timezone?.message}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="form-success" role="status">
            {success}
          </p>
        )}
        <button
          className="button access-submit"
          disabled={form.formState.isSubmitting || loggingOut}
        >
          {form.formState.isSubmitting ? "Salvando…" : "Salvar perfil"}
          <CheckIcon />
        </button>
      </form>
      <button
        className="logout-button"
        onClick={logout}
        disabled={loggingOut || form.formState.isSubmitting}
      >
        <LogOut size={17} />
        {loggingOut ? "Saindo…" : "Sair da conta"}
      </button>
      <div className="account-next">
        <strong>O próximo passo é sua dieta.</strong>
        <p>
          O cadastro de alimentos e refeições pessoais será adicionado nas
          próximas entregas. A demonstração permanece separada da sua conta.
        </p>
        <Link to="/">
          Explorar demonstração <ArrowRight size={15} />
        </Link>
      </div>
      <p className="access-note">
        A sessão termina após 30 minutos sem atividade ou quando o servidor
        reinicia.
      </p>
    </section>
  );
}

function CheckIcon() {
  return <ArrowRight size={17} />;
}
function Timezones() {
  return (
    <datalist id="timezones">
      {[
        "America/Sao_Paulo",
        "America/Manaus",
        "America/Belem",
        "America/Fortaleza",
        "America/Recife",
        "America/Rio_Branco",
        "Europe/Lisbon",
        "UTC",
      ].map((value) => (
        <option key={value} value={value} />
      ))}
    </datalist>
  );
}
function FieldError({ id, text }: { id: string; text?: string }) {
  return (
    <span id={id} className="field-error">
      {text}
    </span>
  );
}
function ServiceError({ retry }: { retry: () => void }) {
  return (
    <section className="access-card">
      <h2>Não foi possível verificar sua conta.</h2>
      <p role="alert">
        Confira se o serviço está disponível e tente novamente.
      </p>
      <button className="button" onClick={retry}>
        Tentar novamente
      </button>
    </section>
  );
}
function message(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Não foi possível conectar ao serviço. Tente novamente.";
}
