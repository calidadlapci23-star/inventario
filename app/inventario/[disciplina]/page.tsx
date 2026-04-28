
'use client';
import { DISCIPLINAS } from '@/data/data';
import InventarioClient from '@/components/InventarioClient';
import React from 'react';

const DisciplinaPage = ({ params }: { params: Promise<{ disciplina: string }> }) => {
    const { disciplina } = React.use(params);

    if (!disciplina) {
        console.error("Error: el parámetro 'disciplina' es undefined.");
        return <div>Cargando...</div>;
    }

    // Find the current discipline from the URL parameter, ensuring discipline.value is not undefined
    const disciplinaInfo = DISCIPLINAS.find(d => d.value && d.value.toLowerCase() === disciplina.toLowerCase());

    const disciplinaLabel = disciplinaInfo ? disciplinaInfo.label : decodeURIComponent(disciplina);
    const disciplinaEmoji = disciplinaInfo ? disciplinaInfo.emoji : '📁';

    return (
        <div className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="flex items-center mb-6">
                <span className="text-3xl mr-4">{disciplinaEmoji}</span>
                <h1 className="text-3xl font-bold">
                    Inventario de {disciplinaLabel}
                </h1>
            </div>
            <InventarioClient disciplina={disciplina} />
        </div>
    );
};

export default DisciplinaPage;
