import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import CascadeMultiSelectFilters from "../components/CascadeMultiSelectFilters";
import OutletLoading from "../components/OutletLoading";
import { api } from "../services/api";
import { filterRowsByCascade } from "../utils/cascadeFilters";
import { formatDateTimeBR, toIsoDateBrazil } from "../utils/dateTime";
import { sortByTextKeys } from "../utils/sort";
import { isOperationalRole } from "../utils/userRoles";
import "../Styles/operacoes.css";

function formatDateTime(value) {
  return formatDateTimeBR(value);
}

export default function Oficina() {
  const [registros, setRegistros] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [filtrosCascata, setFiltrosCascata] = useState({
    equipamento: [],
    tag: [],
    empresa: [],
    canteiro: [],
    data: [],
  });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [registroDetalheSelecionado, setRegistroDetalheSelecionado] = useState(null);
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [modalErro, setModalErro] = useState("");

  useEffect(() => {
    async function carregarOficinas() {
      try {
        const [oficinasResponse, manutencoesResponse, equipesResponse] = await Promise.all([
          api.get("/api/oficinas"),
          api.get("/api/manutencoes"),
          api.get("/api/equipes"),
        ]);

        setRegistros(Array.isArray(oficinasResponse) ? oficinasResponse : []);
        setManutencoes(Array.isArray(manutencoesResponse) ? manutencoesResponse : []);
        setEquipes(Array.isArray(equipesResponse) ? equipesResponse : []);
      } catch (error) {
        setErro(error.message || "Erro ao buscar registros de canteiro.");
      } finally {
        setLoading(false);
      }
    }

    carregarOficinas();
  }, []);

  const registrosCompletos = useMemo(() => {
    const registrosAtivos = (registros || []).filter((item) => item?.equipamento?.ativo !== false);
    const idsNaOficina = new Set(registrosAtivos.map((item) => item?.equipamento?.id).filter((id) => id != null));
    const concluidosDaManutencao = manutencoes
      .filter((item) => String(item?.status || "").toUpperCase() === "CONCLUIDO")
      .filter((item) => item?.equipamento?.ativo !== false)
      .filter((item) => item?.equipamento?.equipeResponsavel == null)
      .filter((item) => !idsNaOficina.has(item?.equipamento?.id))
      .map((item) => ({
        id: `manutencao-${item.id}`,
        originalManutencaoId: item.id,
        equipamento: item.equipamento,
        data: item.dataSaida || item.dataEntrada,
        observacao: item.observacao || "Equipamento concluido na manutencao e aguardando uso.",
      }));

    const registrosUnicosPorTag = new Map();
    [...registrosAtivos, ...concluidosDaManutencao].forEach((item) => {
      const tag = String(item?.equipamento?.tagPatrimonio || "").trim();
      const chaveUnica = tag ? `tag:${tag.toUpperCase()}` : `fallback-id:${String(item?.equipamento?.id ?? item?.id)}`;

      if (!registrosUnicosPorTag.has(chaveUnica)) {
        registrosUnicosPorTag.set(chaveUnica, item);
      }
    });

    return Array.from(registrosUnicosPorTag.values());
  }, [registros, manutencoes]);

  const definicoesFiltro = useMemo(() => ([
    {
      id: "equipamento",
      label: "Equipamentos",
      getValue: (item) => item?.equipamento?.nomeEquipamento,
    },
    {
      id: "tag",
      label: "Tags",
      getValue: (item) => item?.equipamento?.tagPatrimonio,
    },
    {
      id: "empresa",
      label: "Empresas",
      getValue: (item) => item?.equipamento?.empresa?.nome,
    },
    {
      id: "canteiro",
      label: "Canteiros",
      getValue: (item) => item?.equipamento?.canteiro?.nome,
    },
    {
      id: "data",
      label: "Data",
      searchPlaceholder: "Buscar data (AAAA-MM-DD)",
      getValue: (item) => toIsoDateBrazil(item?.data),
    },
  ]), []);

  const registrosFiltrados = useMemo(() => {
    return sortByTextKeys(
      filterRowsByCascade(registrosCompletos, definicoesFiltro, filtrosCascata)
        .filter((item) => item?.equipamento?.ativo !== false),
      (item) => item?.equipamento?.nomeEquipamento,
      (item) => item?.equipamento?.tagPatrimonio,
      (item) => item?.equipamento?.empresa?.nome,
      (item) => item?.equipamento?.canteiro?.nome,
    );
  }, [registrosCompletos, definicoesFiltro, filtrosCascata]);

  const equipesDisponiveis = useMemo(() => {
    return sortByTextKeys(equipes
      .filter((item) => item?.ativo !== false)
      .filter((item) => isOperationalRole(item?.tipoCategoria?.nome)),
      (item) => item?.nome,
      (item) => item?.tipoCategoria?.nome,
    );
  }, [equipes]);

  const detalhesRegistro = useMemo(() => {
    if (!registroDetalheSelecionado) return null;

    const equipamento = registroDetalheSelecionado?.equipamento;
    const veioDaManutencao = typeof registroDetalheSelecionado?.id !== "number";

    return {
      nomeEquipamento: equipamento?.nomeEquipamento || "-",
      tagPatrimonio: equipamento?.tagPatrimonio || "-",
      empresa: equipamento?.empresa?.nome || "-",
      canteiro: equipamento?.canteiro?.nome || "-",
      data: formatDateTime(registroDetalheSelecionado?.data),
      localizacao: veioDaManutencao ? "Canteiro (retorno da manutencao)" : "Canteiro",
      equipe: equipamento?.equipeResponsavel?.nome || "Nao direcionada",
      observacao: registroDetalheSelecionado?.observacao || "-",
    };
  }, [registroDetalheSelecionado]);

  function abrirModalDirecionar(registro) {
    setRegistroSelecionado(registro);
    setEquipeSelecionadaId("");
    setModalErro("");
    setModalOpen(true);
  }

  function abrirModalDetalhes(registro) {
    setRegistroDetalheSelecionado(registro);
    setDetalhesModalOpen(true);
  }

  function fecharModalDetalhes() {
    setDetalhesModalOpen(false);
    setRegistroDetalheSelecionado(null);
  }

  async function direcionarParaEquipe() {
    if (!registroSelecionado) return;
    if (!equipeSelecionadaId) {
      setModalErro("Selecione uma equipe para receber o equipamento.");
      return;
    }

    try {
      setSalvando(true);
      setModalErro("");
      const equipamentoId = registroSelecionado?.equipamento?.id;
      if (equipamentoId == null) {
        throw new Error("Equipamento invalido para direcionamento.");
      }

      if (typeof registroSelecionado.id === "number") {
        await api.patch(`/api/estoques/${equipamentoId}/direcionar-equipe`, {
          equipeId: Number(equipeSelecionadaId),
        });
        setRegistros((atual) => atual.filter((item) => item.id !== registroSelecionado.id));
      } else {
        await api.patch(`/api/estoques/${equipamentoId}/direcionar-equipe`, {
          equipeId: Number(equipeSelecionadaId),
        });
        setManutencoes((atual) =>
          atual.map((item) =>
            item.id === registroSelecionado.originalManutencaoId
              ? {
                  ...item,
                  equipamento: {
                    ...item.equipamento,
                    equipeResponsavel: { id: Number(equipeSelecionadaId) },
                  },
                }
              : item,
          ),
        );
      }

      setModalOpen(false);
    } catch (error) {
      setModalErro(error.message || "Nao foi possivel direcionar o equipamento para a equipe.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <OutletLoading message="Carregando registros de canteiro..." />;

  return (
    <div className="operacoes-page">
      <section className="operacoes-header">
        <div>
          <p className="operacoes-kicker">Fluxo</p>
          <h1>Canteiro</h1>
          <p className="operacoes-subtitle">Acompanhe os equipamentos enviados para canteiro e consulte o historico registrado.</p>
        </div>

        <div className="operacoes-summary">
          <span>Total</span>
          <strong>{registrosFiltrados.length}</strong>
        </div>
      </section>

      <section className="operacoes-filters">
        <CascadeMultiSelectFilters
          rows={registrosCompletos}
          filters={definicoesFiltro}
          value={filtrosCascata}
          onChange={setFiltrosCascata}
          storageKey="smart-filters:oficina"
        />
      </section>

      {erro && <div className="operacoes-feedback erro">{erro}</div>}

      {!erro && (
        <div className="operacoes-table-wrap">
          <table className="operacoes-table">
            <thead>
              <tr>
                
                <th>Equipamento</th>
                <th>Tag</th>
                <th>Empresa</th>
                <th>Canteiro</th>
                <th>Data</th>
                <th>Observacao</th>
                <th>Acoes</th>
              </tr>
            </thead>

            <tbody>
              {registrosFiltrados.length > 0 ? (
                registrosFiltrados.map((item) => (
                  <tr key={item.id} onDoubleClick={() => abrirModalDetalhes(item)} className="operacoes-row-detalhe" title="Duplo clique para ver detalhes">
                   
                    <td>
                      {item.equipamento?.nomeEquipamento || "-"}
                    </td>
                    <td>{item.equipamento?.tagPatrimonio || "-"}</td>
                    <td>{item.equipamento?.empresa?.nome || "-"}</td>
                    <td>{item.equipamento?.canteiro?.nome || "-"}</td>
                    <td>{formatDateTime(item.data)}</td>
                    <td>{item.observacao || "-"}</td>
                    <td>
                      <button type="button" className="operacoes-row-btn solicitacao" onClick={() => abrirModalDirecionar(item)}>
                        Direcionar a uma Equipe
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="operacoes-empty-state">
                    Nenhum registro de canteiro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detalhesModalOpen && (
        <Modal onClose={fecharModalDetalhes} size="sm">
          <div className="operacoes-modal">
            <h2>Detalhes do equipamento</h2>
            <p>Duplo clique na linha para abrir este resumo rapido.</p>

            <div className="operacoes-modal-summary">
              <p>
                <strong>Equipamento:</strong> {detalhesRegistro?.nomeEquipamento || "-"}
              </p>
              <p>
                <strong>Tag:</strong> {detalhesRegistro?.tagPatrimonio || "-"}
              </p>
              <p>
                <strong>Empresa:</strong> {detalhesRegistro?.empresa || "-"}
              </p>
              <p>
                <strong>Canteiro:</strong> {detalhesRegistro?.canteiro || "-"}
              </p>
              <p>
                <strong>Data:</strong> {detalhesRegistro?.data || "-"}
              </p>
              <p>
                <strong>Onde esta:</strong> {detalhesRegistro?.localizacao || "-"}
              </p>
              <p>
                <strong>Equipe responsavel:</strong> {detalhesRegistro?.equipe || "-"}
              </p>
              <p>
                <strong>Observacao:</strong> {detalhesRegistro?.observacao || "-"}
              </p>
            </div>

            <div className="operacoes-modal-actions">
              {registroDetalheSelecionado?.equipamento?.ativo !== false && (
                <button
                  type="button"
                  className="operacoes-secondary-btn"
                  onClick={() => {
                    const registro = registroDetalheSelecionado;
                    fecharModalDetalhes();
                    abrirModalDirecionar(registro);
                  }}
                >
                  Direcionar equipe
                </button>
              )}
              <button type="button" className="operacoes-primary-btn" onClick={fecharModalDetalhes}>
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalOpen && (
        <Modal
          onClose={() => {
            setModalOpen(false);
            setModalErro("");
          }}
          size="sm"
        >
          <div className="operacoes-modal">
            <h2>Direcionar a uma equipe</h2>
            <p>{registroSelecionado?.equipamento?.nomeEquipamento || "-"}</p>

            <div className="operacoes-modal-form">
              <select value={equipeSelecionadaId} onChange={(event) => setEquipeSelecionadaId(event.target.value)}>
                <option value="">Selecione a equipe</option>
                {equipesDisponiveis.map((equipe) => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>
            </div>

            {modalErro && <p className="operacoes-modal-error">{modalErro}</p>}

            <div className="operacoes-modal-actions">
              <button type="button" className="operacoes-secondary-btn" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="operacoes-primary-btn" onClick={direcionarParaEquipe} disabled={salvando}>
                {salvando ? "Salvando..." : "Direcionar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
