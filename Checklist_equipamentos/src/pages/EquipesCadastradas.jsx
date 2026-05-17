import { useContext, useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import CascadeMultiSelectFilters from "../components/CascadeMultiSelectFilters";
import OutletLoading from "../components/OutletLoading";
import { AuthContext } from "../context/AuthContext";
import { api } from "../services/api";
import { filterRowsByCascade } from "../utils/cascadeFilters";
import { sortByTextKeys } from "../utils/sort";
import { isAdminLikeRole, isDeveloperEquivalentRole, isGerenciaRole, normalizeUserRole } from "../utils/userRoles";
import "../Styles/operacoes.css";

function ordenarUsuarios(lista) {
  return sortByTextKeys(lista, (item) => item?.username, (item) => item?.equipe, (item) => item?.tipoCategoria);
}

function normalizarTipo(valor) {
  return normalizeUserRole(valor);
}

function exibirTipoUsuario(valor) {
  return normalizarTipo(valor) === "DEVELOPER" ? "GERENCIA" : (valor || "");
}

const FORM_VAZIO = {
  id: null,
  username: "",
  senha: "",
  equipe: "",
  equipeId: "",
  tipoCategoriaId: "",
  novoTipo: "",
};

const USERNAME_LENGTH = 7;
const NOVO_TIPO_VALUE = "__NOVO_TIPO__";
const PREFIXOS_TIPO_EQUIPE = ["Canteiro", "Equipe"];

function tipoEquipeValidoParaCriacao(nome) {
  const valor = String(nome || "").trim().toUpperCase();
  return valor.startsWith("CANTEIRO") || valor.startsWith("EQUIPE");
}

export default function EquipesCadastradas() {
  const { usuario } = useContext(AuthContext);
  const [usuarios, setUsuarios] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [filtrosCascata, setFiltrosCascata] = useState({
    username: [],
    equipe: [],
    tipo: [],
    status: [],
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalErro, setModalErro] = useState("");
  const [form, setForm] = useState(FORM_VAZIO);

  const tipoUsuarioLogado = normalizarTipo(usuario?.tipoCategoria);
  const isDeveloper = isDeveloperEquivalentRole(tipoUsuarioLogado);
  const isGerente = tipoUsuarioLogado === "GERENTE";
  const podeDefinirGerencial = isDeveloper || isGerente;
  const podeCriarTipoEquipe = isAdminLikeRole(tipoUsuarioLogado);

  useEffect(() => {
    async function carregarDados() {
      try {
        const [usuariosResponse, equipesResponse, tiposResponse] = await Promise.all([
          api.get("/api/usuarios"),
          api.get("/api/equipes"),
          api.get("/api/tipo-categoria"),
        ]);

        setUsuarios(ordenarUsuarios(Array.isArray(usuariosResponse) ? usuariosResponse : []));
        setEquipes(Array.isArray(equipesResponse) ? equipesResponse : []);
        setTipos(Array.isArray(tiposResponse) ? tiposResponse : []);
      } catch (error) {
        setErro(error.message || "Nao foi possivel carregar os usuarios.");
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, []);

  const gerencialTipo = useMemo(
    () => tipos.find((tipo) => {
      return isGerenciaRole(tipo?.nome);
    }) || null,
    [tipos],
  );

  const tiposDisponiveis = useMemo(() => {
    return sortByTextKeys(tipos.filter((tipo) => {
      const nomeTipo = normalizarTipo(tipo?.nome);
      if (nomeTipo === "DEVELOPER") {
        return false;
      }
      if (isGerenciaRole(nomeTipo) && !podeDefinirGerencial) {
        return false;
      }
      return true;
    }), (tipo) => tipo?.nome);
  }, [tipos, isDeveloper, podeDefinirGerencial]);

  const tipoSelecionadoEhDeveloper = useMemo(() => {
    const selecionado = tipos.find((tipo) => String(tipo?.id) === String(form.tipoCategoriaId));
    return normalizarTipo(selecionado?.nome) === "DEVELOPER";
  }, [tipos, form.tipoCategoriaId]);

  const tipoSelecionadoEhGerencial = useMemo(() => {
    const selecionado = tipos.find((tipo) => String(tipo?.id) === String(form.tipoCategoriaId));
    return isGerenciaRole(selecionado?.nome);
  }, [tipos, form.tipoCategoriaId]);

  const definicoesFiltro = useMemo(() => ([
    {
      id: "username",
      label: "Username",
      getValue: (item) => item?.username,
    },
    {
      id: "equipe",
      label: "Equipe",
      getValue: (item) => item?.equipe,
    },
    {
      id: "tipo",
      label: "Tipo de Usuario",
      getValue: (item) => item?.tipoCategoria,
    },
    {
      id: "status",
      label: "Status",
      getValue: (item) => (item?.ativo !== false ? "Ativo" : "Inativo"),
    },
  ]), []);

  const usuariosFiltrados = useMemo(() => {
    return filterRowsByCascade(usuarios, definicoesFiltro, filtrosCascata);
  }, [usuarios, definicoesFiltro, filtrosCascata]);

  const resumo = useMemo(() => {
    const ativos = usuarios.filter((item) => item?.ativo !== false).length;
    const inativos = usuarios.length - ativos;

    return {
      total: usuarios.length,
      ativos,
      inativos,
    };
  }, [usuarios]);

  function abrirModalCadastro(registro = null) {
    setModalErro("");

    if (registro) {
      setForm({
        id: registro.id,
        username: registro.username || "",
        senha: "",
        equipe: registro.equipe || "",
        equipeId: registro.equipeId ? String(registro.equipeId) : "",
        tipoCategoriaId: registro.tipoCategoriaId ? String(registro.tipoCategoriaId) : "",
        novoTipo: "",
      });
    } else {
      setForm(FORM_VAZIO);
    }

    setModalOpen(true);
  }

  async function salvarUsuario() {
    if (!form.username.trim() || !form.equipe.trim() || !form.tipoCategoriaId) {
      setModalErro("Preencha username, nome da equipe e tipo de usuario.");
      return;
    }

    if (form.username.trim().length !== USERNAME_LENGTH) {
      setModalErro(`O username deve ter exatamente ${USERNAME_LENGTH} caracteres.`);
      return;
    }

    if (!form.id && !form.senha.trim()) {
      setModalErro("Preencha a senha para cadastrar o usuario.");
      return;
    }

    if (!isDeveloper && tipoSelecionadoEhDeveloper) {
      setModalErro("O tipo de usuario DEVELOPER foi desativado. Use GERENCIA.");
      return;
    }

    if (!podeDefinirGerencial && tipoSelecionadoEhGerencial) {
      setModalErro("Apenas GERENCIA e GERENTE podem definir o tipo de usuario como GERENCIA.");
      return;
    }

    try {
      setSalvando(true);
      setModalErro("");

      let tipoCadastroId = Number(form.tipoCategoriaId);
        if (form.tipoCategoriaId === NOVO_TIPO_VALUE) {
          if (!podeCriarTipoEquipe) {
          setModalErro("Somente ADMIN ou GERENCIA podem criar novos tipos de equipe.");
          return;
        }

        if (!form.novoTipo.trim()) {
          setModalErro("Preencha o nome do novo tipo de equipe.");
          return;
        }

        if (!tipoEquipeValidoParaCriacao(form.novoTipo)) {
          setModalErro(`Ao criar um novo tipo de equipe, o nome deve comecar com "${PREFIXOS_TIPO_EQUIPE[0]}" ou "${PREFIXOS_TIPO_EQUIPE[1]}".`);
          return;
        }

        const tipoCriado = await api.post("/api/tipo-categoria", {
          nome: form.novoTipo.trim(),
        });

        setTipos((atual) => sortByTextKeys(
          [...atual.filter((tipo) => String(tipo?.id) !== String(tipoCriado?.id)), tipoCriado],
          (tipo) => tipo?.nome,
        ));
        tipoCadastroId = Number(tipoCriado.id);
      }

      const payload = {
        username: form.username.trim().toUpperCase(),
        senha: form.senha.trim() || null,
        equipeId: form.equipeId ? Number(form.equipeId) : null,
        nomeEquipe: form.equipe.trim(),
        tipoCadastroId,
      };

      const usuarioSalvo = form.id
        ? await api.put(`/api/usuarios/${form.id}`, payload)
        : await api.post("/api/usuarios", payload);

      setUsuarios((atual) => {
        const proximo = form.id
          ? atual.map((item) => (item.id === usuarioSalvo.id ? usuarioSalvo : item))
          : [...atual, usuarioSalvo];

        return ordenarUsuarios(proximo);
      });

      setModalOpen(false);
    } catch (error) {
      setModalErro(error.message || "Nao foi possivel salvar o usuario.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirUsuario(registro) {
    if (!window.confirm(`Deseja excluir o usuario "${registro.username}"?`)) {
      return;
    }

    try {
      await api.delete(`/api/usuarios/${registro.id}`);
      setUsuarios((atual) => atual.filter((item) => item.id !== registro.id));
    } catch (error) {
      window.alert(error.message || "Nao foi possivel excluir o usuario.");
    }
  }

  async function inativarUsuario(registro) {
    if (!window.confirm(`Deseja deixar o usuario "${registro.username}" inativo?`)) {
      return;
    }

    try {
      const usuarioAtualizado = await api.patch(`/api/usuarios/${registro.id}/inativar`);
      setUsuarios((atual) =>
        ordenarUsuarios(atual.map((item) => (item.id === usuarioAtualizado.id ? usuarioAtualizado : item))),
      );
    } catch (error) {
      window.alert(error.message || "Nao foi possivel inativar o usuario.");
    }
  }

  const equipesOrdenadas = useMemo(
    () => sortByTextKeys(equipes, (item) => item?.nome, (item) => item?.tipoCategoria?.nome),
    [equipes],
  );

  const equipeSelecionada = useMemo(() => {
    if (form.equipeId) {
      return equipes.find((item) => String(item.id) === String(form.equipeId)) || null;
    }

    const nomeEquipe = form.equipe.trim().toLowerCase();
    if (!nomeEquipe) {
      return null;
    }

    return (
      equipes.find((item) => String(item?.nome || "").trim().toLowerCase() === nomeEquipe) || null
    );
  }, [equipes, form.equipe, form.equipeId]);

  const podeEditarEquipePreenchida = useMemo(() => {
    return Boolean(form.id && equipeSelecionada?.id && String(form.equipeId) === String(equipeSelecionada.id));
  }, [equipeSelecionada, form.equipeId, form.id]);

  const tiposParaModal = useMemo(() => {
    if (equipeSelecionada?.tipoCategoria?.id && !podeEditarEquipePreenchida) {
      return tipos.filter((tipo) => String(tipo.id) === String(equipeSelecionada.tipoCategoria.id));
    }

    if (isDeveloper) {
      return tiposDisponiveis;
    }

    const deveManterGerencialAtual = form.id && gerencialTipo && String(form.tipoCategoriaId) === String(gerencialTipo.id);

    if (!deveManterGerencialAtual) {
      return tiposDisponiveis;
    }

    const adicionais = [];
    if (deveManterGerencialAtual && gerencialTipo) {
      adicionais.push(gerencialTipo);
    }

    return sortByTextKeys(
      [...tiposDisponiveis, ...adicionais.filter((tipo, index, lista) =>
        lista.findIndex((item) => String(item?.id) === String(tipo?.id)) === index
      )],
      (tipo) => tipo?.nome,
    );
  }, [equipeSelecionada, form.id, form.tipoCategoriaId, gerencialTipo, isDeveloper, podeEditarEquipePreenchida, tipos, tiposDisponiveis]);

  function handleEquipeChange(valor) {
    const nomeDigitado = valor;
    const equipeExistente =
      equipes.find(
        (item) => String(item?.nome || "").trim().toLowerCase() === String(nomeDigitado).trim().toLowerCase(),
      ) || null;

    setForm((atual) => ({
      ...atual,
      equipe: nomeDigitado,
      equipeId: equipeExistente ? String(equipeExistente.id) : "",
      novoTipo: equipeExistente ? "" : atual.novoTipo,
      tipoCategoriaId: equipeExistente?.tipoCategoria?.id
        ? String(equipeExistente.tipoCategoria.id)
        : equipeExistente
          ? ""
          : atual.tipoCategoriaId,
    }));
  }

  if (loading) return <OutletLoading message="Carregando usuarios..." />;

  return (
    <div className="operacoes-page">
      <section className="operacoes-header">
        <div>
          <p className="operacoes-kicker">Painel</p>
          <h1>Equipes Cadastradas</h1>
          <p className="operacoes-subtitle">
            Gerencie os usuarios vinculados as equipes, ajustando username, senha, tipo de usuario e nome da equipe.
          </p>
        </div>

        <div className="operacoes-summary-grid">
          <div className="operacoes-summary">
            <span>Total</span>
            <strong>{resumo.total}</strong>
          </div>
          <div className="operacoes-summary ativa">
            <span>Ativos</span>
            <strong>{resumo.ativos}</strong>
          </div>
          <div className="operacoes-summary inativa">
            <span>Inativos</span>
            <strong>{resumo.inativos}</strong>
          </div>
        </div>
      </section>

      <div className="operacoes-toolbar">
        <button type="button" className="operacoes-primary-btn" onClick={() => abrirModalCadastro()}>
          Cadastrar equipe
        </button>
      </div>

      <section className="operacoes-filters equipes-filtros">
        <CascadeMultiSelectFilters
          rows={usuarios}
          filters={definicoesFiltro}
          value={filtrosCascata}
          onChange={setFiltrosCascata}
          storageKey="smart-filters:equipes-cadastradas"
        />
      </section>

      {erro && <div className="operacoes-feedback erro">{erro}</div>}

      {!erro && (
        <div className="operacoes-table-wrap">
          <table className="operacoes-table">
            <thead>
              <tr>
                
                <th>Username</th>
                <th>Equipe</th>
                <th>Tipo de usuario</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>

            <tbody>
              {usuariosFiltrados.length > 0 ? (
                usuariosFiltrados.map((registro) => {
                  const ativo = registro?.ativo !== false;

                  return (
                    <tr key={registro.id} className={!ativo ? "operacoes-row-inativa" : ""}>
                      
                      <td>{registro.username}</td>
                      <td>{registro.equipe || "-"}</td>
                      <td>{exibirTipoUsuario(registro.tipoCategoria) || "-"}</td>
                      <td>
                        <span className={`operacoes-status-badge ${ativo ? "ativa" : "inativa"}`}>
                          {ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="operacoes-actions-cell">
                        <button type="button" className="operacoes-row-btn solicitacao" onClick={() => abrirModalCadastro(registro)}>
                          Editar
                        </button>
                        <button type="button" className="operacoes-row-btn inutilizado" onClick={() => excluirUsuario(registro)}>
                          Excluir
                        </button>
                        {ativo && (
                          <button type="button" className="operacoes-row-btn concluido" onClick={() => inativarUsuario(registro)}>
                            Deixar inativo
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="operacoes-empty-state">
                    Nenhum registro encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          onClose={() => {
            setModalOpen(false);
            setModalErro("");
            setForm(FORM_VAZIO);
          }}
          size="sm"
        >
          <div className="operacoes-modal">
            <h2>{form.id ? "Editar equipe" : "Cadastrar equipe"}</h2>
            <p>
              {form.id
                ? "Atualize senha, username, tipo de usuario e nome da equipe."
                : "Cadastre um novo usuario com a equipe vinculada."}
            </p>

            <div className="operacoes-modal-form">
              <input
                className="operacoes-input"
                type="text"
                name="novo-usuario"
                autoComplete="off"
                placeholder="Username (7 caracteres)"
                maxLength={USERNAME_LENGTH}
                value={form.username}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    username: event.target.value.toUpperCase().slice(0, USERNAME_LENGTH),
                  }))
                }
              />

              <input
                className="operacoes-input"
                type="password"
                name="nova-senha"
                autoComplete="new-password"
                placeholder={form.id ? "Senha (preencha apenas para redefinir)" : "Senha"}
                value={form.senha}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    senha: event.target.value,
                  }))
                }
              />

              <input
                className="operacoes-input"
                type="text"
                placeholder="Nome da equipe"
                list="equipes-cadastradas-opcoes"
                value={form.equipe}
                onChange={(event) => handleEquipeChange(event.target.value)}
              />

              <datalist id="equipes-cadastradas-opcoes">
                {equipesOrdenadas.map((equipe) => (
                  <option key={equipe.id} value={equipe.nome} />
                ))}
              </datalist>

              <select
                value={form.tipoCategoriaId}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    tipoCategoriaId: event.target.value,
                    novoTipo: event.target.value === NOVO_TIPO_VALUE ? atual.novoTipo : "",
                  }))
                }
              >
                <option value="">Selecione o tipo</option>
                {tiposParaModal.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {exibirTipoUsuario(tipo.nome)}
                  </option>
                ))}
                {podeCriarTipoEquipe && <option value={NOVO_TIPO_VALUE}>Criar novo tipo...</option>}
              </select>

              {form.tipoCategoriaId === NOVO_TIPO_VALUE && (
                <input
                  className="operacoes-input"
                  type="text"
                  placeholder="Nome do novo tipo de equipe"
                  value={form.novoTipo}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      novoTipo: event.target.value,
                    }))
                  }
                />
              )}
            </div>

            <p className="operacoes-modal-helper">
              O username deve ter exatamente 7 caracteres.
            </p>

            <p className="operacoes-modal-helper">
              {equipeSelecionada
                ? "Equipe existente selecionada: voce pode trocar nome e tipo antes de salvar."
                : "Ao criar uma nova equipe, voce pode definir livremente o nome da equipe."}
            </p>

            <p className="operacoes-modal-helper">
              {`Ao criar um novo tipo de equipe, o nome deve comecar com "${PREFIXOS_TIPO_EQUIPE[0]}" ou "${PREFIXOS_TIPO_EQUIPE[1]}".`}
            </p>

            {podeCriarTipoEquipe && (
              <p className="operacoes-modal-helper">
                ADMIN e GERENCIA podem criar novos tipos de equipe direto neste cadastro.
              </p>
            )}

            {form.id && (
              <p className="operacoes-modal-helper">
                Deixe a senha em branco quando quiser editar os demais dados sem redefinir a senha.
              </p>
            )}

            {(!isDeveloper || !podeDefinirGerencial) && (
              <p className="operacoes-modal-helper">
                {!isDeveloper && !podeDefinirGerencial
                  ? "O tipo DEVELOPER foi desativado, e somente GERENCIA ou GERENTE podem definir GERENCIA."
                  : !isDeveloper
                    ? "O tipo DEVELOPER foi desativado. Use GERENCIA para o topo de permissao."
                    : "Somente GERENCIA ou GERENTE podem cadastrar ou promover alguem para GERENCIA."}
              </p>
            )}

            {modalErro && <p className="operacoes-modal-error">{modalErro}</p>}

            <div className="operacoes-modal-actions">
              <button
                type="button"
                className="operacoes-secondary-btn"
                onClick={() => {
                  setModalOpen(false);
                  setForm(FORM_VAZIO);
                  setModalErro("");
                }}
              >
                Cancelar
              </button>
              <button type="button" className="operacoes-primary-btn" onClick={salvarUsuario} disabled={salvando}>
                {salvando ? "Salvando..." : form.id ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
