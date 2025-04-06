// src/auth/authUtils.ts
import { supabase } from '../lib/supabase';

type UserRole = 'admin' | 'subscriber' | null;

interface AuthResult {
  success: any;
  user: any;
  role: UserRole;
  session: any;
}

export const checkAuth = async (): Promise<AuthResult> => {
  // Check for admin session first
  const { data: { session: adminSession } } = await supabase.auth.getSession();
  
  if (adminSession) {
    return { 
      success: true,
      user: adminSession.user, 
      role: 'admin',
      session: adminSession
    };
  }

  // Check for subscriber session
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('user');
  
  if (token?.startsWith('sub_') && userData) {
    try {
      const user = JSON.parse(userData);
      return {
        success: true,
        user,
        role: 'subscriber',
        session: null
      };
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }

  return { 
    success: false,
    user: null, 
    role: null,
    session: null
  };
};

export const checkAdminAuth = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

export const signOut = async (role: UserRole) => {
  if (role === 'admin') {
    await supabase.auth.signOut();
  }
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('rememberedEmail');
};