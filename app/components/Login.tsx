'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LogIn, AlertCircle } from 'lucide-react';
import Image from 'next/image';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El componente padre se encargará de la redirección al detectar el cambio de estado
    } catch (error: any) {
      let friendlyMessage = 'Ocurrió un error al iniciar sesión.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          friendlyMessage = 'El correo electrónico o la contraseña son incorrectos.';
          break;
        case 'auth/invalid-email':
          friendlyMessage = 'El formato del correo electrónico no es válido.';
          break;
        case 'auth/too-many-requests':
          friendlyMessage = 'El acceso a esta cuenta ha sido temporalmente deshabilitado. Inténtalo más tarde.';
          break;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="flex justify-center mb-6">
                 <Image 
                    src="/logo.jpg" 
                    alt="Logo" 
                    width={250} 
                    height={125} 
                    className="object-contain" 
                 />
            </div>
            <h2 className="text-center text-3xl font-bold text-gray-800">
                Control de Inventario
            </h2>
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="usuario@ejemplo.com"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="••••••••"
                    />
                </div>
                
                {error && (
                    <div className="flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                        {!loading && <LogIn className="w-5 h-5"/>}
                    </button>
                </div>
            </form>
        </div>
         <footer className="text-center mt-8 text-gray-500">
            <p>&copy; {new Date().getFullYear()} Laboratorio Clínico. Todos los derechos reservados.</p>
        </footer>
    </div>
  );
}