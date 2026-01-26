
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Producto } from "@/lib/inventario"
import { Badge } from "@/components/ui/badge"

// Define las columnas para la tabla de productos
export const columns: ColumnDef<Producto>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    accessorKey: "disciplina_nombre",
    header: "Disciplina",
  },
  {
    accessorKey: "stock_actual",
    header: "Stock Actual",
    cell: ({ row }) => {
      const stock = parseFloat(row.getValue("stock_actual"))
      const stockMinimo = row.original.stock_minimo;
      const variant = stock <= stockMinimo ? "destructive" : "default";

      return <Badge variant={variant}>{stock}</Badge>
    },
  },
  {
    accessorKey: "stock_minimo",
    header: "Stock Mínimo",
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => {
        const descripcion = row.getValue("descripcion") as string;
        return <div className="w-48 truncate">{descripcion || 'N/A'}</div>
    }
  },
]
