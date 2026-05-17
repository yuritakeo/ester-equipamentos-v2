import { contarFotosEquipamento, extrairFotosEquipamento, formatCurrency } from "../utils/estoqueHelpers";

export default function EstoqueTabela({
  equipamentosFiltrados,
  rotuloVisaoEstoque,
  equipamentoIdsNaOficina,
  equipamentoIdsNaManutencao,
  salvandoFotoEquipId,
  onAbrirDetalhes,
  onAbrirFoto,
  onAbrirCadastro,
  onAbrirOficina,
  onAbrirManutencao,
  onExcluirFoto,
  onAbrirExclusao,
}) {
  return (
    <div className="estoque-table-wrap">
      <table className="estoque-table">
        <thead>
          <tr>
            <th>Equipamento</th>
            <th>Foto</th>
            <th>Tag</th>
            <th>Empresa</th>
            <th>Canteiro</th>
            <th>Equipe</th>
            <th>Locacao</th>
            <th>Valor Unitario</th>
            <th>Acoes</th>
          </tr>
        </thead>

        <tbody>
          {equipamentosFiltrados.length > 0 ? (
            equipamentosFiltrados.map((item) => {
              const estaNaOficina = equipamentoIdsNaOficina.has(item.id);
              const estaNaManutencao = equipamentoIdsNaManutencao.has(item.id);
              const estaEmCampo = Boolean(item?.equipe?.id || item?.equipeResponsavel?.id);
              const estaNoCanteiro = estaNaOficina || (!estaNaManutencao && !estaEmCampo);
              const nomeEquipe = item?.equipeResponsavel?.nome || item?.equipe?.nome || "Sem equipe";
              const fotosEquipamento = extrairFotosEquipamento(item);
              const quantidadeFotos = contarFotosEquipamento(item);

              return (
                <tr
                  key={item.id}
                  onDoubleClick={() => onAbrirDetalhes(item)}
                  className={[
                    "estoque-row-detalhe",
                    estaNoCanteiro ? "estoque-row-oficina" : "",
                    !estaNaOficina && !estaNaManutencao && estaEmCampo ? "estoque-row-campo" : "",
                    estaNaManutencao ? "estoque-row-manutencao" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  title={
                    estaNoCanteiro
                      ? "Equipamento está no canteiro"
                      : estaNaManutencao
                      ? "Equipamento está em manutenção"
                      : estaEmCampo
                      ? "Equipamento em uso no campo"
                      : "Equipamento está no canteiro"
                  }
                >
                  <td>{item.nomeEquipamento}</td>
                  <td>
                    <button
                      type="button"
                      className="estoque-foto-cell-btn"
                      onClick={() => onAbrirFoto(item, true)}
                      title="Ver fotos"
                    >
                      <div className="estoque-foto-thumb-list">
                        {fotosEquipamento.length ? (
                          fotosEquipamento.map((foto, index) => (
                            <span
                              key={`foto-${item.id}-${index}`}
                              className="estoque-foto-thumb com-foto"
                            >
                              <img
                                src={foto}
                                alt={`Foto ${index + 1} do equipamento ${item.nomeEquipamento}`}
                              />
                            </span>
                          ))
                        ) : (
                          <span className="estoque-foto-thumb sem-foto">
                            {quantidadeFotos ? `${quantidadeFotos} foto(s)` : "Sem foto"}
                          </span>
                        )}
                      </div>
                      <small>{quantidadeFotos}/2</small>
                    </button>
                  </td>
                  <td>{item.tagPatrimonio || "-"}</td>
                  <td>{item.empresa?.nome || "-"}</td>
                  <td>{item.canteiro?.nome || "-"}</td>
                  <td>{nomeEquipe}</td>
                  <td>{formatCurrency(item.valorLocacao)}</td>
                  <td>{formatCurrency(item.valorUnitario)}</td>
                  <td className="estoque-table-actions">
                    <button
                      type="button"
                      className="estoque-row-btn oficina"
                      onClick={() => onAbrirOficina(item)}
                      disabled={estaNaOficina || estaNaManutencao}
                    >
                      Canteiro
                    </button>
                    <button
                      type="button"
                      className="estoque-row-btn manutencao"
                      onClick={() => onAbrirManutencao(item)}
                      disabled={estaNaOficina || estaNaManutencao}
                    >
                      Manutencao
                    </button>
                    <button
                      type="button"
                      className="estoque-row-btn editar"
                      onClick={() => onAbrirCadastro(item)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="estoque-row-btn foto"
                      onClick={() => onAbrirFoto(item, false)}
                    >
                      {fotosEquipamento.length ? "Gerenciar fotos" : "Foto"}
                    </button>
                    <button
                      type="button"
                      className="estoque-row-btn foto-excluir"
                      onClick={() => onExcluirFoto(item)}
                      disabled={!fotosEquipamento.length || salvandoFotoEquipId === item.id}
                    >
                      {salvandoFotoEquipId === item.id ? "Excluindo..." : "Excluir fotos"}
                    </button>
                    <button
                      type="button"
                      className="estoque-row-btn excluir"
                      onClick={() => onAbrirExclusao(item)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="9" className="empty-state">
                Nenhum equipamento encontrado em {rotuloVisaoEstoque} com os filtros atuais.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
