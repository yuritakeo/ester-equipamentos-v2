import { useEffect, useMemo, useState } from "react";
import CascadeMultiSelectFilters from "../components/CascadeMultiSelectFilters";
import OutletLoading from "../components/OutletLoading";
import { api } from "../services/api";
import { buildParsedFromExecution, getStartOfWeek, parseExecPayload, saveChecklistPdf } from "../utils/checklistPdf";
import { filterRowsByCascade } from "../utils/cascadeFilters";
import { formatDateBR, formatDateTimeBR } from "../utils/dateTime";
import { sortByTextKeys } from "../utils/sort";
import { DateRangePicker } from "rsuite";
import ptBR from "rsuite/locales/pt_BR";
import "rsuite/dist/rsuite-no-reset.min.css";
import "../Styles/operacoes.css";

const fmtDateTime = (v) => formatDateTimeBR(v);

function getRelatorioDataBase(relatorio) {
  return relatorio?.checklistExecucao?.data || relatorio?.data;
}

export default function Relatorios() {
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [periodoCalendario, setPeriodoCalendario] = useState(null);
  const [filtrosCascata, setFiltrosCascata] = useState({
    equipamento: [],
    tag: [],
    equipe: [],
  });

  useEffect(() => {
    async function fetchRelatorios() {
      setLoading(true);
      setErro("");
      try {
        const response = await api.get("/api/relatorios");
        setRelatorios(Array.isArray(response) ? response : []);
      } catch (e) {
        setErro(e.message || "Erro ao buscar relatorios.");
      } finally {
        setLoading(false);
      }
    }

    fetchRelatorios();
  }, []);

  const relatoriosArquivados = useMemo(() => {
    return (Array.isArray(relatorios) ? relatorios : [])
      .filter((relatorio) => relatorio?.checklistExecucao)
      .sort((a, b) => new Date(getRelatorioDataBase(b)) - new Date(getRelatorioDataBase(a)));
  }, [relatorios]);

  const relatoriosFiltradosPorPeriodo = useMemo(() => {
    const dataInicio = Array.isArray(periodoCalendario) ? periodoCalendario[0] : null;
    const dataFim = Array.isArray(periodoCalendario) ? periodoCalendario[1] : null;
    if (!dataInicio && !dataFim) return relatoriosArquivados;

    const inicioDia = dataInicio
      ? new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate(), 0, 0, 0, 0)
      : null;
    const fimDia = dataFim
      ? new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate(), 23, 59, 59, 999)
      : null;

    return relatoriosArquivados.filter((relatorio) => {
      const dataBase = getRelatorioDataBase(relatorio);
      if (!dataBase) return false;

      const dataRelatorio = new Date(dataBase);
      if (Number.isNaN(dataRelatorio.getTime())) return false;

      if (inicioDia && dataRelatorio < inicioDia) return false;
      if (fimDia && dataRelatorio > fimDia) return false;
      return true;
    });
  }, [periodoCalendario, relatoriosArquivados]);

  const historicoPorEquipamento = useMemo(() => {
    const mapa = new Map();

    relatoriosArquivados.forEach((relatorio) => {
      const chaveEquipamento = relatorio?.estoque?.id || relatorio?.checklistExecucao?.estoque?.id;
      if (chaveEquipamento == null) return;

      if (!mapa.has(chaveEquipamento)) mapa.set(chaveEquipamento, []);
      mapa.get(chaveEquipamento).push(relatorio);
    });

    return mapa;
  }, [relatoriosArquivados]);

  const definicoesFiltro = useMemo(() => ([
    {
      id: "equipamento",
      label: "Equipamentos",
      getValue: (relatorio) => relatorio?.estoque?.nomeEquipamento || relatorio?.checklistExecucao?.estoque?.nomeEquipamento,
    },
    {
      id: "tag",
      label: "Tags",
      getValue: (relatorio) => relatorio?.estoque?.tagPatrimonio || relatorio?.checklistExecucao?.estoque?.tagPatrimonio,
    },
    {
      id: "equipe",
      label: "Equipes",
      getValue: (relatorio) => relatorio?.equipe?.nome || relatorio?.checklistExecucao?.equipe?.nome,
    },
  ]), []);

  const relatoriosFiltrados = useMemo(() => {
    return sortByTextKeys(
      filterRowsByCascade(relatoriosFiltradosPorPeriodo, definicoesFiltro, filtrosCascata),
      (relatorio) => relatorio?.estoque?.nomeEquipamento || relatorio?.checklistExecucao?.estoque?.nomeEquipamento,
      (relatorio) => relatorio?.estoque?.tagPatrimonio || relatorio?.checklistExecucao?.estoque?.tagPatrimonio,
      (relatorio) => relatorio?.equipe?.nome || relatorio?.checklistExecucao?.equipe?.nome,
      (relatorio) => getRelatorioDataBase(relatorio),
    );
  }, [relatoriosFiltradosPorPeriodo, definicoesFiltro, filtrosCascata]);

  function getHistoricoEquipamento(relatorio) {
    const chaveEquipamento = relatorio?.estoque?.id || relatorio?.checklistExecucao?.estoque?.id;
    if (chaveEquipamento == null) return [relatorio];
    return historicoPorEquipamento.get(chaveEquipamento) || [relatorio];
  }

  async function baixarPdf(relatorio, historicoEquipamento) {
    const execucao = relatorio?.checklistExecucao;
    const payload = parseExecPayload(execucao);
    if (!payload || !execucao) {
      setErro("Nao foi possivel montar o PDF desse checklist.");
      return;
    }

    const parsed = buildParsedFromExecution(payload, execucao?.checklistModelo?.nome || relatorio?.estoque?.nomeEquipamento || "Checklist");
    const historicoSemana = historicoEquipamento
      .map((item) => item?.checklistExecucao)
      .filter((item) => item && getStartOfWeek(item?.data).getTime() === getStartOfWeek(execucao?.data).getTime());

    await saveChecklistPdf({
      parsed,
      selectedExec: execucao,
      history: historicoSemana,
      equipamento: relatorio?.estoque || execucao?.estoque,
      modeloNome: execucao?.checklistModelo?.arquivoNome || execucao?.checklistModelo?.nome,
    }, `relatorio-${(relatorio?.estoque || execucao?.estoque)?.nomeEquipamento || "equipamento"}-${new Date(execucao.data).toISOString().slice(0, 10)}.pdf`);
  }

  if (loading) return <OutletLoading message="Carregando relatorios..." />;
  if (erro) return <div className="operacoes-feedback erro">{erro}</div>;

  return (
    <div className="relatorios-page">
      <section className="relatorios-hero">
        <p className="operacoes-kicker">Arquivo</p>
        <h1>Relatorios Semanais</h1>
        <p className="relatorios-subtitle">Aqui aparecem os checklists arquivados, inclusive quando o equipamento fica sem checklist vinculado.</p>
      </section>

      <section className="operacoes-filters">
        <DateRangePicker
          value={periodoCalendario}
          onChange={(value) => setPeriodoCalendario(value)}
          locale={ptBR}
          format="dd/MM/yyyy"
          placeholder="Selecionar periodo"
          showOneCalendar={false}
          placement="bottomStart"
          cleanable
          className="relatorios-periodo-picker"
          ranges={[
            {
              label: "Hoje",
              value: [new Date(), new Date()],
            },
            {
              label: "Ontem",
              value: [
                new Date(new Date().setDate(new Date().getDate() - 1)),
                new Date(new Date().setDate(new Date().getDate() - 1)),
              ],
            },
            {
              label: "Ultimos 7 dias",
              value: [
                new Date(new Date().setDate(new Date().getDate() - 6)),
                new Date(),
              ],
            },
            {
              label: "Mes atual",
              value: [
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                new Date(),
              ],
            },
            {
              label: "Mes anterior",
              value: [
                new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                new Date(new Date().getFullYear(), new Date().getMonth(), 0),
              ],
            },
          ]}
        />

        <CascadeMultiSelectFilters
          rows={relatoriosFiltradosPorPeriodo}
          filters={definicoesFiltro}
          value={filtrosCascata}
          onChange={setFiltrosCascata}
          storageKey="smart-filters:relatorios"
        />
      </section>

      {!relatoriosFiltrados.length && <div className="operacoes-feedback">Nenhum checklist arquivado para os filtros selecionados.</div>}
      {!!relatoriosFiltrados.length && (
        <div className="operacoes-table-wrap">
          <table className="operacoes-table">
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Tag</th>
                <th>Equipe</th>
                <th>Semana</th>
                <th>Arquivado</th>
                <th>Execucao</th>
                <th>Status equipamento</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {relatoriosFiltrados.map((relatorio) => {
                const execucao = relatorio?.checklistExecucao;
                const equipamento = relatorio?.estoque || execucao?.estoque;
                const equipamentoInativo = equipamento?.ativo === false;

                return (
                  <tr key={relatorio.id}>
                    <td>{equipamento?.nomeEquipamento || "Equipamento desconhecido"}</td>
                    <td>{equipamento?.tagPatrimonio || "-"}</td>
                    <td>{relatorio?.equipe?.nome || execucao?.equipe?.nome || "-"}</td>
                    <td>{formatarSemana(execucao?.data)}</td>
                    <td>{fmtDateTime(relatorio?.data)}</td>
                    <td>{fmtDateTime(execucao?.data)}</td>
                    <td>
                      <span className={`relatorio-chip${equipamentoInativo ? " inativo" : ""}`}>
                        {equipamentoInativo ? "Inativo" : "Ativo"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="operacoes-primary-btn"
                        onClick={() => baixarPdf(relatorio, getHistoricoEquipamento(relatorio))}
                        disabled={!execucao}
                      >
                        Baixar PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatarSemana(dataIso) {
  if (!dataIso) return "-";
  const segunda = getStartOfWeek(dataIso);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  return `${formatDateBR(segunda)} a ${formatDateBR(domingo)}`;
}
