'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client' // CAMBIO
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Filter, Calendar, Download, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface MovimientoConsumo {
  id: string
  fecha: string
  producto_nombre: string
  disciplina_nombre: string
  numero_lote: string
  cantidad: number
  usuario_id: string
  observaciones: string
}

export function HistorialConsumos() {
  const supabase = createClient() // CAMBIO
  const [consumos, setConsumos] = useState<MovimientoConsumo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroFecha, setFiltroFecha] = useState('hoy')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const itemsPorPagina = 10

  useEffect(() => {
    const cargarConsumos = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('movimientos')
          .select(`
            id,
            fecha,
            cantidad,
            usuario_id,
            observaciones,
            lotes:lote_id (
              numero_lote,
              productos:producto_id (
                nombre,
                disciplinas:disciplina_id (nombre)
              )
            )
          `)
          .eq('tipo', 'consumo')
          .order('fecha', { ascending: false })
  
        // Aplicar filtro de fecha
        const hoy = new Date()
        switch (filtroFecha) {
          case 'hoy':
            query = query.eq('fecha', hoy.toISOString().split('T')[0])
            break
          case 'semana':
            const semanaPasada = new Date(hoy)
            semanaPasada.setDate(hoy.getDate() - 7)
            query = query.gte('fecha', semanaPasada.toISOString().split('T')[0])
            break
          case 'mes':
            const mesPasado = new Date(hoy)
            mesPasado.setMonth(hoy.getMonth() - 1)
            query = query.gte('fecha', mesPasado.toISOString().split('T')[0])
            break
        }
  
        const { data, error } = await query
  
        if (error) throw error
  
        const consumosFormateados: MovimientoConsumo[] = (data || []).map(item => ({
          id: item.id,
          fecha: item.fecha,
          producto_nombre: item.lotes?.productos?.nombre || 'Desconocido',
          disciplina_nombre: item.lotes?.productos?.disciplinas?.nombre || 'Sin disciplina',
          numero_lote: item.lotes?.numero_lote || 'Sin lote',
          cantidad: item.cantidad,
          usuario_id: item.usuario_id,
          observaciones: item.observaciones || '',
        }))
  
        setConsumos(consumosFormateados)
      } catch (error) {
        console.error('Error cargando consumos:', error)
      } finally {
        setLoading(false)
      }
    }
    cargarConsumos()
  }, [filtroFecha, supabase]) // CAMBIO: añadir supabase a las dependencias

  const cargarConsumos = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('movimientos')
        .select(`
          id,
          fecha,
          cantidad,
          usuario_id,
          observaciones,
          lotes:lote_id (
            numero_lote,
            productos:producto_id (
              nombre,
              disciplinas:disciplina_id (nombre)
            )
          )
        `)
        .eq('tipo', 'consumo')
        .order('fecha', { ascending: false })

      // Aplicar filtro de fecha
      const hoy = new Date()
      switch (filtroFecha) {
        case 'hoy':
          query = query.eq('fecha', hoy.toISOString().split('T')[0])
          break
        case 'semana':
          const semanaPasada = new Date(hoy)
          semanaPasada.setDate(hoy.getDate() - 7)
          query = query.gte('fecha', semanaPasada.toISOString().split('T')[0])
          break
        case 'mes':
          const mesPasado = new Date(hoy)
          mesPasado.setMonth(hoy.getMonth() - 1)
          query = query.gte('fecha', mesPasado.toISOString().split('T')[0])
          break
      }

      const { data, error } = await query

      if (error) throw error

      const consumosFormateados: MovimientoConsumo[] = (data || []).map(item => ({
        id: item.id,
        fecha: item.fecha,
        producto_nombre: item.lotes?.productos?.nombre || 'Desconocido',
        disciplina_nombre: item.lotes?.productos?.disciplinas?.nombre || 'Sin disciplina',
        numero_lote: item.lotes?.numero_lote || 'Sin lote',
        cantidad: item.cantidad,
        usuario_id: item.usuario_id,
        observaciones: item.observaciones || '',
      }))

      setConsumos(consumosFormateados)
    } catch (error) {
      console.error('Error cargando consumos:', error)
    } finally {
      setLoading(false)
    }
  }

  const consumosFiltrados = consumos.filter(consumo =>
    consumo.producto_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    consumo.numero_lote.toLowerCase().includes(busqueda.toLowerCase()) ||
    consumo.usuario_id.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalPaginas = Math.ceil(consumosFiltrados.length / itemsPorPagina)
  const inicio = (pagina - 1) * itemsPorPagina
  const fin = inicio + itemsPorPagina
  const consumosPaginados = consumosFiltrados.slice(inicio, fin)

  const exportarCSV = () => {
    const headers = ['Fecha', 'Producto', 'Disciplina', 'Lote', 'Cantidad', 'Usuario', 'Observaciones']
    const csvData = consumosFiltrados.map(c => [
      formatDate(c.fecha),
      c.producto_nombre,
      c.disciplina_nombre,
      c.numero_lote,
      c.cantidad,
      c.usuario_id,
      c.observaciones
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `consumos_${filtroFecha}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📋 Historial de Consumos</span>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportarCSV}
              disabled={consumos.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={cargarConsumos}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar consumos..."
                className="pl-10 pr-4 py-2 border rounded-lg"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                className="border rounded-lg px-3 py-2"
                value={filtroFecha}
                onChange={(e) => {
                  setFiltroFecha(e.target.value)
                  setPagina(1)
                }}
              >
                <option value="hoy">Hoy</option>
                <option value="semana">Esta semana</option>
                <option value="mes">Este mes</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Total: {consumosFiltrados.length} consumos
          </div>
        </div>

        {/* Tabla de Consumos */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : consumosPaginados.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay consumos registrados
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 text-left text-sm font-semibold">Fecha</th>
                    <th className="p-3 text-left text-sm font-semibold">Producto</th>
                    <th className="p-3 text-left text-sm font-semibold">Disciplina</th>
                    <th className="p-3 text-left text-sm font-semibold">Lote</th>
                    <th className="p-3 text-left text-sm font-semibold">Cantidad</th>
                    <th className="p-3 text-left text-sm font-semibold">Usuario</th>
                    <th className="p-3 text-left text-sm font-semibold">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {consumosPaginados.map((consumo) => (
                    <tr key={consumo.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="text-sm">{formatDate(consumo.fecha)}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{consumo.producto_nombre}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {consumo.disciplina_nombre}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-mono">{consumo.numero_lote}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{consumo.cantidad}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm truncate max-w-[150px]" title={consumo.usuario_id}>
                          {consumo.usuario_id}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600 truncate max-w-[200px]" title={consumo.observaciones}>
                          {consumo.observaciones}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Mostrando {inicio + 1}-{Math.min(fin, consumosFiltrados.length)} de {consumosFiltrados.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                  >
                    Anterior
                  </Button>
                  <div className="text-sm">
                    Página {pagina} de {totalPaginas}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
