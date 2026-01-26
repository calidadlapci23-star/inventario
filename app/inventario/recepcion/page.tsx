import RecepcionForm from '@/app/components/RecepcionForm';

export default function RecepcionPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Nueva Recepción de Inventario</h1>
        <p className="text-gray-600 mb-8">Complete el formulario para registrar un nuevo lote de productos en el sistema.</p>
        <RecepcionForm />
      </div>
    </div>
  );
}
