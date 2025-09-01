import React from "react";

type PdfViewerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
};

export default function PdfViewerModal({ isOpen, onClose, pdfUrl }: PdfViewerModalProps) {
  if (!isOpen || !pdfUrl) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Source Document</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <iframe
            src={pdfUrl}
            title="PDF Viewer"
            width="100%"
            height="100%"
            style={{ border: "none" }}
          ></iframe>
        </div>
      </div>
    </div>
  );
}
