import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Login = lazy(() => import("../pages/Login"));
const Painel = lazy(() => import("../pages/Painel"));
const Estoque = lazy(() => import("../pages/Estoque"));
const Oficina = lazy(() => import("../pages/Oficina"));
const Manutencao = lazy(() => import("../pages/Manutencao"));
const EquipesCadastradas = lazy(() => import("../pages/EquipesCadastradas"));
const ModelosChecklists = lazy(() => import("../pages/ModelosChecklists"));
const Relatorios = lazy(() => import("../pages/Relatorios"));
const RelatoriosGerencial = lazy(() => import("../pages/RelatoriosGerencial"));
const Layout = lazy(() => import("../components/Layout"));

function RouteFallback() {
  return <div className="operacoes-feedback">Carregando...</div>;
}

function PrivateRoute({ children }) {
  const { usuario } = useContext(AuthContext);

  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Painel + Layout */}
        <Route
          path="/painel"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Painel />} />

          {/* Estoque */}
          <Route path="estoque" element={<Estoque />} />
          <Route path="canteiro" element={<Oficina />} />
          <Route path="oficina" element={<Oficina />} />
          <Route path="manutencao" element={<Manutencao />} />
          <Route path="equipes-cadastradas" element={<EquipesCadastradas />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="relatorios-gerencial" element={<RelatoriosGerencial />} />
          <Route path="modelos-checklists" element={<ModelosChecklists />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
