'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import ProductoCard from '../../components/cards/ProductoCard';
import { getProductos } from '../../lib/inventario';
import Image from 'next/image';
import { AlertCircle, LogIn } from 'lucide-react';

export default function InventarioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(''); // Cambiado de email a username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const data = await getProductos();
          setProductos(data);
        } catch (err) {
          console.error('Error cargando productos:', err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Construir el email a partir del username
      const email = `${username.toLowerCase()}@inventario.app`;
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const errorCode = err.code;
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-email' || errorCode === 'auth/invalid-credential') {
        setError('El usuario o la contraseña son incorrectos.');
      } else {
        setError('Error al iniciar sesión. Por favor, intenta de nuevo.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProductos([]);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo y Encabezado */}
          <div className="text-center mb-8">
            <div className="relative w-96 h-48 mx-auto mb-4">
              <Image
                src="/logo.jpg"
                alt="Logo del Laboratorio"
                layout="fill"
                objectFit="contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Acceso al Sistema de Inventario
            </h1>
            <p className="text-gray-600">
              Inicia sesión para continuar
            </p>
          </div>

          {/* Formulario de Login */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {error && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="username">
                  Nombre de Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="Tu nombre de usuario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                <LogIn className="w-5 h-5" />
                <span>Entrar</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-3xl font-bold text-gray-800">Inventario</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{user.displayName || user.email}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {productos.map((producto) => (
          <ProductoCard key={producto.id} producto={producto} />
        ))}
      </div>
    </div>
  );
}
