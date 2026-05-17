export default function EmConstrucao({ titulo = "Em construcao" }) {
  return (
    <div className="operacoes-page">
      <section className="operacoes-header">
        <div>
          <p className="operacoes-kicker">Painel</p>
          <h1>{titulo}</h1>
          <p className="operacoes-subtitle">Essa aba ainda nao foi conectada, mas a rota ja esta pronta para o menu parar de quebrar.</p>
        </div>

        <div className="operacoes-summary">
          <span>Status</span>
          <strong>Em breve</strong>
        </div>
      </section>
    </div>
  );
}
