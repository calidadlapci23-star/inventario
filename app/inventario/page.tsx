import ProductoCard from "../../components/cards/ProductoCard";
import { getProductos } from "../../lib/inventario";

export default async function InventarioPage() {
  const productos = await getProductos();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {productos.map((producto) => (
        <ProductoCard key={producto.id} producto={producto} />
      ))}
    </div>
  );
}
