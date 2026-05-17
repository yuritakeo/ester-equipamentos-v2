import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Modal from "../components/Modal";
import CascadeMultiSelectFilters from "../components/CascadeMultiSelectFilters";
import OutletLoading from "../components/OutletLoading";
import { api, API_BASE_URL } from "../services/api";
import { filterRowsByCascade } from "../utils/cascadeFilters";
import { formatDateTimeBR } from "../utils/dateTime";
import { sortByTextKeys } from "../utils/sort";
import "../Styles/operacoes.css";

function formatDateTime(value) {
  return formatDateTimeBR(value);
}

function ordenarEquipamentos(lista) {
  return sortByTextKeys(lista, (item) => item?.nomeEquipamento, (item) => item?.tagPatrimonio, (item) => item?.empresa?.nome);
}

export default function ModelosChecklists() {
  const [modelos, setModelos] = useState([]);
  const [equipamentos, setEquipamentos] = useState([]);
  const [execucoes, setExecucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [acaoErro, setAcaoErro] = useState("");
  const [importErro, setImportErro] = useState("");
  const [importando, setImportando] = useState(false);
  const [importResultado, setImportResultado] = useState(null);
  const [arquivoImportacao, setArquivoImportacao] = useState("");
  const [arquivoModelo, setArquivoModelo] = useState(null);
  const [previewImportacao, setPreviewImportacao] = useState([]);
  const [nomeImportacao, setNomeImportacao] = useState("");
  const [filtrosCascata, setFiltrosCascata] = useState({
    modelo: [],
    equipamento: [],
    tag: [],
    arquivo: [],
  });
  const [cadastroModalOpen, setCadastroModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open: false, modelo: null });
  const [equipamentoModalFiltro, setEquipamentoModalFiltro] = useState("");
  const [tagModalFiltro, setTagModalFiltro] = useState("");
  const [modeloForm, setModeloForm] = useState({
    id: null,
    nome: "",
    equipamentoIds: [],
  });

  async function carregarDados(opcoes = {}) {
    const { mostrarMensagemSucesso = false } = opcoes;

    try {
      setLoading(true);
      setErro("");

      const [modelosResponse, estoquesResponse, execucoesResponse] = await Promise.all([
        api.get("/api/checklist-modelos"),
        api.get("/api/estoques"),
        api.get("/api/execucoes/resumo"),
      ]);

      setModelos(Array.isArray(modelosResponse) ? modelosResponse : []);
      setEquipamentos(ordenarEquipamentos(Array.isArray(estoquesResponse) ? estoquesResponse : []));
      setExecucoes(Array.isArray(execucoesResponse) ? execucoesResponse : []);

      if (mostrarMensagemSucesso) {
        setOk("Dados atualizados com sucesso.");
      }
    } catch (error) {
      setErro(error.message || "Nao foi possivel carregar os modelos de checklist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const equipamentosOrdenados = useMemo(() => ordenarEquipamentos(equipamentos), [equipamentos]);
  const vinculoAtualPorEquipamento = useMemo(() => {
    const mapa = new Map();

    modelos.forEach((modelo) => {
      (modelo.equipamentos || []).forEach((equipamento) => {
        mapa.set(String(equipamento.id), {
          modeloId: modelo.id,
          modeloNome: modelo.nome || `Modelo ${modelo.id}`,
        });
      });
    });

    return mapa;
  }, [modelos]);

  const definicoesFiltro = useMemo(() => ([
    {
      id: "modelo",
      label: "Modelo",
      getValue: (modelo) => modelo?.nome,
    },
    {
      id: "equipamento",
      label: "Equipamentos",
      getValue: (modelo) => (modelo?.equipamentos || []).map((equipamento) => equipamento?.nomeEquipamento),
    },
    {
      id: "tag",
      label: "Tags",
      getValue: (modelo) => (modelo?.equipamentos || []).map((equipamento) => equipamento?.tagPatrimonio),
    },
    {
      id: "arquivo",
      label: "Arquivo",
      getValue: (modelo) => modelo?.arquivoOriginalNome || modelo?.arquivoNome,
    },
  ]), []);

  const modelosFiltrados = useMemo(() => {
    return sortByTextKeys(
      filterRowsByCascade(modelos, definicoesFiltro, filtrosCascata),
      (modelo) => modelo?.nome,
      (modelo) => modelo?.arquivoOriginalNome || modelo?.arquivoNome,
    );
  }, [modelos, definicoesFiltro, filtrosCascata]);

  const resumo = useMemo(() => {
    const totalModelos = modelosFiltrados.length;
    const totalVinculos = modelosFiltrados.reduce((acc, modelo) => acc + (modelo.equipamentos?.length || 0), 0);
    const totalComArquivo = modelosFiltrados.filter((modelo) => !!modelo.arquivoNome).length;

    return {
      totalModelos,
      totalVinculos,
      totalComArquivo,
    };
  }, [modelosFiltrados]);

  const equipamentosComChecklistSalvo = useMemo(() => {
    const modeloId = deleteModal.modelo?.id;
    if (!modeloId) return [];

    const mapa = new Map();
    execucoes
      .filter((execucao) => execucao?.checklistModelo?.id === modeloId)
      .forEach((execucao) => {
        const equipamento = execucao?.estoque;
        if (!equipamento?.id) return;

        const existente = mapa.get(equipamento.id);
        if (!existente || new Date(execucao.data) > new Date(existente.data)) {
          mapa.set(equipamento.id, {
            id: equipamento.id,
            nome: equipamento.nomeEquipamento || "Equipamento",
            tag: equipamento.tagPatrimonio || "",
            data: execucao.data,
          });
        }
      });

    return sortByTextKeys(Array.from(mapa.values()), (item) => item?.nome, (item) => item?.tag);
  }, [deleteModal.modelo, execucoes]);

  const opcoesEquipamentoModal = useMemo(() => {
    return sortByTextKeys(Array.from(
      new Set(
        equipamentosOrdenados
          .map((equipamento) => String(equipamento?.nomeEquipamento || "").trim())
          .filter(Boolean),
      ),
    ), (item) => item);
  }, [equipamentosOrdenados]);

  const opcoesTagModal = useMemo(() => {
    return sortByTextKeys(Array.from(
      new Set(
        equipamentosOrdenados
          .filter((equipamento) => !equipamentoModalFiltro || String(equipamento?.nomeEquipamento || "").trim() === equipamentoModalFiltro)
          .map((equipamento) => String(equipamento?.tagPatrimonio || "").trim())
          .filter(Boolean),
      ),
    ), (item) => item);
  }, [equipamentosOrdenados, equipamentoModalFiltro]);

  const equipamentosFiltradosNoModal = useMemo(() => {
    return equipamentosOrdenados.filter((equipamento) => {
      const nomeEquipamento = String(equipamento?.nomeEquipamento || "").trim();
      const tagEquipamento = String(equipamento?.tagPatrimonio || "").trim();

      const nomeOk = !equipamentoModalFiltro || nomeEquipamento === equipamentoModalFiltro;
      const tagOk = !tagModalFiltro || tagEquipamento === tagModalFiltro;

      return nomeOk && tagOk;
    });
  }, [equipamentosOrdenados, equipamentoModalFiltro, tagModalFiltro]);
  const todosFiltradosSelecionados = useMemo(() => {
    if (!equipamentosFiltradosNoModal.length) return false;

    return equipamentosFiltradosNoModal.every((equipamento) => (
      modeloForm.equipamentoIds.includes(String(equipamento.id))
    ));
  }, [equipamentosFiltradosNoModal, modeloForm.equipamentoIds]);

  function abrirCadastro(modelo = null) {
    setAcaoErro("");
    setOk("");
    setEquipamentoModalFiltro("");
    setTagModalFiltro("");

    if (!modelo) {
      setModeloForm({ id: null, nome: "", equipamentoIds: [] });
      setCadastroModalOpen(true);
      return;
    }

    setModeloForm({
      id: modelo.id,
      nome: modelo.nome || "",
      equipamentoIds: (modelo.equipamentos || []).map((equipamento) => String(equipamento.id)),
    });
    setCadastroModalOpen(true);
  }

  function limparImportacao() {
    setArquivoImportacao("");
    setArquivoModelo(null);
    setNomeImportacao("");
    setPreviewImportacao([]);
    setImportErro("");
    setImportResultado(null);
  }

  function handleArquivoImportacao(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setArquivoModelo(file);
    setArquivoImportacao(file.name);
    setNomeImportacao(file.name.replace(/\.[^.]+$/, ""));
    setImportErro("");
    setImportResultado(null);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const data = loadEvent.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
        setPreviewImportacao(Array.isArray(rows) ? rows : []);
      } catch {
        setPreviewImportacao([]);
      }
    };
    reader.readAsBinaryString(file);
  }

  function toggleEquipamento(equipamentoId) {
    setModeloForm((atual) => {
      const equipamentoIdString = String(equipamentoId);
      const jaSelecionado = atual.equipamentoIds.includes(equipamentoIdString);

      return {
        ...atual,
        equipamentoIds: jaSelecionado
          ? atual.equipamentoIds.filter((id) => id !== equipamentoIdString)
          : [...atual.equipamentoIds, equipamentoIdString],
      };
    });
  }

  function alternarEquipamentosFiltrados() {
    setModeloForm((atual) => {
      const idsFiltradosLista = equipamentosFiltradosNoModal.map((equipamento) => String(equipamento.id));
      const idsFiltrados = new Set(idsFiltradosLista);
      const todosSelecionados = idsFiltradosLista.length > 0 && idsFiltradosLista.every((id) => atual.equipamentoIds.includes(id));

      return {
        ...atual,
        equipamentoIds: todosSelecionados
          ? atual.equipamentoIds.filter((id) => !idsFiltrados.has(id))
          : Array.from(new Set([...atual.equipamentoIds, ...idsFiltradosLista])),
      };
    });
  }

  async function salvarModelo() {
    if (!modeloForm.nome.trim()) {
      setAcaoErro("Informe o nome do modelo.");
      return;
    }

    if (!modeloForm.id) {
      setAcaoErro("Para criar um checklist utilizavel, importe primeiro o arquivo Excel e depois use Editar para vincular os equipamentos.");
      return;
    }

    try {
      setSalvando(true);
      setAcaoErro("");

      const payload = {
        nome: modeloForm.nome.trim(),
        equipamentoIds: modeloForm.equipamentoIds.map((id) => Number(id)),
      };
      const modeloAnterior = modeloForm.id ? modelos.find((item) => item.id === modeloForm.id) : null;
      const equipamentosDepois = new Set(modeloForm.equipamentoIds);
      const removidos = (modeloAnterior?.equipamentos || []).filter((equipamento) => !equipamentosDepois.has(String(equipamento.id)));
      const transferidos = modeloForm.equipamentoIds
        .map((id) => {
          const vinculo = vinculoAtualPorEquipamento.get(String(id));
          const equipamento = equipamentos.find((item) => String(item.id) === String(id));
          if (!vinculo || vinculo.modeloId === modeloForm.id) return null;

          return {
            nomeEquipamento: equipamento?.nomeEquipamento || `Equipamento ${id}`,
            modeloOrigem: vinculo.modeloNome,
          };
        })
        .filter(Boolean);

      await (modeloForm.id
        ? api.put(`/api/checklist-modelos/${modeloForm.id}`, payload)
        : api.post("/api/checklist-modelos", payload));

      await carregarDados();

      setCadastroModalOpen(false);
      setModeloForm({ id: null, nome: "", equipamentoIds: [] });
      setErro("");
      if (transferidos.length) {
        const nomes = transferidos.map((item) => `${item.nomeEquipamento} (antes em ${item.modeloOrigem})`).join(", ");
        setOk(`Equipamento(s) transferido(s): ${nomes}. O sistema arquivou os registros em Relatorios e cortou o vinculo com o modelo anterior.`);
      } else if (removidos.length) {
        const nomes = removidos.map((equipamento) => equipamento.nomeEquipamento).join(", ");
        setOk(`Equipamento(s) desvinculado(s): ${nomes}. Os checklists salvos na semana foram arquivados em Relatorios e o equipamento ficou sem checklist no painel.`);
      } else if (!modeloAnterior) {
        setOk("Modelo cadastrado com sucesso.");
      } else {
        setOk("Modelo atualizado com sucesso.");
      }
    } catch (error) {
      setAcaoErro(error.message || "Nao foi possivel salvar o modelo.");
    } finally {
      setSalvando(false);
    }
  }

  function abrirConfirmacaoExclusao(modelo) {
    setErro("");
    setOk("");
    setDeleteModal({ open: true, modelo });
  }

  async function confirmarExclusaoModelo() {
    const modelo = deleteModal.modelo;
    if (!modelo) return;

    try {
      setExcluindo(true);
      await api.delete(`/api/checklist-modelos/${modelo.id}`);
      setModelos((atual) => atual.filter((item) => item.id !== modelo.id));
      setExecucoes((atual) => atual.map((execucao) => (
        execucao?.checklistModelo?.id === modelo.id
          ? { ...execucao, checklistModelo: null }
          : execucao
      )));
      const equipamentosRemovidos = (modelo.equipamentos || []).map((equipamento) => equipamento.nomeEquipamento).join(", ");
      setErro("");
      setOk(
        equipamentosRemovidos
          ? `Modelo excluido. Os equipamentos ${equipamentosRemovidos} ficaram sem checklist e os registros salvos na semana foram arquivados em Relatorios.`
          : "Modelo excluido com sucesso.",
      );
      setDeleteModal({ open: false, modelo: null });
    } catch (error) {
      setErro(error.message || "Nao foi possivel excluir o modelo.");
    } finally {
      setExcluindo(false);
    }
  }

  async function importarModelo() {
    if (!arquivoModelo) {
      setImportErro("Selecione um arquivo de modelo em Excel.");
      return;
    }

    try {
      setImportando(true);
      setImportErro("");

      const formData = new FormData();
      formData.append("arquivo", arquivoModelo);
      formData.append("nome", nomeImportacao.trim());

      const criado = await api.postForm("/api/checklist-modelos/importar", formData);
      setModelos((atual) => [...atual, criado]);
      setModeloForm({
        id: criado.id,
        nome: criado.nome || "",
        equipamentoIds: (criado.equipamentos || []).map((equipamento) => String(equipamento.id)),
      });
      setCadastroModalOpen(true);
      setImportModalOpen(false);
      setImportResultado({ sucesso: 1, falhas: 0 });
      setErro("");
      setOk("Modelo importado com sucesso. Selecione os equipamentos no modal aberto e clique em Salvar.");
    } catch (error) {
      setImportErro(error.message || "Nao foi possivel importar o modelo.");
    } finally {
      setImportando(false);
    }
  }

  function baixarArquivo(modelo) {
    if (!modelo.arquivoNome) {
      setErro("Este modelo não possui arquivo para download.");
      return;
    }
    window.open(`${API_BASE_URL}/api/checklist-modelos/${modelo.id}/arquivo`, "_blank");
  }

  if (loading) return <OutletLoading message="Carregando modelos..." />;

  return (
    <div className="operacoes-page">
      <section className="operacoes-header">
        <div>
          <p className="operacoes-kicker">Modelagem</p>
          <h1>Modelos de Checklists</h1>
          <p className="operacoes-subtitle">
            Guarde os arquivos originais dos modelos, organize os checklists e vincule os equipamentos corretos.
          </p>
        </div>

        <div className="operacoes-summary-grid">
          <div className="operacoes-summary">
            <span>Modelos</span>
            <strong>{resumo.totalModelos}</strong>
          </div>
          <div className="operacoes-summary ativa">
            <span>Vinculos</span>
            <strong>{resumo.totalVinculos}</strong>
          </div>
          <div className="operacoes-summary">
            <span>Arquivos</span>
            <strong>{resumo.totalComArquivo}</strong>
          </div>
        </div>
      </section>

      <div className="operacoes-toolbar">
        <button
          type="button"
          className="operacoes-secondary-btn"
          onClick={() => carregarDados({ mostrarMensagemSucesso: true })}
          disabled={loading}
        >
          Atualizar
        </button>
        <button
          type="button"
          className="operacoes-secondary-btn"
          onClick={() => {
            limparImportacao();
            setImportModalOpen(true);
          }}
        >
          Importar Excel
        </button>
      </div>

      <section className="operacoes-filters equipes-filtros">
        <CascadeMultiSelectFilters
          rows={modelos}
          filters={definicoesFiltro}
          value={filtrosCascata}
          onChange={setFiltrosCascata}
          storageKey="smart-filters:modelos-checklists"
        />
      </section>

      {erro && <div className="operacoes-feedback erro">{erro}</div>}
      {!erro && ok && <div className="operacoes-feedback sucesso">{ok}</div>}

      {!erro && (
        <div className="operacoes-table-wrap">
          <table className="operacoes-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Modelo</th>
                <th>Arquivo</th>
                <th>Equipamentos</th>
                <th>Data</th>
                <th>Acoes</th>
              </tr>
            </thead>

            <tbody>
              {modelosFiltrados.length > 0 ? (
                modelosFiltrados.map((modelo) => (
                  <tr key={modelo.id}>
                    <td>{modelo.id}</td>
                    <td>{modelo.nome}</td>
                    <td>{modelo.arquivoOriginalNome || modelo.arquivoNome || "-"}</td>
                    <td>
                        <div className="operacoes-tag-list">
                        {(modelo.equipamentos || []).length > 0 ? (
                          ordenarEquipamentos(modelo.equipamentos).map((equipamento) => (
                            <span key={`${modelo.id}-${equipamento.id}`} className="operacoes-tag">
                              {equipamento.nomeEquipamento}
                              {equipamento.tagPatrimonio ? ` (${equipamento.tagPatrimonio})` : ""}
                            </span>
                          ))
                        ) : (
                          <span className="operacoes-tag empty">Nenhum equipamento vinculado</span>
                        )}
                      </div>
                    </td>
                    <td>{formatDateTime(modelo.data)}</td>
                    <td className="operacoes-actions-cell">
                      <button type="button" className="operacoes-row-btn solicitacao" onClick={() => abrirCadastro(modelo)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="operacoes-row-btn concluido"
                        onClick={() => baixarArquivo(modelo)}
                        disabled={!modelo.arquivoNome}
                      >
                        Baixar
                      </button>
                      <button type="button" className="operacoes-row-btn inutilizado" onClick={() => abrirConfirmacaoExclusao(modelo)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="operacoes-empty-state">
                    Nenhum modelo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {cadastroModalOpen && (
        <Modal
          onClose={() => {
            setCadastroModalOpen(false);
            setAcaoErro("");
          }}
          size="lg"
        >
          <div className="operacoes-modal">
            <h2>{modeloForm.id ? "Editar modelo" : "Cadastrar modelo"}</h2>
            <p>{modeloForm.id ? "Defina o nome do checklist e selecione quais equipamentos pertencem a ele." : "Novos modelos precisam ser importados via Excel. Depois do import, use Editar para vincular os equipamentos."}</p>

            <div className="operacoes-modal-form">
              <input
                className="operacoes-input"
                type="text"
                placeholder="Nome do modelo"
                value={modeloForm.nome}
                onChange={(event) => setModeloForm((atual) => ({ ...atual, nome: event.target.value }))}
              />

              <div className="operacoes-selector-card">
                <strong>Equipamentos vinculados</strong>
                <p className="operacoes-modal-helper">
                  Se um equipamento estiver em outro modelo, ao salvar ele sera transferido automaticamente para este modelo.
                </p>
                <div className="operacoes-modal-form equipes-filtros">
                  <select
                    value={equipamentoModalFiltro}
                    onChange={(event) => {
                      const proximoEquipamento = event.target.value;
                      setEquipamentoModalFiltro(proximoEquipamento);
                      if (!proximoEquipamento) {
                        setTagModalFiltro("");
                        return;
                      }

                      const tagAtualExiste = equipamentosOrdenados.some((equipamento) => (
                        String(equipamento?.nomeEquipamento || "").trim() === proximoEquipamento
                        && String(equipamento?.tagPatrimonio || "").trim() === tagModalFiltro
                      ));

                      if (!tagAtualExiste) {
                        setTagModalFiltro("");
                      }
                    }}
                  >
                    <option value="">Todos os equipamentos</option>
                    {opcoesEquipamentoModal.map((nomeEquipamento) => (
                      <option key={`modal-equip-${nomeEquipamento}`} value={nomeEquipamento}>
                        {nomeEquipamento}
                      </option>
                    ))}
                  </select>

                  <select value={tagModalFiltro} onChange={(event) => setTagModalFiltro(event.target.value)}>
                    <option value="">Todas as tags</option>
                    {opcoesTagModal.map((tag) => (
                      <option key={`modal-tag-${tag}`} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="operacoes-modal-actions">
                  <button type="button" className="operacoes-secondary-btn" onClick={alternarEquipamentosFiltrados} disabled={!equipamentosFiltradosNoModal.length}>
                    {todosFiltradosSelecionados ? "Limpar todos do filtro" : "Selecionar todos do filtro"}
                  </button>
                </div>
                <div className="operacoes-checkbox-grid">
                  {equipamentosFiltradosNoModal.map((equipamento) => {
                    const checked = modeloForm.equipamentoIds.includes(String(equipamento.id));
                    const vinculoAtual = vinculoAtualPorEquipamento.get(String(equipamento.id));
                    const mostrarOrigem = vinculoAtual && vinculoAtual.modeloId !== modeloForm.id;

                    return (
                      <label key={equipamento.id} className={`operacoes-checkbox-item ${checked ? "selected" : ""}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleEquipamento(equipamento.id)} />
                        <span>
                          {equipamento.nomeEquipamento}
                          {equipamento.tagPatrimonio ? ` - ${equipamento.tagPatrimonio}` : ""}
                          {mostrarOrigem ? ` | Vinculado em: ${vinculoAtual.modeloNome}` : ""}
                        </span>
                      </label>
                    );
                  })}
                  {!equipamentosFiltradosNoModal.length && (
                    <div className="operacoes-checkbox-item">
                      <span>Nenhum equipamento encontrado para o filtro selecionado.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {acaoErro && <p className="operacoes-modal-error">{acaoErro}</p>}

            <div className="operacoes-modal-actions">
              <button type="button" className="operacoes-secondary-btn" onClick={() => setCadastroModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="operacoes-primary-btn" onClick={salvarModelo} disabled={salvando}>
                {salvando ? "Salvando..." : modeloForm.id ? "Salvar" : "Importe pelo Excel"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {importModalOpen && (
        <Modal
          onClose={() => {
            setImportModalOpen(false);
            limparImportacao();
          }}
          size="md"
        >
          <div className="operacoes-modal">
            <h2>Importar modelo em Excel</h2>
            <p>
              O arquivo original sera guardado na pasta <code>ModelosChecklist</code> para preservar o formato exato do modelo.
            </p>

            <div className="operacoes-modal-form">
              <input
                className="operacoes-input"
                type="text"
                placeholder="Nome do modelo"
                value={nomeImportacao}
                onChange={(event) => setNomeImportacao(event.target.value)}
              />
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleArquivoImportacao} />
            </div>

            {arquivoImportacao && <p className="operacoes-modal-helper">Arquivo: {arquivoImportacao}</p>}
            {importErro && <p className="operacoes-modal-error">{importErro}</p>}

            {previewImportacao.length > 0 && (
              <div className="operacoes-import-preview">
                <strong>Pre-visualizacao</strong>
                <div className="operacoes-table-wrap compact">
                  <table className="operacoes-table">
                    <tbody>
                      {previewImportacao.slice(0, 5).map((linha, index) => (
                        <tr key={`preview-${index}`}>
                          {linha.map((coluna, colIndex) => (
                            <td key={`preview-${index}-${colIndex}`}>{String(coluna ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importResultado && (
              <p className="operacoes-modal-helper">
                Importacao finalizada com sucesso. O arquivo foi salvo e o modelo foi cadastrado.
              </p>
            )}

            <div className="operacoes-modal-actions">
              <button type="button" className="operacoes-secondary-btn" onClick={() => setImportModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="operacoes-primary-btn" onClick={importarModelo} disabled={importando}>
                {importando ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteModal.open && (
        <Modal
          onClose={() => {
            if (!excluindo) setDeleteModal({ open: false, modelo: null });
          }}
          size="md"
        >
          <div className="operacoes-modal">
            <h2>Excluir modelo</h2>
            <p>
              O modelo <strong>{deleteModal.modelo?.nome || "-"}</strong> sera excluido. Os equipamentos abaixo ja possuem checklist salvo
              nesse modelo e esses registros serao arquivados em <strong>Relatorios</strong>.
            </p>

            <div className="operacoes-selector-card">
              <strong>Equipamentos com checklist salvo</strong>
              <div className="operacoes-checkbox-grid">
                {equipamentosComChecklistSalvo.length ? (
                  equipamentosComChecklistSalvo.map((equipamento) => (
                    <div key={equipamento.id} className="operacoes-checkbox-item selected">
                      <span>
                        {equipamento.nome}
                        {equipamento.tag ? ` - ${equipamento.tag}` : ""}
                        {equipamento.data ? ` | Ultimo checklist: ${formatDateTime(equipamento.data)}` : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="operacoes-checkbox-item">
                    <span>Nenhum checklist salvo foi encontrado para este modelo.</span>
                  </div>
                )}
              </div>
            </div>

            <p>
              Depois da exclusao, os equipamentos ficam sem checklist no painel e nao abrem mais modal de preenchimento ate receberem outro modelo.
            </p>

            <div className="operacoes-modal-actions">
              <button type="button" className="operacoes-secondary-btn" onClick={() => setDeleteModal({ open: false, modelo: null })} disabled={excluindo}>
                Cancelar
              </button>
              <button type="button" className="operacoes-primary-btn" onClick={confirmarExclusaoModelo} disabled={excluindo}>
                {excluindo ? "Excluindo..." : "Confirmar exclusao"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
