'use client';

import { createClient } from '@/lib/supabase/client';
import { UserRanking } from '@/types/database';
import { useEffect, useState } from 'react';

export function useUserRanking(userId: string | null) {
  const [ranking, setRanking] = useState<UserRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) {
      setRanking(null);
      setLoading(false);
      return;
    }

    const fetchRanking = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('user_ranking')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // Aucun ranking trouvé, créer un nouveau avec les bonnes valeurs par défaut
            console.log('No ranking found, creating default ranking...');
            const { data: newRanking, error: insertError } = await supabase
              .from('user_ranking')
              .insert({
                user_id: userId,
                games_played: 0,
                games_won: 0,
                games_lost: 0,
                elo_rating: 400 // Valeur par défaut corrigée
              })
              .select()
              .single();

            if (insertError) {
              throw insertError;
            }

            setRanking(newRanking);
          } else {
            throw fetchError;
          }
        } else {
          setRanking(data);
        }
      } catch (err: any) {
        console.error('Error fetching/creating user ranking:', err);
        setError(err.message || 'Erreur lors du chargement des statistiques');
        // Valeurs par défaut en cas d'erreur (avec ELO à 400)
        setRanking({
          id: '',
          user_id: userId,
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          elo_rating: 400, // Valeur par défaut corrigée
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();

    // Écouter les changements en temps réel
    const subscription = supabase
      .channel(`user_ranking_${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_ranking',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Ranking updated:', payload);
          if (payload.eventType === 'UPDATE' && payload.new) {
            setRanking(payload.new as UserRanking);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, supabase]);

  // Fonction pour calculer le taux de victoire
  const getWinRate = () => {
    if (!ranking || ranking.games_played === 0) return 0;
    return Math.round((ranking.games_won / ranking.games_played) * 100);
  };

  return {
    ranking,
    loading,
    error,
    getWinRate
  };
}