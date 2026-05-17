import logoEmpresas from "../assets/logo-empresas.png";
import "./outletLoading.css";

export default function OutletLoading({ message = "Carregando..." }) {
  return (
    <section className="outlet-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="outlet-loading-card">
        <img src={logoEmpresas} alt="Logos das empresas" className="outlet-loading-logo" />
        <span className="outlet-loading-spinner" aria-hidden="true" />
        <p className="outlet-loading-text">{message}</p>
      </div>
    </section>
  );
}
