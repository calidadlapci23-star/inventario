// /app/inventario/reactivos/ReporteReactivosEnUso.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  where,
  Timestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { 
  Package, 
  Search, 
  Filter,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Beaker,
  Layers,
  FileText,
  Download,
  Eye,
  Activity
} from 'lucide-react';

// Interfaces para reactivos en uso
interface ReactivoEnUso {
  id: string;
  productoId: string;
  nombre: string;
  disciplina: string;
  lote: string;
  fechaPuestaUso: Timestamp;
  puestoEnUsoPor: string;
  puestoEnUsoPorId: string;
  cantidadUtilizada: number;
  unidadMedida: string;
  estado: 'activo' | 'finalizado' | 'vencido';
  fechaFinalizacion?: Timestamp;
  fechaVencimiento?: Timestamp;
  observaciones?: string;
  proyecto?: string;
  departamento: string;
  ubicacion?: string;
}

interface DisciplinaSummary {
  nombre: string;
  totalReactivos: number;
  activos: number;
  finalizados: number;
  vencidos: number;
}

const ReporteReactivosEnUso = () => {
  // Estados principales
  const [reactivosEnUso, setReactivosEnUso] = useState<ReactivoEnUso[]>([]);
  const [reactivosActivos, setReactivosActivos] = useState<ReactivoEnUso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de filtros - Solo mostrar activos por defecto
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState<string>('activo'); // Solo activos por defecto
  const [filtroUsuario, setFiltroUsuario] = useState<string>('todos');
  
  // Estados de UI
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error' | 'info', texto: string, detalle?: string } | null>(null);
  const [reactivoSeleccionado, setReactivoSeleccionado] = useState<ReactivoEnUso | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [observacionFinalizacion, setObservacionFinalizacion] = useState('');
  
  // Usuario actual (simulado)
  const usuarioActual = {
    id: 'user_001',
    nombre: 'Ana López',
    departamento: 'Laboratorio Clínico',
    rol: 'supervisor'
  };

  // Cargar reactivos en uso - Solo activos inicialmente
  useEffect(() => {
    const fetchReactivosEnUso = async () => {
      try {
        setLoading(true);
        
        // Cargar TODOS los reactivos en uso para el resumen
        const reactivosRef = collection(db, 'reactivos_en_uso');
        const qReactivos = query(reactivosRef, orderBy('fechaPuestaUso', 'desc'));
        const reactivosSnapshot = await getDocs(qReactivos);
        
        const reactivosData = reactivosSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            productoId: data.productoId || '',
            nombre: data.nombre || 'Sin nombre',
            disciplina: data.disciplina || 'Sin disciplina',
            lote: data.lote || 'Sin lote',
            fechaPuestaUso: data.fechaPuestaUso || Timestamp.now(),
            puestoEnUsoPor: data.puestoEnUsoPor || 'Usuario desconocido',
            puestoEnUsoPorId: data.puestoEnUsoPorId || '',
            cantidadUtilizada: Number(data.cantidadUtilizada) || 0,
            unidadMedida: data.unidadMedida || 'unidades',
            estado: data.estado || 'activo',
            fechaFinalizacion: data.fechaFinalizacion || undefined,
            fechaVencimiento: data.fechaVencimiento || undefined,
            observaciones: data.observaciones || '',
            proyecto: data.proyecto || '',
            departamento: data.departamento || '',
            ubicacion: data.ubicacion || ''
          } as ReactivoEnUso;
        });
        
        setReactivosEnUso(reactivosData);
        
        // Filtrar solo activos para mostrar por defecto
        const activos = reactivosData.filter(r => r.estado === 'activo');
        setReactivosActivos(activos);
        
      } catch (error: any) {
        console.error("Error cargando reactivos en uso:", error);
        mostrarMensaje('error', 'Error al cargar los reactivos en uso', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReactivosEnUso();
  }, []);

  // Calcular resumen por disciplina - Solo para activos
  const calcularResumenDisciplinas = (): DisciplinaSummary[] => {
    const disciplinasMap = new Map<string, DisciplinaSummary>();
    
    const reactivosAMostrar = filtroEstado === 'activo' ? reactivosActivos : reactivosEnUso;
    
    reactivosAMostrar.forEach(reactivo => {
      // Si estamos filtrando por disciplina específica, saltar si no coincide
      if (filtroDisciplina !== 'todas' && reactivo.disciplina !== filtroDisciplina) {
        return;
      }
      
      if (!disciplinasMap.has(reactivo.disciplina)) {
        disciplinasMap.set(reactivo.disciplina, {
          nombre: reactivo.disciplina,
          totalReactivos: 0,
          activos: 0,
          finalizados: 0,
          vencidos: 0
        });
      }
      
      const disciplina = disciplinasMap.get(reactivo.disciplina)!;
      disciplina.totalReactivos++;
      
      if (reactivo.estado === 'activo') disciplina.activos++;
      if (reactivo.estado === 'finalizado') disciplina.finalizados++;
      if (reactivo.estado === 'vencido') disciplina.vencidos++;
    });
    
    return Array.from(disciplinasMap.values()).sort((a, b) => 
      b.activos - a.activos || b.totalReactivos - a.totalReactivos
    );
  };

  // Obtener lista única de disciplinas de los activos
  const obtenerDisciplinas = () => {
    const disciplinas = new Set(reactivosActivos.map(r => r.disciplina));
    return Array.from(disciplinas).sort();
  };

  // Obtener lista única de usuarios de los activos
  const obtenerUsuarios = () => {
    const usuarios = new Set(reactivosActivos.map(r => r.puestoEnUsoPor));
    return Array.from(usuarios).sort();
  };

  // Filtrar reactivos - Por defecto solo activos
  const reactivosFiltrados = reactivosEnUso.filter(reactivo => {
    // Primero aplicar filtro de estado - por defecto solo activos
    const coincideEstado = 
      filtroEstado === 'todos' || reactivo.estado === filtroEstado;
    
    // Si no coincide con el filtro de estado, no mostrar
    if (!coincideEstado) return false;
    
    // Filtro por búsqueda
    const coincideBusqueda = 
      searchTerm === '' ||
      reactivo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reactivo.lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reactivo.proyecto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reactivo.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por disciplina
    const coincideDisciplina = 
      filtroDisciplina === 'todas' || reactivo.disciplina === filtroDisciplina;
    
    // Filtro por usuario
    const coincideUsuario = 
      filtroUsuario === 'todos' || reactivo.puestoEnUsoPor === filtroUsuario;
    
    return coincideBusqueda && coincideDisciplina && coincideUsuario;
  });

  // Helper functions
  const mostrarMensaje = (tipo: 'exito' | 'error' | 'info', texto: string, detalle?: string) => {
    setMensaje({ tipo, texto, detalle });
    setTimeout(() => {
      setMensaje(null);
    }, 5000);
  };

  const verDetalles = (reactivo: ReactivoEnUso) => {
    setReactivoSeleccionado(reactivo);
    setMostrarDetalle(true);
  };

  const iniciarFinalizacion = (reactivo: ReactivoEnUso) => {
    if (reactivo.estado !== 'activo') {
      mostrarMensaje('error', 'Solo se pueden finalizar reactivos activos');
      return;
    }
    setReactivoSeleccionado(reactivo);
    setObservacionFinalizacion('');
    setMostrarFinalizar(true);
  };

  const finalizarReactivo = async () => {
    if (!reactivoSeleccionado) return;
    
    try {
      setFinalizando(true);
      
      const reactivoRef = doc(db, 'reactivos_en_uso', reactivoSeleccionado.id);
      
      await updateDoc(reactivoRef, {
        estado: 'finalizado',
        fechaFinalizacion: Timestamp.now(),
        observaciones: observacionFinalizacion || `Finalizado por ${usuarioActual.nombre}`,
        finalizadoPor: usuarioActual.nombre,
        finalizadoPorId: usuarioActual.id,
        actualizadoEn: Timestamp.now()
      });
      
      // Actualizar estado local
      const reactivosActualizados = reactivosEnUso.map(r => 
        r.id === reactivoSeleccionado.id 
          ? { 
              ...r, 
              estado: 'finalizado',
              fechaFinalizacion: Timestamp.now(),
              observaciones: observacionFinalizacion || `Finalizado por ${usuarioActual.nombre}`
            }
          : r
      );
      
      setReactivosEnUso(reactivosActualizados);
      
      // Actualizar lista de activos
      const nuevosActivos = reactivosActualizados.filter(r => r.estado === 'activo');
      setReactivosActivos(nuevosActivos);
      
      mostrarMensaje('exito', `Reactivo ${reactivoSeleccionado.nombre} finalizado correctamente`);
      setMostrarFinalizar(false);
      setReactivoSeleccionado(null);
      
    } catch (error: any) {
      console.error('Error al finalizar reactivo:', error);
      mostrarMensaje('error', 'Error al finalizar el reactivo', error.message);
    } finally {
      setFinalizando(false);
    }
  };

  // Calcular días en uso
  const calcularDiasEnUso = (fechaInicio: Timestamp, fechaFin?: Timestamp) => {
    const inicio = fechaInicio.toDate();
    const fin = fechaFin ? fechaFin.toDate() : new Date();
    const diferenciaMs = fin.getTime() - inicio.getTime();
    return Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
  };

  // Exportar a CSV - Solo activos por defecto
  const exportarCSV = () => {
    const datosAExportar = filtroEstado === 'todos' ? reactivosFiltrados : reactivosFiltrados.filter(r => r.estado === 'activo');
    
    const headers = [
      'Nombre',
      'Disciplina',
      'Lote',
      'Fecha Puesta en Uso',
      'Usuario',
      'Cantidad Utilizada',
      'Unidad',
      'Estado',
      'Días en Uso',
      'Proyecto',
      'Departamento',
      'Observaciones'
    ];
    
    const rows = datosAExportar.map(reactivo => [
      reactivo.nombre,
      reactivo.disciplina,
      reactivo.lote,
      reactivo.fechaPuestaUso.toDate().toLocaleDateString(),
      reactivo.puestoEnUsoPor,
      reactivo.cantidadUtilizada.toString(),
      reactivo.unidadMedida,
      reactivo.estado,
      calcularDiasEnUso(reactivo.fechaPuestaUso, reactivo.fechaFinalizacion).toString(),
      reactivo.proyecto || '',
      reactivo.departamento,
      reactivo.observaciones || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reactivos_activos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarMensaje('exito', 'Datos exportados a CSV correctamente');
  };

  // Cambiar filtro de estado
  const handleEstadoChange = (estado: string) => {
    setFiltroEstado(estado);
    // Las listas de disciplinas y usuarios se recalculan automáticamente en la renderización
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reactivos en uso...</p>
        </div>
      </div>
    );
  }

  const resumenDisciplinas = calcularResumenDisciplinas();
  const disciplinas = filtroEstado === 'activo' ? obtenerDisciplinas() : Array.from(new Set(reactivosEnUso.map(r => r.disciplina))).sort();
  const usuarios = filtroEstado === 'activo' ? obtenerUsuarios() : Array.from(new Set(reactivosEnUso.map(r => r.puestoEnUsoPor))).sort();

  return (
    <div className="p-4 sm:p-6">
      {/* Mensajes */}
      {mensaje && (
        <div className={`mb-4 p-4 rounded-lg ${mensaje.tipo === 'exito' 
          ? 'bg-green-50 text-green-800 border border-green-200' 
          : mensaje.tipo === 'error' 
          ? 'bg-red-50 text-red-800 border border-red-200'
          : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
          <div className="flex items-start">
            {mensaje.tipo === 'exito' ? (
              <CheckCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            ) : mensaje.tipo === 'error' ? (
              <XCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-medium">{mensaje.texto}</p>
              {mensaje.detalle && (
                <p className="text-sm mt-1 opacity-90">{mensaje.detalle}</p>
              )}
            </div>
            <button
              onClick={() => setMensaje(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Reporte de Reactivos en Uso</h1>
            <p className="text-gray-600">
              Seguimiento de reactivos activos por disciplina, lote y usuario responsable
            </p>
          </div>
          <div className="flex gap-2">
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Mostrando solo activos
            </div>
            <button
              onClick={exportarCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Resumen por disciplina - Solo activos por defecto */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Beaker className="w-5 h-5 mr-2" />
            Resumen por Disciplina (Activos)
          </h2>
          <div className="text-sm text-gray-600">
            Total reactivos activos: <span className="font-bold text-green-600">{reactivosActivos.length}</span>
          </div>
        </div>
        
        {resumenDisciplinas.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <Beaker className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-gray-600">No hay reactivos activos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resumenDisciplinas.map((disciplina, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 flex items-center">
                    <Beaker className="w-4 h-4 mr-2" />
                    {disciplina.nombre}
                  </h3>
                  <span className="text-lg font-bold text-blue-600">
                    {disciplina.activos}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total activos:</span>
                    <span className="font-medium text-green-600">{disciplina.activos}</span>
                  </div>
                  {disciplina.finalizados > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Finalizados:</span>
                      <span className="font-medium text-blue-600">{disciplina.finalizados}</span>
                    </div>
                  )}
                  {disciplina.vencidos > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vencidos:</span>
                      <span className="font-medium text-red-600">{disciplina.vencidos}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Total:</span> {disciplina.totalReactivos} reactivos
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="mb-6 bg-white p-4 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar reactivos activos
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Nombre, lote, proyecto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Filtro por disciplina */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Beaker className="w-4 h-4 inline mr-1" />
              Disciplina
            </label>
            <select 
              value={filtroDisciplina}
              onChange={e => setFiltroDisciplina(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="todas">Todas las disciplinas</option>
              {disciplinas.map(disciplina => (
                <option key={disciplina} value={disciplina}>
                  {disciplina}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por estado - Ahora con opción para ver todos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Estado del Reactivo
            </label>
            <select 
              value={filtroEstado}
              onChange={(e) => handleEstadoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="activo">Solo Activos</option>
              <option value="todos">Todos los Estados</option>
              <option value="finalizado">Finalizados</option>
              <option value="vencido">Vencidos</option>
            </select>
          </div>

          {/* Filtro por usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              Usuario Responsable
            </label>
            <select 
              value={filtroUsuario}
              onChange={e => setFiltroUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="todos">Todos los usuarios</option>
              {usuarios.map(usuario => (
                <option key={usuario} value={usuario}>
                  {usuario}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mb-6 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">Estadísticas {filtroEstado === 'activo' ? 'de Reactivos Activos' : ''}</h3>
          <div className="text-sm text-gray-600">
            Mostrando {reactivosFiltrados.length} reactivos
            {filtroEstado === 'activo' && ` (${reactivosActivos.length} activos total)`}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`text-center p-3 rounded-lg ${filtroEstado === 'activo' ? 'bg-green-50 border border-green-200' : 'bg-blue-50'}`}>
            <div className={`text-2xl font-bold ${filtroEstado === 'activo' ? 'text-green-600' : 'text-blue-600'}`}>
              {filtroEstado === 'activo' ? reactivosActivos.length : reactivosEnUso.filter(r => r.estado === 'activo').length}
            </div>
            <div className="text-sm text-gray-600">Activos</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {reactivosEnUso.filter(r => r.estado === 'finalizado').length}
            </div>
            <div className="text-sm text-gray-600">Finalizados</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {reactivosEnUso.filter(r => r.estado === 'vencido').length}
            </div>
            <div className="text-sm text-gray-600">Vencidos</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(reactivosEnUso.map(r => r.disciplina)).size}
            </div>
            <div className="text-sm text-gray-600">Disciplinas</div>
          </div>
        </div>
      </div>

      {/* Tabla de reactivos en uso */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-800">
              Reactivos {filtroEstado === 'activo' ? 'Activos' : filtroEstado === 'todos' ? 'en Uso' : filtroEstado.charAt(0).toUpperCase() + filtroEstado.slice(1)}s
            </h3>
            {filtroEstado === 'activo' && (
              <p className="text-sm text-gray-600 mt-1">
                Reactivos actualmente en uso en el laboratorio
              </p>
            )}
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Ordenados por: </span>
            <span className="font-medium">Fecha de puesta en uso (más reciente primero)</span>
          </div>
        </div>
        
        {reactivosFiltrados.length === 0 ? (
          <div className="text-center py-10">
            <Beaker className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {filtroEstado === 'activo' ? 'No hay reactivos activos' : 'No se encontraron reactivos'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filtroDisciplina !== 'todas' || filtroUsuario !== 'todos'
                ? 'Intenta ajustar tus filtros de búsqueda.'
                : filtroEstado === 'activo' 
                  ? 'Todos los reactivos han sido finalizados o vencidos.'
                  : 'No hay reactivos registrados con esos criterios.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reactivo / Lote
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disciplina
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Puesta en Uso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario Responsable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad / Días en Uso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reactivosFiltrados.map(reactivo => {
                  const diasEnUso = calcularDiasEnUso(
                    reactivo.fechaPuestaUso, 
                    reactivo.fechaFinalizacion
                  );
                  
                  return (
                    <tr key={reactivo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{reactivo.nombre}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            Lote: {reactivo.lote}
                          </div>
                          {reactivo.proyecto && (
                            <div className="text-xs text-blue-600 mt-1">
                              Proyecto: {reactivo.proyecto}
                            </div>
                          )}
                          {reactivo.ubicacion && (
                            <div className="text-xs text-gray-500 mt-1">
                              Ubicación: {reactivo.ubicacion}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {reactivo.disciplina}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {reactivo.fechaPuestaUso.toDate().toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 ml-6">
                          {reactivo.fechaPuestaUso.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          {reactivo.puestoEnUsoPor}
                        </div>
                        <div className="text-xs text-gray-500 ml-6">
                          {reactivo.departamento}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">{reactivo.cantidadUtilizada}</span> {reactivo.unidadMedida}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {diasEnUso} días en uso
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                          reactivo.estado === 'activo' ? 'bg-green-100 text-green-800 border border-green-200' :
                          reactivo.estado === 'finalizado' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {reactivo.estado === 'activo' && <Activity className="w-3 h-3" />}
                          {reactivo.estado}
                          {reactivo.estado === 'finalizado' && reactivo.fechaFinalizacion && (
                            <span className="ml-1 text-xs">
                              ({reactivo.fechaFinalizacion.toDate().toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => verDetalles(reactivo)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm flex items-center gap-2 border border-blue-100"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                            Detalles
                          </button>
                          {reactivo.estado === 'activo' && usuarioActual.rol === 'supervisor' && (
                            <button
                              onClick={() => iniciarFinalizacion(reactivo)}
                              className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 text-sm border border-yellow-100"
                              title="Finalizar reactivo"
                            >
                              Finalizar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {mostrarDetalle && reactivoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Detalle de Reactivo en Uso</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {reactivoSeleccionado.disciplina}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      reactivoSeleccionado.estado === 'activo' ? 'bg-green-100 text-green-800 border border-green-200' :
                      reactivoSeleccionado.estado === 'finalizado' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {reactivoSeleccionado.estado}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMostrarDetalle(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Información básica */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Información del Reactivo</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Nombre:</span>
                      <p className="mt-1 text-gray-900">{reactivoSeleccionado.nombre}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Lote:</span>
                      <p className="mt-1 text-gray-900">{reactivoSeleccionado.lote}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Cantidad utilizada:</span>
                      <p className="mt-1 text-gray-900">
                        {reactivoSeleccionado.cantidadUtilizada} {reactivoSeleccionado.unidadMedida}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Días en uso:</span>
                      <p className="mt-1 text-gray-900">
                        {calcularDiasEnUso(reactivoSeleccionado.fechaPuestaUso, reactivoSeleccionado.fechaFinalizacion)} días
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Fechas */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Fechas</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Puesta en uso:</span>
                      <p className="mt-1 text-gray-900">
                        {reactivoSeleccionado.fechaPuestaUso.toDate().toLocaleDateString()} {reactivoSeleccionado.fechaPuestaUso.toDate().toLocaleTimeString()}
                      </p>
                    </div>
                    {reactivoSeleccionado.fechaFinalizacion && (
                      <div>
                        <span className="font-medium text-gray-600">Finalización:</span>
                        <p className="mt-1 text-gray-900">
                          {reactivoSeleccionado.fechaFinalizacion.toDate().toLocaleDateString()} {reactivoSeleccionado.fechaFinalizacion.toDate().toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                    {reactivoSeleccionado.fechaVencimiento && (
                      <div>
                        <span className="font-medium text-gray-600">Vencimiento:</span>
                        <p className="mt-1 text-gray-900">
                          {reactivoSeleccionado.fechaVencimiento.toDate().toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Usuario y ubicación */}
                <div>
                  <h3 className="font-medium text-gray-700 mb-3">Responsable y Ubicación</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Usuario:</span>
                      <p className="mt-1 text-gray-900">{reactivoSeleccionado.puestoEnUsoPor}</p>
                      <p className="text-gray-500">{reactivoSeleccionado.departamento}</p>
                    </div>
                    {reactivoSeleccionado.proyecto && (
                      <div>
                        <span className="font-medium text-gray-600">Proyecto:</span>
                        <p className="mt-1 text-gray-900">{reactivoSeleccionado.proyecto}</p>
                      </div>
                    )}
                    {reactivoSeleccionado.ubicacion && (
                      <div>
                        <span className="font-medium text-gray-600">Ubicación:</span>
                        <p className="mt-1 text-gray-900">{reactivoSeleccionado.ubicacion}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Observaciones */}
                {reactivoSeleccionado.observaciones && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Observaciones</h3>
                    <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">
                      {reactivoSeleccionado.observaciones}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                {reactivoSeleccionado.estado === 'activo' && usuarioActual.rol === 'supervisor' && (
                  <button
                    onClick={() => {
                      setMostrarDetalle(false);
                      iniciarFinalizacion(reactivoSeleccionado);
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Finalizar Reactivo
                  </button>
                )}
                <button
                  onClick={() => setMostrarDetalle(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Finalización */}
      {mostrarFinalizar && reactivoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Finalizar Reactivo en Uso</h2>
              <p className="mt-2 text-sm text-gray-600">
                ¿Estás seguro de que deseas finalizar el reactivo <span className="font-medium">{reactivoSeleccionado.nombre}</span> (Lote: {reactivoSeleccionado.lote})?
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={observacionFinalizacion}
                  onChange={e => setObservacionFinalizacion(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Reactivo completamente consumido, finalizado proyecto..."
                  rows={3}
                />
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Tiempo en uso: {calcularDiasEnUso(reactivoSeleccionado.fechaPuestaUso)} días</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setMostrarFinalizar(false)}
                disabled={finalizando}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={finalizarReactivo}
                disabled={finalizando}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
              >
                {finalizando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  'Confirmar Finalización'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReporteReactivosEnUso;