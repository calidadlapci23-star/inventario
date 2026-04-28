'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase'; // Corrected path
import { useRouter, usePathname } from 'next/navigation';

// --- Constantes para rutas --- 
const TIBER_DASHBOARD_PATH = '/TIBER/dashboard';
const INVENTARIO_DASHBOARD_PATH = '/inventario/dashboard';
const LOGIN_PATH = '/';
const TIBER_USER_EMAIL = 'francisco.lapci@gmail.com';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isTiberUser: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const userEmail = user?.email?.toLowerCase();
  const isTiberUser = userEmail === TIBER_USER_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const isAuthPage = pathname === LOGIN_PATH;

    if (!user && !isAuthPage) {
      router.push(LOGIN_PATH);
    } else if (user && isAuthPage) {
      // MODIFICADO: Redirige a TODOS al dashboard de inventario
      console.log('Authenticated, redirecting all users to:', INVENTARIO_DASHBOARD_PATH);
      router.push(INVENTARIO_DASHBOARD_PATH);
    }
  }, [user, loading, pathname, router]); // Se quitó isTiberUser de las dependencias

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // MODIFICADO: Redirección fija al dashboard de inventario para todos tras el login
    console.log('SignIn successful, redirecting all users to:', INVENTARIO_DASHBOARD_PATH);
    router.push(INVENTARIO_DASHBOARD_PATH);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push(LOGIN_PATH); // Redirige explícitamente al login al cerrar sesión
  };

  const value = {
    user,
    loading,
    isTiberUser, // Se mantiene por si se usa en otra parte de la UI
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};