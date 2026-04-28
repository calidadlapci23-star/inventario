'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Upload, FileText, Download, Trash2, HardDriveUpload, Eye, Loader2 } from 'lucide-react';

// PASO 1: Importar la app de Firebase y getStorage
import app from '../../../../lib/firebase';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const PdfViewer = dynamic(() => import('../../../../components/PdfViewer'), {
  ssr: false,
  loading: () => <p className="text-center">Cargando visor...</p>
});

const initialReports = [
  { id: 1, name: 'Reporte_Calibracion_Q1.pdf', size: '1.2 MB', date: '2024-05-20', url: 'https://firebasestorage.googleapis.com/v0/b/mi-proyecto.appspot.com/o/reports%2FReporte_Calibracion_Q1.pdf?alt=media' },
  { id: 2, name: 'Mantenimiento_Preventivo.docx', size: '450 KB', date: '2024-04-15', url: '#' },
  { id: 3, name: 'Factura_Servicio_Tecnico.pdf', size: '800 KB', date: '2024-04-10', url: 'https://firebasestorage.googleapis.com/v0/b/mi-proyecto.appspot.com/o/reports%2FFactura_Servicio_Tecnico.pdf?alt=media' },
];

export default function GestionarReportesPage() {
  // PASO 2: Obtener la instancia de Storage a partir de la app
  const storage = getStorage(app);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reports, setReports] = useState(initialReports);
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const params = useParams();
  const equipoId = params.id as string;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGuardarReporte = async () => {
    if (!selectedFile) {
      alert('Por favor, selecciona un archivo primero.');
      return;
    }
    if (!equipoId) {
        alert('Error: No se ha podido identificar el equipo.');
        return;
    }

    setIsUploading(true);

    // PASO 3: Ahora 'storage' es un objeto válido y esta línea funcionará.
    const storageRef = ref(storage, `reports/${equipoId}/${Date.now()}_${selectedFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        console.error("Error al subir el archivo:", error);
        alert(`Error al subir el archivo: ${error.message}`);
        setIsUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);

          const newReport = {
            id: reports.length + 1,
            name: selectedFile.name,
            size: `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`,
            date: new Date().toISOString().split('T')[0],
            url: downloadURL,
          };

          setReports([newReport, ...reports]);
          setSelectedFile(null);
          setIsUploading(false);
          alert(`El archivo "${selectedFile.name}" se ha guardado con éxito.`);
        });
      }
    );
  };

  const handleViewFile = (url: string) => {
    setViewingFileUrl(url);
  };

  const handleCloseViewer = () => {
    setViewingFileUrl(null);
  };

  return (
    <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <HardDriveUpload size={22} />
                Subir Nuevo Reporte
            </h2>
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-4">Sube un informe de mantenimiento, calibración o cualquier otro documento relevante.</p>
                <div className="flex justify-center items-center gap-4">
                    <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        Seleccionar archivo
                    </label>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                    <span className="text-gray-500 text-sm">{selectedFile ? selectedFile.name : 'Sin archivos seleccionados'}</span>
                </div>
                {selectedFile && (
                <button 
                    onClick={handleGuardarReporte}
                    disabled={isUploading}
                    className="mt-6 w-48 bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md flex items-center justify-center disabled:bg-green-400 disabled:cursor-not-allowed"
                >
                    {isUploading ? (
                        <><Loader2 className="animate-spin mr-2" size={20} /> Subiendo...</>
                    ) : (
                        'Guardar Reporte'
                    )}
                </button>
                )}
            </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Repositorio de Documentos</h3>
            <ul className="divide-y divide-gray-200">
                {reports.map(report => (
                    <li key={report.id} className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <FileText className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="font-semibold text-gray-800">{report.name}</p>
                                <p className="text-sm text-gray-500" suppressHydrationWarning>
                                    Subido el: {new Date(report.date).toLocaleDateString('es-ES')} - {report.size}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {report.name.toLowerCase().endsWith('.pdf') && (
                                <button 
                                onClick={() => handleViewFile(report.url)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-md" 
                                title="Ver archivo"
                                >
                                    <Eye size={18} />
                                </button>
                            )}
                            <a href={report.url} download={report.name} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md" title="Descargar archivo"><Download size={18} /></a>
                            <button className="p-2 text-red-500 hover:bg-red-50 rounded-md" title="Eliminar archivo"><Trash2 size={18} /></button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>

        {viewingFileUrl && (
            <PdfViewer fileUrl={viewingFileUrl} onClose={handleCloseViewer} />
        )}
    </div>
  );
}
