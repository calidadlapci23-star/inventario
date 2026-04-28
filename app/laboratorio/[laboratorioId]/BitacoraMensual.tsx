'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from 'lucide-react';

interface Props {
  equipoId: string;
}

interface Registro {
  id: string;
  tareaId: string;
  fecha: string;
  realizadoPor: string;
  tarea: {
    id: string;
    descripcion: string;
    frecuencia: string;
  };
}

// Esta lista se obtendrá de la API en el futuro
const tareasDiariasDesc = [
  "Verificar pipeta / mezclador / hueco de limpieza",
  "Verificar conexión y llenado del depósito de solución limpiadora diluida",
  "Verificar conector de residuos y vaciado de contenedor de desechos",
  "Verificar solución limpiadora de la pipeta",
  "Limpiar tubos de electrodos",
  "Verificar jeringa de muestras / reactivos",
];

export default function BitacoraMensual({ equipoId }: Props) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/laboratorio/registros?equipoId=${equipoId}&year=${year}&month=${month}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRegistros(data);
        } else {
          setRegistros([]);
        }
      })
      .catch(err => {
        console.error(err);
        setRegistros([]);
      })
      .finally(() => setLoading(false));
  }, [equipoId, year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bitácora de Laboratorio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Select value={String(month)} onValueChange={(val) => setMonth(Number(val))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecciona un mes" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {new Date(0, i).toLocaleString('es', { month: 'long' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-[120px]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold sticky left-0 bg-white dark:bg-gray-900">Tarea / Día</TableHead>
                  {days.map(d => (
                    <TableHead key={d} className="text-center">{d}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tareasDiariasDesc.map((descripcion, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium sticky left-0 bg-white dark:bg-gray-900 whitespace-nowrap">{descripcion}</TableCell>
                    {days.map(dia => {
                      const hayRegistro = registros.some(r => {
                        const fechaReg = new Date(r.fecha);
                        return fechaReg.getDate() === dia &&
                               r.tarea.descripcion === descripcion;
                      });
                      return (
                        <TableCell key={dia} className="text-center">
                          {hayRegistro ? (
                            <span className="font-bold text-green-600">R</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
