import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  organization_id: string;
  full_name: string | null;
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
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    console.log('AuthContext: Initializing session...');
    
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log('AuthContext: Session retrieved:', !!session);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('AuthContext: Error getting session:', err);
        }
        setLoading(false);
      });

    // Listen for auth changes
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
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('AuthContext: No profile found for user (new user)');
        } else {
          console.error('AuthContext: Error fetching profile:', error);
        }
      } else {
        console.log('AuthContext: Profile loaded');
        setProfile(data);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('AuthContext: Exception in fetchProfile:', err);
      }
    } finally {
      fetchProfileInProgress.current = null;
      console.log('AuthContext: Setting loading to false (fetchProfile)');
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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
