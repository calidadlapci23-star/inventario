"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { Proveedor } from "@/data/schema-proveedores";


export const columns: ColumnDef<Proveedor>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
    ),
  },
  {
    accessorKey: "razon_social",
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Razón Social" />
    ),
  },
  {
    accessorKey: "rfc",
    header: "RFC",
  },
  {
    accessorKey: "giro",
    header: "Giro",
  },
    {
        accessorKey: "telefono",
        header: "Teléfono",
    },
    {
        accessorKey: "contacto",
        header: "Contacto",
    },
    {
        accessorKey: "correo",
        header: "Correo",
    },
    {
        accessorKey: "regimen_fiscal",
        header: "Régimen Fiscal",
    },
    {
        accessorKey: "credito",
        header: "Crédito",
    },
    {
        accessorKey: "contado",
        header: "Contado",
    },
  {
    id: "actions",
    cell: ({ row }) => {
      const proveedor = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(proveedor.id)}
            >
              Copiar ID de Proveedor
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Abrir</DropdownMenuItem>
            <DropdownMenuItem>Editar</DropdownMenuItem>
            <DropdownMenuItem>Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]