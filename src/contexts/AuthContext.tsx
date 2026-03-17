import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'staff' | 'superadmin' | 'global_admin';
  organization_id?: string;
  organization_name?: string;
  avatar_url?: string;
  status?: string;
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
    }, 5000); 
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    console.log('AuthContext: Initializing auth listener...');
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('AuthContext: Auth state change:', _event);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email);
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

  const fetchProfile = async (userId: string, userEmail: string | undefined) => {
    if (fetchProfileInProgress.current === userId) return;
    fetchProfileInProgress.current = userId;

    console.log('AuthContext: Fetching profile for:', userId);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*, organizations(name)')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('AuthContext: Error fetching profile:', profileError);
        const basicProfile: UserProfile = {
          id: userId,
          email: userEmail || '',
          role: 'admin',
        };
        setProfile(basicProfile);
      } else {
        // Map to standard object
        let orgName = '';
        if (profileData.organizations) {
            orgName = Array.isArray(profileData.organizations) 
                ? profileData.organizations[0]?.name 
                : (profileData.organizations as any).name;
        }

        // Hardcoded fixes for known IDs if necessary
        if (profileData.organization_id === '9b1462c0-d902-4fdc-9542-7a92f6c28402' || profileData.organization_id === 'ba2087fe-0498-43f4-93dc-bdf9f2f1ce66') {
             orgName = 'tem de tudo';
        }

        const fullProfile: UserProfile = {
          ...profileData,
          organization_name: orgName,
          name: profileData.name || profileData.full_name,
          email: userEmail || profileData.email,
          role: profileData.role || 'admin'
        };
        setProfile(fullProfile);
      }
    } catch (err: any) {
      console.error('AuthContext: Exception in fetchProfile:', err);
    } finally {
      fetchProfileInProgress.current = null;
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
      
      Object.keys(localStorage).forEach(key => {
        if (key.includes('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during sign out:', error);
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
