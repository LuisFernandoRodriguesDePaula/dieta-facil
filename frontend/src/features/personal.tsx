import { Link } from "react-router-dom";
import { useSession } from "./auth/session";
import { useFeatures } from "./care/features";
export function PersonalNav() {
  const session = useSession();
  const features = useFeatures();
  const client = session.data?.role === "CLIENT";
  const links = client
    ? [
        ["/conta/dieta", "Minha dieta"],
        ["/conta/resultados", "Resultados"],
        ["/conta/acompanhamento/inicio", "Acompanhamento"],
        ["/conta/nutricionista", "Meu nutricionista"],
        ["/conta", "Conta"],
      ]
    : [
        ["/profissional", "Clientes"],
        ["/profissional/painel/inicio", "Consultório"],
        ["/conta/inicio", "Início"],
        ["/conta", "Conta"],
        ["/conta/alimentos", "Alimentos"],
        ["/conta/dieta", "Dieta"],
        ["/conta/agenda", "Agenda"],
      ];
  if (!client && features.data && !features.data.inventoryEnabled) {
    links.splice(
      0,
      links.length,
      ["/profissional", "Clientes"],
      ["/profissional/painel/inicio", "Consultório"],
      ["/conta", "Conta"],
      ["/conta/premium", "Recursos Premium"],
    );
  }
  if (features.data?.inventoryEnabled)
    links.push(
      ["/conta/estoque", "Estoque"],
      ["/conta/compras", "Compras"],
      ["/conta/preparo", "Preparo"],
    );
  return (
    <>
      <Link className="access-brand" to="/">
        Dieta Fácil
      </Link>
      <nav aria-label="Área pessoal">
        {links.map(([path, label]) => (
          <Link key={path} to={path}>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
