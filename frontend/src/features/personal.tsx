import { Link } from "react-router-dom";
export function PersonalNav() {
  return (
    <>
      <Link className="access-brand" to="/">
        Dieta Fácil
      </Link>
      <nav aria-label="Área pessoal">
        {[
          ["/conta/inicio", "Início"],
          ["/conta", "Conta"],
          ["/conta/alimentos", "Alimentos"],
          ["/conta/dieta", "Dieta"],
          ["/conta/agenda", "Agenda"],
          ["/conta/estoque", "Estoque"],
          ["/conta/compras", "Compras"],
          ["/conta/preparo", "Preparo"],
        ].map(([path, label]) => (
          <Link key={path} to={path}>
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
