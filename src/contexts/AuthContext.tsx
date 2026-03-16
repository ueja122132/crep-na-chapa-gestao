import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  organization_id: string;
  full_name: string | null;
  organizations?: {
    name: string;
  } | { name: string }[];
  role?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fail-safe: force loading false after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn('AuthContext: Loading fail-safe triggered (timeout)');
        setLoading(false);
      }
    }, 3000); // Reduzido para 3 segundos para melhor percepção de velocidade
    return () => clearTimeout(timer);
  }, [loading]);

  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    console.log('AuthContext: Initializing auth listener...');
    
    // Listen for auth changes - This also triggers for the initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('AuthContext: Auth state change:', _event);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfileInProgress = React.useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchProfileInProgress.current === userId) return;
    fetchProfileInProgress.current = userId;

    console.log('AuthContext: Fetching profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, organizations(name)')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('AuthContext: No profile found for user (new user)');
        } else {
          console.error('AuthContext: Error fetching profile:', error);
        }
      } else {
        console.log('AuthContext: Profile loaded', data);
        // Garantir que organizations.name seja acessível mesmo se retornar como array
        if (data && data.organizations && Array.isArray(data.organizations)) {
          data.organization_name = data.organizations[0]?.name;
        } else if (data && data.organizations) {
          data.organization_name = data.organizations.name;
        }

        // Blindagem contra nomes incorretos ou obsoletos
        if (data.organization_id === '9b1462c0-d902-4fdc-9542-7a92f6c28402' || data.organization_id === 'ba2087fe-0498-43f4-93dc-bdf9f2f1ce66') {
           data.organization_name = 'tem de tudo';
        }

        setProfile(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('AuthContext: Exception in fetchProfile:', err);
      }
    } finally {
      fetchProfileInProgress.current = null;
      console.log('AuthContext: Setting loading to false');
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('AuthContext: Signing out...');
    try {
      // Limpeza imediata do estado local
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      // Limpeza física do localStorage para evitar restauração automática pelo Supabase Auth
      // O Supabase usa chaves como 'sb-djzccjezfnxmxvrhhzvb-auth-token'
      Object.keys(localStorage).forEach(key => {
        if (key.includes('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      
      await supabase.auth.signOut();
      
      // Forçar redirecionamento e recarregamento para limpar cache do navegador
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Fallback em caso de erro no signOut do Supabase
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
