'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setAuthState({
          user: session.user,
          profile,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          profile: null,
          loading: false,
        });
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setAuthState({
            user: session.user,
            profile,
            loading: false,
          });
        } else {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const signInWithUsername = async (username: string) => {
    try {
      // Create a temporary email based on username
      const email = `${username.toLowerCase()}@chess.local`;
      const password = 'temporary-password-123';

      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError && signInError.message.includes('Invalid login credentials')) {
        // User doesn't exist, create account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: signUpData.user.id,
              username,
              games_played: 0,
              games_won: 0,
              rating: 1200,
              is_online: true,
              last_seen: new Date().toISOString(),
            });

          if (profileError) throw profileError;
        }

        return { success: true, data: signUpData };
      } else if (signInError) {
        throw signInError;
      }

      // Update online status
      if (signInData.user) {
        await supabase
          .from('profiles')
          .update({
            is_online: true,
            last_seen: new Date().toISOString(),
          })
          .eq('id', signInData.user.id);
      }

      return { success: true, data: signInData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      if (authState.user) {
        // Update online status before signing out
        await supabase
          .from('profiles')
          .update({
            is_online: false,
            last_seen: new Date().toISOString(),
          })
          .eq('id', authState.user.id);
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  return {
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    signInWithUsername,
    signOut,
    isAuthenticated: !!authState.user,
  };
}