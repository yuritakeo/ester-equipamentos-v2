import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "./modal.css";

export default function Modal({ children, onClose, contentStyle, size = "md", contentClassName = "" }) {
  const sizeClass = ["sm", "lg", "xl"].includes(size) ? `modal-${size}` : "modal-md";

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const modalContent = (
    <div className="app-modal-overlay">
      <div className={`modal-box ${sizeClass} ${contentClassName}`.trim()} style={contentStyle}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;

  return createPortal(modalContent, document.body);
}
