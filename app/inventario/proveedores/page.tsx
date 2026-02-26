
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

import { columns } from '@/components/columns-proveedores';
import { DataTable } from '@/components/data-table';
import { UserNav } from '@/components/user-nav';
import { proveedores } from '@/data/proveedores';
import { Proveedor, proveedorSchema } from '@/data/schema-proveedores';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProveedorForm } from "@/components/forms/proveedor-form";

async function getProveedores(): Promise<Proveedor[]> {
  // In a real app, you might fetch from an API.
  return proveedores;
}

export default async function ProveedoresPage() {
  const data = await getProveedores();

  return (
    <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Proveedores</h2>
          <p className="text-muted-foreground">
            Gestiona la lista de proveedores.
          </p>
        </div>
        <div className="flex items-center space-x-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button>Agregar Proveedor</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
                        <DialogDescription>
                            Rellena el formulario para agregar un nuevo proveedor.
                        </DialogDescription>
                    </DialogHeader>
                    <ProveedorForm />
                </DialogContent>
            </Dialog>
          <UserNav />
        </div>
      </div>
      <DataTable data={data} columns={columns} />
    </div>
  );
}
