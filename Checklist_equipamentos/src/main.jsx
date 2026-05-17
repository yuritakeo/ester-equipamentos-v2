import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";

function registerServiceWorkerInProduction() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Registro silencioso para nao quebrar a inicializacao da aplicacao.
    });
  });
}

function cleanupServiceWorkerInDevelopment() {
  if (!("serviceWorker" in navigator) || !import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    }).catch(() => {
      // Limpeza silenciosa no ambiente local.
    });

    if (!("caches" in window)) return;

    caches.keys().then((cacheKeys) => {
      cacheKeys
        .filter((cacheKey) => cacheKey.startsWith("checklist-aldo"))
        .forEach((cacheKey) => {
          caches.delete(cacheKey);
        });
    }).catch(() => {
      // Limpeza silenciosa no ambiente local.
    });
  });
}

registerServiceWorkerInProduction();
cleanupServiceWorkerInDevelopment();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
