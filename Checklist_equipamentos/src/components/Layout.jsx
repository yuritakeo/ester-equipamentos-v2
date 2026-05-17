import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import "../components/layout.css";
import bg from "../assets/Capa_global.png";
import logo from "../assets/logo-empresas.png";
import { AuthContext } from "../context/AuthContext";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario, logout } = useContext(AuthContext);

  const estoqueVisao = new URLSearchParams(location.search).get("visao") === "locados" ? "locados" : "macro";
  const estoqueMenuAtivo = location.pathname.includes("/painel/estoque");

  // ✅ NORMALIZADOR LOCAL (substitui utils)
  const normalizeRole = (tipoUsuario) => {
    if (!tipoUsuario) return "";

    const tipo = tipoUsuario.toUpperCase();

    if (tipo.includes("ADMIN")) return "ADMIN";
    if (tipo.includes("GERENCIA")) return "GERENCIA";
    return "OPERACIONAL";
  };

  // ✅ usa tipoUsuario correto do backend
  const role = normalizeRole(usuario?.tipoUsuario);

  // ✅ regra de permissão
  const isAdminOrDev = role === "ADMIN" || role === "GERENCIA";

  useEffect(() => {
    const runPrefetch = () => {
      if (isAdminOrDev) {
        import("../pages/Estoque");
        import("../pages/Oficina");
        import("../pages/Manutencao");
        import("../pages/EquipesCadastradas");
        import("../pages/Relatorios");
        import("../pages/RelatoriosGerencial");
        import("../pages/ModelosChecklists");
        return;
      }

      import("../pages/Painel");
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(runPrefetch, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(runPrefetch, 400);
    return () => window.clearTimeout(timer);
  }, [isAdminOrDev]);

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div
      className="layout-container"
      style={{
        backgroundImage: `url(${bg})`,
      }}
    >
      <div className="overlay" />

      <aside className="sidebar">
        <div className="logo-container">
          <img src={logo} alt="Logo" className="logo-img grande" />
        </div>

        <nav>
          <Link
            to="/painel"
            className={location.pathname === "/painel" ? "active" : ""}
          >
            Gestão de Equipamentos
          </Link>

          {isAdminOrDev && (
            <>
              <Link
                to="/painel/equipes-cadastradas"
                className={location.pathname.includes("equipes-cadastradas") ? "active" : ""}
              >
                Equipes Cadastradas
              </Link>

              <div className={`sidebar-menu-group ${estoqueMenuAtivo ? "is-active" : ""}`}>
                <Link
                  to="/painel/estoque?visao=macro"
                  className={estoqueMenuAtivo ? "active" : ""}
                >
                  Estoque Geral
                </Link>

                <div className="sidebar-submenu">
                  <Link
                    to="/painel/estoque?visao=macro"
                    className={estoqueVisao === "macro" ? "active" : ""}
                  >
                    Estoque Macro
                  </Link>
                  <Link
                    to="/painel/estoque?visao=locados"
                    className={estoqueVisao === "locados" ? "active" : ""}
                  >
                    Estoque Locados
                  </Link>
                </div>
              </div>

              <Link
                to="/painel/canteiro"
                className={location.pathname.includes("canteiro") || location.pathname.includes("oficina") ? "active" : ""}
              >
                Direcionamento de Equipamentos
              </Link>

              <Link
                to="/painel/manutencao"
                className={location.pathname.includes("manutencao") ? "active" : ""}
              >
                Manutenção
              </Link>

              <Link
                to="/painel/relatorios"
                className={location.pathname.includes("relatorios") && !location.pathname.includes("relatorios-gerencial") ? "active" : ""}
              >
                Relatorios Checklists
              </Link>

              <Link
                to="/painel/relatorios-gerencial"
                className={location.pathname.includes("relatorios-gerencial") ? "active" : ""}
              >
                Análise Gerencial
              </Link>

              <Link
                to="/painel/modelos-checklists"
                className={location.pathname.includes("modelos-checklists") ? "active" : ""}
              >
                Modelos de Checklists
              </Link>
            </>
          )}

          <button className="logout-btn" onClick={handleLogout}>
            Sair
          </button>
        </nav>
      </aside>

      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}