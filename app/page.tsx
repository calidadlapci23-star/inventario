'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';

// Función para traducir los códigos de error de Firebase
const getFriendlyErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No se encontró ningún usuario con este correo electrónico.';
    case 'auth/wrong-password':
      return 'La contraseña es incorrecta. Por favor, inténtelo de nuevo.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico no es válido.';
    case 'auth/too-many-requests':
        return 'Acceso bloqueado temporalmente debido a demasiados intentos. Intente más tarde.';
    case 'auth/network-request-failed':
        return 'Error de red. Por favor, verifique su conexión a internet.';
    default:
      return 'Credenciales inválidas o error inesperado. Verifique los datos.';
  }
};

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      // La redirección se maneja en AuthContext
    } catch (err: any) {
      console.error("Login Error:", err); // Log del error original para depuración
      const friendlyMessage = getFriendlyErrorMessage(err.code);
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden">
      {/* Fondo Creativo: Rejilla y Auras */}
      <div 
        className="absolute inset-0 bg-grid-slate-700/[0.05] bg-center"
        style={{ maskImage: 'linear-gradient(to bottom, white, transparent)'}}
      ></div>

      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-[500px] h-[500px] bg-cyan-500/30 rounded-full top-[-10vh] left-[-20vw] filter blur-3xl opacity-40"
          style={{ animation: 'move-aura-1 25s infinite' }}
        ></div>
        <div 
          className="absolute w-[400px] h-[400px] bg-blue-600/30 rounded-full bottom-[-15vh] right-[-10vw] filter blur-3xl opacity-50"
          style={{ animation: 'move-aura-2 30s infinite' }}
        ></div>
         <div 
          className="absolute w-[300px] h-[300px] bg-indigo-500/20 rounded-full bottom-[20vh] left-[15vw] filter blur-3xl opacity-40"
          style={{ animation: 'move-aura-3 20s infinite' }}
        ></div>
      </div>

      {/* Tarjeta de Login Adaptada al Tema Oscuro */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700 p-8 space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/logo.jpg"
                alt="Logo del Laboratorio"
                width={264}
                height={264}
                className="rounded-full shadow-lg border-2 border-slate-700/50"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-100">INVENTARIO</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/50 border border-red-500/30 text-red-300 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 block">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/30 outline-none transition"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 block">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600 text-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/30 outline-none transition pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-cyan-500/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Iniciar Sesión
                  <LogIn size={20} />
                </>
              )}
            </button>

            <div className="text-center text-sm text-gray-400">
              ¿Olvidaste tu contraseña?{' '}
              <a href="#" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Recupérala aquí
              </a>
            </div>
          </form>

          <div className="pt-4 text-center text-sm text-gray-500 border-t border-slate-700">
            © 2026 Laboratorio Clínico. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  );
}