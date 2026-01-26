interface Producto {
  id: number;
  nombre: string;
  stock: number;
}

export default function ProductoCard({ producto }: { producto: Producto }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-bold">{producto.nombre}</h3>
      <p>Stock: {producto.stock}</p>
    </div>
  );
}
