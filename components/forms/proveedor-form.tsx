"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { addProveedor } from "@/app/inventario/proveedores/actions"
import { proveedorSchema } from "@/data/schema-proveedores"
import { useRouter } from "next/navigation"

export function ProveedorForm() {
  const router = useRouter()
  const form = useForm<z.infer<typeof proveedorSchema>>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
        id: "",
        razon_social: "",
        rfc: "",
        direccion: "",
        giro: "",
        telefono: "",
        contacto: "",
        correo: "",
        regimen_fiscal: "",
        credito: "",
        contado: "X", // Default to "contado"
        inicio_relacion: new Date().toISOString().split('T')[0], // Today's date
        fecha_termino_relacion: "",
        registro: "BQD DIANA TREJO CRUZ", // Default value
    },
  })

  async function onSubmit(data: z.infer<typeof proveedorSchema>) {
    await addProveedor(data)
    router.refresh()
    // Optionally, close the dialog after submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="razon_social"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razón Social</FormLabel>
              <FormControl>
                <Input placeholder="Razón Social" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rfc"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RFC</FormLabel>
              <FormControl>
                <Input placeholder="RFC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Dirección" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="giro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Giro</FormLabel>
              <FormControl>
                <Input placeholder="Giro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="Teléfono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contacto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contacto</FormLabel>
              <FormControl>
                <Input placeholder="Contacto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="correo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo</FormLabel>
              <FormControl>
                <Input placeholder="Correo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="regimen_fiscal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Régimen Fiscal</FormLabel>
              <FormControl>
                <Input placeholder="Régimen Fiscal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  )
}
