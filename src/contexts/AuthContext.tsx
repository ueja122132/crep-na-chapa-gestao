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
      // Limpeza imediata do estado local para feedback instantâneo
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
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
