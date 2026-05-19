import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  profile: any | null; // PatientProfile
  role: 'administrator' | 'viewer' | 'user' | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
  setRole?: (role: 'administrator' | 'viewer' | 'user' | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [role, setRole] = useState<'administrator' | 'viewer' | 'user' | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setRole(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('PatientProfile')
        .select('*')
        .eq('auth_id', currentUser.id)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
        // Map legacy 'owner' DB value to 'administrator'
        const mappedRole = data.role === 'owner' ? 'administrator' : (data.role || 'user');
        setRole(mappedRole as 'administrator' | 'viewer' | 'user');
      } else {
        setProfile(null);
        setRole('user'); // default to user if no profile
      }
    } catch (e) {
      console.error(e);
      setRole('user');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setIsLoading(true);
        fetchProfile(currentUser);
      } else {
        setProfile(null);
        setRole(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      user, 
      profile,
      role,
      login, 
      logout, 
      isLoading,
      setRole 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
