'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ... } from 'firebase/firestore';
import { ... } from 'lucide-react';

// ... todas las importaciones ...

const ReporteStockActual = () => {
  // ... todos los estados y funciones del componente principal ...

  // ... funciones de mensajes, carrito, solicitudes, órdenes, etc. ...

  // ... componentes modales, etc. ...

  return (
    <div className="p-4 sm:p-6">
      {/* ... mensajes, header, tabs, carrito flotante, modales ... */}

      {/* Tabs principales */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4">
          {/* ... botones de productos, solicitudes, ordenes ... */}
          <button
            onClick={() => setActiveTab('recepcion')}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'recepcion' 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ClipboardCheck className="w-4 h-4 inline mr-2" />
            Recepción
          </button>
        </nav>
      </div>

      {/* Contenido de las pestañas */}
      {activeTab === 'productos' && ( ... )}
      {activeTab === 'solicitudes' && ( ... )}
      {activeTab === 'ordenes' && ( ... )}
      {activeTab === 'recepcion' && (
        <RecepcionOrdenesCompra 
          mostrarMensaje={mostrarMensaje}
          ordenesCompra={ordenesCompra}
          setOrdenesCompra={setOrdenesCompra}
          // ... otras props que necesite ...
        />
      )}
    </div>
  );
};

// Componente de recepción
const RecepcionOrdenesCompra = (props) => {
  // ... estado y funciones del componente de recepción ...
  // ... usando props.mostrarMensaje, props.ordenesCompra, etc. ...
  return ( ... );
};

export default ReporteStockActual;