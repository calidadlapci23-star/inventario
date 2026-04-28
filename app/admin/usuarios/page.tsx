'use client';

import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createUser, listUsers } from './actions';

type User = {
  uid: string;
  displayName: string | undefined;
};

const initialState: { message?: string; error?: string } = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      aria-disabled={pending}
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400"
    >
      {pending ? 'Creando...' : 'Crear Usuario'}
    </button>
  );
}

export default function UserManagementPage() {
  const [state, formAction] = useFormState(createUser, initialState);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      const userList = await listUsers();
      if (userList) {
        setUsers(userList);
      }
    }
    fetchUsers();
  }, [state]); // Se actualiza la lista cuando hay un cambio de estado

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestión de Usuarios</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Formulario para añadir nuevos usuarios */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Añadir Nuevo Usuario</h2>
            <form action={formAction} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="username">
                  Nombre de Usuario
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="ej: juanperez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
              {state?.message && <p className="text-sm text-green-600">{state.message}</p>}

              <SubmitButton />
            </form>
          </div>

          {/* Lista de usuarios existentes */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Usuarios Existentes</h2>
            <div className="space-y-4">
              {users.length > 0 ? (
                users.map((user) => (
                  <div key={user.uid} className="p-4 border rounded-lg flex justify-between items-center">
                    <span>{user.displayName || 'Usuario sin nombre'}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Aún no hay usuarios registrados.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
