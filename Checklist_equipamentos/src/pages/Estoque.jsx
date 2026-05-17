import { useSearchParams } from "react-router-dom";
import Modal from "../components/Modal";
import CascadeMultiSelectFilters from "../components/CascadeMultiSelectFilters";
import EstoqueLocadosView from "../components/EstoqueLocadosView";
import EstoqueTabela from "../components/EstoqueTabela";
import OutletLoading from "../components/OutletLoading";
import { useEstoque } from "../hooks/useEstoque";
import { formatDateTime, normalizarListaFotos } from "../utils/estoqueHelpers";
import { exportarExcel, exportarPdf } from "../utils/estoqueExport";
import "../Styles/estoque.css";
export default function Estoque() {
  const [searchParams] = useSearchParams();
  const estoqueVisao = searchParams.get("visao") === "locados" ? "locados" : "macro";
  const storageKeyFiltros = "smart-filters:estoque:macro";
  const subtituloVisaoEstoque =
    "Consulte, filtre, exporte e mova os equipamentos entre os fluxos do sistema.";

  const est = useEstoque(estoqueVisao);

  if (est.loading) return <OutletLoading message="Carregando equipamentos..." />;

  if (estoqueVisao === "locados") {
    return <EstoqueLocadosView />;
  }

  async function handleExportarPdf() {
    await exportarPdf({
      equipamentosFiltrados: est.equipamentosFiltrados,
      filtrosAplicados: est.filtrosAplicados,
      rotuloVisaoEstoque: est.rotuloVisaoEstoque,
      equipamentoIdsNaOficina: est.equipamentoIdsNaOficina,
      equipamentoIdsNaManutencao: est.equipamentoIdsNaManutencao,
    });
    est.setExportModalOpen(false);
  }

  function handleExportarExcel() {
    exportarExcel({
      equipamentosFiltrados: est.equipamentosFiltrados,
      filtrosAplicados: est.filtrosAplicados,
      rotuloVisaoEstoque: est.rotuloVisaoEstoque,
      estoqueVisao,
      equipamentoIdsNaOficina: est.equipamentoIdsNaOficina,
      equipamentoIdsNaManutencao: est.equipamentoIdsNaManutencao,
    });
    est.setExportModalOpen(false);
  }

  return (
    <div className="estoque-page">
      {/* Header */}
      <section className="estoque-header">
        <div>
          <p className="estoque-kicker">Controle</p>
          <h1>Estoque de Equipamentos</h1>
          <p className="estoque-view-badge">{est.rotuloVisaoEstoque}</p>
          <p className="estoque-subtitle">{subtituloVisaoEstoque}</p>
        </div>

        <div className="estoque-summary-grid">
          <div className="estoque-summary">
            <span>Total</span>
            <strong>{est.resumoEstoque.total}</strong>
          </div>
          <div className="estoque-summary oficina">
            <span>Canteiro</span>
            <strong>{est.resumoEstoque.oficina}</strong>
          </div>
          <div className="estoque-summary manutencao">
            <span>Manutencao</span>
            <strong>{est.resumoEstoque.manutencao}</strong>
          </div>
          <div className="estoque-summary campo">
            <span>Com equipe</span>
            <strong>{est.resumoEstoque.campo}</strong>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="estoque-actions">
        <button
          type="button"
          className="estoque-primary-btn"
          onClick={() => est.abrirModalCadastro()}
        >
          Novo equipamento
        </button>

        {est.isDeveloperLike && (
          <button
            type="button"
            className="estoque-danger-btn"
            onClick={est.excluirTodosEquipamentos}
            disabled={est.excluindoTodos || !est.equipamentosFiltrados.length}
          >
            {est.excluindoTodos ? "Excluindo..." : "Excluir todos equipamentos"}
          </button>
        )}

        <button
          type="button"
          className="estoque-secondary-btn"
          onClick={() => {
            est.limparImportacao();
            est.setImportModalOpen(true);
          }}
        >
          Importar tabela
        </button>

        <button
          type="button"
          className="estoque-secondary-btn"
          onClick={() => est.setExportModalOpen(true)}
        >
          Relatorio
        </button>
      </div>

      {/* Filters */}
      <section className="estoque-filters">
        <CascadeMultiSelectFilters
          rows={est.equipamentosDaVisao}
          filters={est.definicoesFiltro}
          value={est.filtrosCascata}
          onChange={est.setFiltrosCascata}
          storageKey={storageKeyFiltros}
          onClearAll={est.limparFiltrosValores}
        />

        <div className="estoque-filters-extra">
          <select
            value={est.locacaoMin}
            onChange={(event) => est.setLocacaoMin(event.target.value)}
          >
            <option value="">Locacao minima</option>
            {est.locacoesDisponiveis.map((valor) => (
              <option key={`loc-min-${valor}`} value={valor}>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)}
              </option>
            ))}
          </select>

          <select
            value={est.locacaoMax}
            onChange={(event) => est.setLocacaoMax(event.target.value)}
          >
            <option value="">Locacao maxima</option>
            {est.locacoesDisponiveis.map((valor) => (
              <option key={`loc-max-${valor}`} value={valor}>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)}
              </option>
            ))}
          </select>

          <select
            value={est.valorMin}
            onChange={(event) => est.setValorMin(event.target.value)}
          >
            <option value="">Valor minimo</option>
            {est.valoresDisponiveis.map((valor) => (
              <option key={`valor-min-${valor}`} value={valor}>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)}
              </option>
            ))}
          </select>

          <select
            value={est.valorMax}
            onChange={(event) => est.setValorMax(event.target.value)}
          >
            <option value="">Valor maximo</option>
            {est.valoresDisponiveis.map((valor) => (
              <option key={`valor-max-${valor}`} value={valor}>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)}
              </option>
            ))}
          </select>

          <select
            value={est.filtroSituacao}
            onChange={(event) => est.setFiltroSituacao(event.target.value)}
          >
            <option value="">Status: todas</option>
            <option value="OFICINA">No canteiro</option>
            <option value="MANUTENCAO">Em manutencao</option>
            <option value="CAMPO">Com equipe</option>
          </select>

          <select
            value={est.filtroFoto}
            onChange={(event) => est.setFiltroFoto(event.target.value)}
          >
            <option value="">Foto: todas</option>
            <option value="COM_FOTO">Com foto</option>
            <option value="SEM_FOTO">Sem foto</option>
          </select>
        </div>
      </section>

      {est.erro && <div className="estoque-feedback erro">{est.erro}</div>}

      {/* Table */}
      {!est.erro && (
        <EstoqueTabela
          equipamentosFiltrados={est.equipamentosFiltrados}
          rotuloVisaoEstoque={est.rotuloVisaoEstoque}
          equipamentoIdsNaOficina={est.equipamentoIdsNaOficina}
          equipamentoIdsNaManutencao={est.equipamentoIdsNaManutencao}
          salvandoFotoEquipId={est.salvandoFotoEquipId}
          onAbrirDetalhes={est.abrirModalDetalhesEquipamento}
          onAbrirFoto={est.abrirModalFoto}
          onAbrirCadastro={est.abrirModalCadastro}
          onAbrirOficina={est.abrirModalOficina}
          onAbrirManutencao={est.abrirModalManutencao}
          onExcluirFoto={est.excluirFotoTabela}
          onAbrirExclusao={est.abrirModalExclusaoEquipamento}
        />
      )}

      {/* Modal: Confirmar exclusao */}
      {est.confirmarExclusaoModalOpen && (
        <Modal onClose={est.fecharModalExclusaoEquipamento} size="sm">
          <div className="estoque-modal">
            <h2>Confirmar exclusao</h2>
            <p>Deseja excluir o equipamento "{est.equipamentoParaExcluir?.nomeEquipamento || "-"}"?</p>
            <div className="estoque-modal-actions">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={est.fecharModalExclusaoEquipamento}
                disabled={est.excluindoEquipamento}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="estoque-row-btn excluir"
                onClick={est.excluirEquipamentoConfirmado}
                disabled={est.excluindoEquipamento}
              >
                {est.excluindoEquipamento ? "Excluindo..." : "Excluir equipamento"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Exportar */}
      {est.exportModalOpen && (
        <Modal onClose={() => est.setExportModalOpen(false)} size="sm">
          <div className="estoque-modal">
            <h2>Relatorio</h2>
            <p>Escolha o formato desejado para exportar a tabela de estoque.</p>
            <div className="estoque-export-actions">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={handleExportarExcel}
              >
                Excel
              </button>
              <button
                type="button"
                className="estoque-primary-btn"
                onClick={handleExportarPdf}
              >
                PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Detalhes do equipamento */}
      {est.detalhesEquipamentoModalOpen && (
        <Modal
          onClose={() => {
            est.limparResumoChecklistEquipamento(est.equipamentoDetalheSelecionado?.id);
            est.setDetalhesEquipamentoModalOpen(false);
            est.setEquipamentoDetalheSelecionado(null);
          }}
          size="sm"
        >
          <div className="estoque-modal">
            <h2>Detalhes do equipamento</h2>
            <p>Duplo clique na linha para abrir este resumo rapido.</p>
            <div className="estoque-modal-summary">
              <p><strong>Equipamento:</strong> {est.detalhesEquipamento?.nomeEquipamento || "-"}</p>
              <p><strong>Tag:</strong> {est.detalhesEquipamento?.tagPatrimonio || "-"}</p>
              <p><strong>Onde esta:</strong> {est.detalhesEquipamento?.localizacao || "-"}</p>
              <p><strong>Canteiro:</strong> {est.detalhesEquipamento?.canteiro || "-"}</p>
              <p><strong>Equipe responsavel:</strong> {est.detalhesEquipamento?.equipe || "-"}</p>
              <p>
                <strong>Ultimo checklist:</strong>{" "}
                {formatDateTime(est.detalhesEquipamento?.ultimoChecklist)}
              </p>
            </div>
            <div className="estoque-modal-actions">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={est.visualizarUltimoChecklistPdf}
                disabled={
                  !est.ultimoChecklistDetalhe?.checklistExecucaoId
                    || est.gerandoChecklistPdf
                    || est.carregandoResumoChecklistEquipId === est.equipamentoDetalheSelecionado?.id
                }
              >
                {est.gerandoChecklistPdf
                  ? "Abrindo..."
                  : est.carregandoResumoChecklistEquipId === est.equipamentoDetalheSelecionado?.id
                  ? "Carregando..."
                  : "Ver checklist"}
              </button>
              <button
                type="button"
                className="estoque-primary-btn"
                onClick={() => {
                  est.limparResumoChecklistEquipamento(est.equipamentoDetalheSelecionado?.id);
                  est.setDetalhesEquipamentoModalOpen(false);
                  est.setEquipamentoDetalheSelecionado(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Importar tabela */}
      {est.importModalOpen && (
        <Modal
          onClose={() => {
            est.setImportModalOpen(false);
            est.limparImportacao();
          }}
          size="md"
        >
          <div className="estoque-modal">
            <h2>Importar tabela</h2>
            <p>
              Use uma planilha `.xlsx` ou `.csv` com os cabecalhos: Equipamento, Tag, Empresa,
              Locacao e Valor Unitario.
            </p>
            <div className="estoque-modal-form">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={est.handleArquivoImportacao}
              />
            </div>
            {est.arquivoImportacao && (
              <p className="estoque-import-file">Arquivo: {est.arquivoImportacao}</p>
            )}
            {est.importErro && <p className="estoque-modal-error">{est.importErro}</p>}
            {est.previewImportacao.length > 0 && (
              <div className="estoque-import-preview">
                <strong>Pre-visualizacao</strong>
                <div className="estoque-import-preview-table">
                  <table className="estoque-table">
                    <tbody>
                      {est.previewImportacao.slice(0, 5).map((linha, index) => (
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
            {est.importResultado && (
              <p className="estoque-import-result">
                Importacao finalizada: {est.importResultado.sucesso} cadastrados,{" "}
                {est.importResultado.falhas} falhas.
              </p>
            )}
            <div className="estoque-modal-actions">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={() => est.setImportModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="estoque-primary-btn"
                onClick={est.importarTabela}
                disabled={est.importando}
              >
                {est.importando ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Cadastro / Edicao */}
      {est.cadastroModalOpen && (
        <Modal
          onClose={() => {
            est.setCadastroModalOpen(false);
            est.setCadastroErro("");
          }}
          size="md"
          contentClassName="estoque-cadastro-modal"
        >
          <div className="estoque-modal">
            <h2>{est.novoEquipamento.id ? "Editar equipamento" : "Novo equipamento"}</h2>
            <p>
              {est.novoEquipamento.id
                ? "Atualize os dados do equipamento selecionado."
                : "Cadastre um novo item de estoque para aparecer na tabela e nas exportacoes."}
            </p>

            <div className="estoque-modal-form">
              <input
                type="text"
                placeholder="Nome do equipamento"
                value={est.novoEquipamento.nomeEquipamento}
                onChange={(event) =>
                  est.setNovoEquipamento((atual) => ({
                    ...atual,
                    nomeEquipamento: event.target.value,
                  }))
                }
              />

              <input
                type="text"
                placeholder="Tag"
                value={est.novoEquipamento.tagPatrimonio}
                onChange={(event) =>
                  est.setNovoEquipamento((atual) => ({
                    ...atual,
                    tagPatrimonio: event.target.value,
                  }))
                }
              />
              {est.cadastroTagDuplicada && (
                <p className="estoque-tag-warning">Este equipamento ja esta cadastrado</p>
              )}

              <select
                value={est.novoEquipamento.empresaId}
                onChange={(event) =>
                  est.setNovoEquipamento((atual) => ({
                    ...atual,
                    empresaId: event.target.value,
                  }))
                }
              >
                <option value="">Selecione a empresa</option>
                {est.empresasOrdenadas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </option>
                ))}
              </select>

              {est.canManageEmpresas && (
                <div className="estoque-canteiro-gestao">
                  <div className="estoque-canteiro-gestao-inputs">
                    <input
                      type="text"
                      placeholder="Nome da empresa"
                      value={est.empresaGestaoNome}
                      onChange={(event) => est.setEmpresaGestaoNome(event.target.value)}
                    />
                  </div>
                  <div className="estoque-canteiro-gestao-actions">
                    <button
                      type="button"
                      className="estoque-secondary-btn"
                      onClick={est.criarEmpresa}
                      disabled={est.salvandoEmpresa}
                    >
                      {est.salvandoEmpresa ? "Salvando..." : "Nova empresa"}
                    </button>
                    <button
                      type="button"
                      className="estoque-secondary-btn"
                      onClick={est.editarEmpresaSelecionada}
                      disabled={est.salvandoEmpresa || !est.novoEquipamento.empresaId}
                    >
                      Renomear selecionada
                    </button>
                    <button
                      type="button"
                      className="estoque-danger-btn"
                      onClick={est.excluirEmpresaSelecionada}
                      disabled={est.salvandoEmpresa || !est.novoEquipamento.empresaId}
                    >
                      Excluir selecionada
                    </button>
                  </div>
                  {est.empresaGestaoErro && (
                    <p className="estoque-modal-error">{est.empresaGestaoErro}</p>
                  )}
                </div>
              )}

              <select
                value={est.novoEquipamento.canteiroId}
                onChange={(event) =>
                  est.setNovoEquipamento((atual) => ({
                    ...atual,
                    canteiroId: event.target.value,
                  }))
                }
              >
                <option value="">Selecione o canteiro</option>
                {est.canteirosOrdenados.map((canteiro) => (
                  <option key={canteiro.id} value={canteiro.id}>
                    {canteiro.nome}
                  </option>
                ))}
              </select>

              {est.canManageCanteiros && (
                <div className="estoque-canteiro-gestao">
                  <div className="estoque-canteiro-gestao-inputs">
                    <input
                      type="text"
                      placeholder="Nome do canteiro"
                      value={est.canteiroGestaoNome}
                      onChange={(event) => est.setCanteiroGestaoNome(event.target.value)}
                    />
                  </div>
                  <div className="estoque-canteiro-gestao-actions">
                    <button
                      type="button"
                      className="estoque-secondary-btn"
                      onClick={est.criarCanteiro}
                      disabled={est.salvandoCanteiro}
                    >
                      {est.salvandoCanteiro ? "Salvando..." : "Novo canteiro"}
                    </button>
                    <button
                      type="button"
                      className="estoque-secondary-btn"
                      onClick={est.editarCanteiroSelecionado}
                      disabled={est.salvandoCanteiro || !est.novoEquipamento.canteiroId}
                    >
                      Renomear selecionado
                    </button>
                    <button
                      type="button"
                      className="estoque-danger-btn"
                      onClick={est.excluirCanteiroSelecionado}
                      disabled={est.salvandoCanteiro || !est.novoEquipamento.canteiroId}
                    >
                      Excluir selecionado
                    </button>
                  </div>
                  {est.canteiroGestaoErro && (
                    <p className="estoque-modal-error">{est.canteiroGestaoErro}</p>
                  )}
                </div>
              )}

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor de locacao"
                value={est.novoEquipamento.valorLocacao}
                onChange={(event) =>
                  est.setNovoEquipamento((atual) => ({
                    ...atual,
                    valorLocacao: event.target.value,
                  }))
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor unitario"
                value={est.novoEquipamento.valorUnitario}
                onChange={(event) =>
                  est.setNovoEquipamento((atual) => ({
                    ...atual,
                    valorUnitario: event.target.value,
                  }))
                }
              />

              {!est.novoEquipamento.id && (
                <div className="estoque-foto-editor">
                  <p className="estoque-foto-editor-title">Foto do equipamento</p>
                  <div className="estoque-foto-editor-preview">
                    {normalizarListaFotos(est.novoEquipamento.fotosBase64).length ? (
                      <div className="estoque-foto-grid">
                        {normalizarListaFotos(est.novoEquipamento.fotosBase64).map((foto, index) => (
                          <div key={`cad-foto-${index}`} className="estoque-foto-item">
                            <img src={foto} alt={`Preview da foto ${index + 1} do equipamento`} />
                            <button
                              type="button"
                              className="estoque-foto-remove-btn"
                              onClick={() => est.removerFotoCadastro(index)}
                            >
                              Excluir
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>Nenhuma foto cadastrada.</span>
                    )}
                  </div>
                  <div className="estoque-foto-editor-actions">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={est.handleFotoCadastro}
                      disabled={
                        normalizarListaFotos(est.novoEquipamento.fotosBase64).length >= 2
                      }
                    />
                    <button
                      type="button"
                      className="estoque-secondary-btn"
                      onClick={() =>
                        est.setNovoEquipamento((atual) => ({ ...atual, fotosBase64: [] }))
                      }
                      disabled={!normalizarListaFotos(est.novoEquipamento.fotosBase64).length}
                    >
                      Excluir todas
                    </button>
                    <span className="estoque-foto-count">
                      {normalizarListaFotos(est.novoEquipamento.fotosBase64).length}/2 fotos
                    </span>
                  </div>
                </div>
              )}
            </div>

            {est.cadastroErro && <p className="estoque-modal-error">{est.cadastroErro}</p>}

            <div className="estoque-modal-actions">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={() => est.setCadastroModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="estoque-primary-btn"
                onClick={est.cadastrarEquipamento}
                disabled={est.salvando}
              >
                {est.salvando ? "Salvando..." : est.novoEquipamento.id ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Foto */}
      {est.fotoModalOpen && (
        <Modal
          onClose={() => {
            est.setFotoModalOpen(false);
            est.setFotoErro("");
            est.setFotoModalSomenteLeitura(false);
          }}
          size="md"
        >
          <div className="estoque-modal">
            <h2>Foto do equipamento</h2>
            <p>{est.equipamentoSelecionado?.nomeEquipamento || "-"}</p>
            <div className="estoque-foto-modal-preview">
              {normalizarListaFotos(est.fotoPreview).length ? (
                <div className="estoque-foto-grid">
                  {normalizarListaFotos(est.fotoPreview).map((foto, index) => (
                    <div key={`modal-foto-${index}`} className="estoque-foto-item">
                      <img
                        src={foto}
                        alt={`Foto ${index + 1} do equipamento ${est.equipamentoSelecionado?.nomeEquipamento || ""}`}
                      />
                      {!est.fotoModalSomenteLeitura && (
                        <button
                          type="button"
                          className="estoque-foto-remove-btn"
                          onClick={() => est.removerFotoModal(index)}
                          disabled={est.salvandoFoto}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span>Nenhuma foto cadastrada para este equipamento.</span>
              )}
            </div>
            {!est.fotoModalSomenteLeitura && (
              <div className="estoque-modal-form">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={est.handleNovaFotoModal}
                  disabled={normalizarListaFotos(est.fotoPreview).length >= 2 || est.salvandoFoto}
                />
              </div>
            )}
            {!est.fotoModalSomenteLeitura && est.fotoErro && (
              <p className="estoque-modal-error">{est.fotoErro}</p>
            )}
            <div className="estoque-modal-actions">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={() => {
                  est.setFotoModalOpen(false);
                  est.setFotoModalSomenteLeitura(false);
                }}
              >
                Fechar
              </button>
              {!est.fotoModalSomenteLeitura && (
                <button
                  type="button"
                  className="estoque-secondary-btn"
                  onClick={() => est.setFotoPreview([])}
                  disabled={!normalizarListaFotos(est.fotoPreview).length || est.salvandoFoto}
                >
                  Excluir todas
                </button>
              )}
              {!est.fotoModalSomenteLeitura && (
                <button
                  type="button"
                  className="estoque-primary-btn"
                  onClick={est.salvarFotoEquipamento}
                  disabled={est.salvandoFoto}
                >
                  {est.salvandoFoto ? "Salvando..." : "Salvar foto"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Confirmar mover para canteiro */}
      {est.confirmarMoverModalOpen && (
        <Modal
          onClose={() => {
            est.setConfirmarMoverModalOpen(false);
            est.setAcaoErro("");
          }}
          size="sm"
        >
          <div className="estoque-modal">
            <h2>Mover para canteiro</h2>
            <p><strong>{est.equipamentoSelecionado?.nomeEquipamento}</strong></p>
            <p style={{ margin: "16px 0" }}>{est.moverMensagem}</p>
            {est.acaoErro && <p className="estoque-modal-error">{est.acaoErro}</p>}
            <div className="estoque-modal-actions">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={() => est.setConfirmarMoverModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="estoque-primary-btn"
                onClick={est.moverParaOficina}
                disabled={est.salvando}
              >
                {est.salvando ? "Movendo..." : "Confirmar"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Manutencao */}
      {est.manutencaoModalOpen && (
        <Modal
          onClose={() => {
            est.setManutencaoModalOpen(false);
            est.setAcaoErro("");
          }}
          size="sm"
        >
          <div className="estoque-modal">
            <h2>Enviar para manutencao</h2>
            <div className="estoque-modal-summary">
              <p><strong>Nome:</strong> {est.equipamentoSelecionado?.nomeEquipamento || "-"}</p>
              <p><strong>Tag:</strong> {est.equipamentoSelecionado?.tagPatrimonio || "-"}</p>
            </div>
            <div className="estoque-modal-form">
              <input
                type="text"
                placeholder="Observacao"
                value={est.manutencaoObservacao}
                onChange={(event) => est.setManutencaoObservacao(event.target.value)}
              />
            </div>
            {est.acaoErro && <p className="estoque-modal-error">{est.acaoErro}</p>}
            <div className="estoque-modal-actions">
              <button
                type="button"
                className="estoque-secondary-btn"
                onClick={() => est.setManutencaoModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="estoque-primary-btn"
                onClick={est.enviarParaManutencao}
                disabled={est.salvando}
              >
                {est.salvando ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

