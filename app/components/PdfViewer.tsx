'use client';

// 1. IMPORTAR useEffect
import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface PdfViewerProps {
  fileUrl: string;
  onClose: () => void;
}

export default function PdfViewer({ fileUrl, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // 2. CONFIGURAR EL WORKER DENTRO DE UN useEffect
  // Esto garantiza que el código solo se ejecute en el cliente, después del montaje.
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const goToPrevPage = () => setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  const goToNextPage = () => setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages || 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col p-4">
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Vista Previa del Documento</h3>
          <div className="flex items-center space-x-4">
            <a
              href={fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              title="Descargar"
            >
              <Download className="h-6 w-6 text-gray-600" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors"
              title="Cerrar"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto py-4">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex justify-center"
            loading={<p className="text-center">Cargando PDF...</p>}
            error={<p className="text-center text-red-500">Error al cargar el PDF. Por favor, intente descargarlo.</p>}
          >
            <Page pageNumber={pageNumber} />
          </Document>
        </div>

        {numPages && numPages > 1 && (
          <div className="flex justify-center items-center pt-3 border-t">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <p className="text-sm text-gray-700 mx-4">
              Página {pageNumber} de {numPages}
            </p>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
