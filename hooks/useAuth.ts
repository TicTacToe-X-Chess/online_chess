'use client';

import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UserProfile {
  id: string;
  email: string;
  pseudo: string;
  created_at: string;
  last_connection: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Récupérer l'utilisateur actuel
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Récupérer le profil utilisateur
        const { data: profile } = await supabase
          .from('user_public')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setProfile(profile);
      }
      
      setLoading(false);
    };

    getUser();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, fetching profile...');
          
          // Récupérer le profil lors de la connexion
          const { data: profile, error: profileError } = await supabase
            .from('user_public')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          } else {
            console.log('Profile fetched:', profile);
            setProfile(profile);
          }

          // Mettre à jour last_connection
          try {
            await supabase
              .from('user_public')
              .update({ 
                last_connection: new Date().toISOString()
              })
              .eq('id', session.user.id);
          } catch (error) {
            console.error('Error updating last_connection:', error);
          }

          // Redirection automatique vers le dashboard avec un délai
          console.log('Redirecting to dashboard...');
          setTimeout(() => {
            router.push('/dashboard');
            router.refresh(); // Force le refresh de la page
          }, 180000); // Délais de 3 minutes
        }

        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setProfile(null);
          router.push('/');
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    profile,
    loading,
    signOut,
    isAuthenticated: !!user
  };
}