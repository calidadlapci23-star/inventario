'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Square, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Tarea, Frecuencia } from '@prisma/client';

interface GroupedTasks {
  [key: string]: Tarea[];
}

interface Props {
  equipoId: string;
}

const frecuenciaLabels: { [key in Frecuencia]: string } = {
  DIARIO: 'Diario',
  SEMANAL: 'Semanal',
  MENSUAL: 'Mensual',
  TRIMESTRAL: 'C/3 Meses',
  SEMESTRAL: 'C/6 Meses',
  ANUAL: 'Anual',
  IRREGULAR: 'Irregular',
};

export default function RegistroMantenimiento({ equipoId }: Props) {
  const [tasks, setTasks] = useState<GroupedTasks>({});
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchTasks() {
      if (!equipoId) return;
      setLoadingTasks(true);
      try {
        const res = await fetch(`/api/laboratorio/tareas?equipoId=${equipoId}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'No se pudieron cargar las tareas');
        }
        const allTasks: Tarea[] = await res.json();

        const grouped = allTasks.reduce((acc, task) => {
          const freq = task.frecuencia;
          if (!acc[freq]) {
            acc[freq] = [];
          }
          acc[freq].push(task);
          return acc;
        }, {} as GroupedTasks);

        setTasks(grouped);
      } catch (error) {
        console.error(error);
        toast({
          title: "Error al cargar tareas",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoadingTasks(false);
      }
    }
    fetchTasks();
  }, [equipoId]);

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(t => t !== taskId) : [...prev, taskId]
    );
  };

  const handleSubmit = async () => {
    if (selectedTasks.length === 0) {
      toast({ title: "Error", description: "Selecciona al menos una tarea.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/mantenimiento/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          tareaIds: selectedTasks,
          realizadoPor: 'JMR', // TODO: Reemplazar con sesión de usuario real
          equipoId,
        }),
      });

      if (res.ok) {
        toast({ title: "Éxito", description: "Registro guardado correctamente." });
        setSelectedTasks([]);
      } else {
        const error = await res.json();
        toast({ title: "Error al guardar", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error de red", description: "No se pudo conectar al servidor.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loadingTasks) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader><CardTitle>Registro de Laboratorio</CardTitle></CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center gap-4">
          <label className="font-medium">Fecha:</label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-[180px]" />
        </div>

        <div className="space-y-6">
          {Object.keys(tasks).length > 0 ? (
            Object.entries(frecuenciaLabels).map(([freq, label]) => 
              tasks[freq] && (
                <MantenimientoSection
                  key={freq}
                  title={label}
                  tasks={tasks[freq]}
                  selected={selectedTasks}
                  toggle={toggleTask}
                />
              )
            )
          ) : (
            <p className="text-center text-gray-500 py-8">No hay tareas de mantenimiento definidas para este equipo.</p>
          )}
        </div>

        <div className="mt-8 text-right">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar Registro'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MantenimientoSection({ title, tasks, selected, toggle }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-800 p-4"><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {tasks.map((task: Tarea) => (
          <div
            key={task.id}
            onClick={() => toggle(task.id)}
            className="flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {selected.includes(task.id) ? (
              <CheckSquare className="text-primary" size={20} />
            ) : (
              <Square className="text-gray-400" size={20} />
            )}
            <span className="text-sm font-medium">{task.descripcion}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
