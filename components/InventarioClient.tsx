
"use client";

import React from 'react';

const InventarioClient = ({ disciplina }: { disciplina: string }) => {
  return (
    <div>
      <p>Inventario para la disciplina: {disciplina}</p>
      {/* Aquí irá el contenido del inventario */}
    </div>
  );
};

export default InventarioClient;
