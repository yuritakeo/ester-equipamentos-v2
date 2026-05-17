import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { AuthContext } from "../context/AuthContext";
import bg from "../assets/Capa_global.png";

const fieldStyle = {
  width: "100%",
  height: "40px",
  padding: "0 14px",
  borderRadius: "9px",
  border: "1px solid rgba(109, 126, 166, 0.45)",
  background: "#22365f",
  color: "#f5f7ff",
  fontSize: "15px",
  outline: "none",
};

function traduzErro(msg) {
  const map = {
    USUARIO_NAO_ENCONTRADO: "Usuário não cadastrado",
    SENHA_INVALIDA: "Senha inválida",
    USUARIO_INATIVO: "Usuário inativo",
    EQUIPE_INVALIDA: "Equipe inválida",
  };

  return map[msg] || msg;
}

export default function Login() {
  const navigate = useNavigate();
  const { setUsuario } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  function normalizeUsername(value) {
    return value.toUpperCase();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/api/login", {
        username: normalizeUsername(username.trim()),
        senha,
      });

      // ✅ backend agora retorna { mensagem, data }
      setUsuario(response.data);

      navigate("/painel", { replace: true });
    } catch (error) {
      console.log("ERRO COMPLETO:", error); // ✅ debug

      const msg =
        error.response?.data?.mensagem ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.erro ||
        error.message ||
        "Erro no login";

      alert(traduzErro(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        backgroundImage: `linear-gradient(rgba(7, 16, 36, 0.62), rgba(7, 16, 36, 0.78)), url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "340px",
          padding: "20px 20px 22px",
          borderRadius: "18px",
          backdropFilter: "blur(8px)",
          background:
            "linear-gradient(180deg, rgba(6, 30, 86, 0.8), rgba(10, 28, 68, 0.6))",
          border: "1px solid rgba(29, 84, 211, 0.28)",
          boxShadow: "0 20px 44px rgba(95, 99, 126, 0.34)",
        }}
      >
        <h1
          style={{
            margin: "0 0 22px",
            color: "#f3f6ff",
            fontSize: "34px",
            lineHeight: "1.05",
            fontWeight: "800",
            textAlign: "center",
            letterSpacing: "-0.03em",
          }}
        >
          Controle de Fluxo
          <br />
          Equipamentos Pequenos
        </h1>

        <div style={{ display: "grid", gap: "14px" }}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(normalizeUsername(e.target.value))}
            style={{ ...fieldStyle, textTransform: "uppercase" }}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={fieldStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "2px",
              height: "40px",
              borderRadius: "9px",
              border: "1px solid rgba(94, 161, 255, 0.75)",
              background: "linear-gradient(180deg, #2f62f3, #2a4fc7)",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.75 : 1,
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.14)",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}