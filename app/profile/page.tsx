'use client';

import { useEffect, useState } from 'react';
import { Trophy, User, TrendingUp, Calendar, Award, Target, BarChart3, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Header } from '@/components/header';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  email: string;
  pseudo: string;
  created_at: string;
}

interface UserStats {
  id: string;
  user_id: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  elo_rating: number;
  created_at: string;
}

interface CompleteProfile extends UserProfile {
  stats: UserStats;
  winRate: number;
  lossRate: number;
  rank: number;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<CompleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      fetchProfile();
    }
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Récupérer les données de l'utilisateur avec ses stats
      const { data, error } = await supabase
        .from('user_ranking')
        .select(`
          *,
          user_public!inner(
            id,
            email,
            pseudo,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Calculer le rang de l'utilisateur
      const { data: rankData, error: rankError } = await supabase
        .from('user_ranking')
        .select('elo_rating', { count: 'exact' })
        .gt('elo_rating', data.elo_rating);

      if (rankError) throw rankError;

      const rank = (rankData?.length || 0) + 1;

      // Calculer les taux de victoire et défaite
      const winRate = data.games_played > 0 ? Math.round((data.games_won / data.games_played) * 100) : 0;
      const lossRate = data.games_played > 0 ? Math.round((data.games_lost / data.games_played) * 100) : 0;

      const completeProfile: CompleteProfile = {
        id: data.user_public.id,
        email: data.user_public.email,
        pseudo: data.user_public.pseudo,
        created_at: data.user_public.created_at,
        stats: data,
        winRate,
        lossRate,
        rank,
      };

      setProfile(completeProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const getRatingCategory = (rating: number) => {
    if (rating >= 2000) return { name: 'Maître', color: 'text-purple-400', bg: 'bg-purple-500/20' };
    if (rating >= 1800) return { name: 'Expert', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (rating >= 1600) return { name: 'Avancé', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (rating >= 1400) return { name: 'Intermédiaire', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { name: 'Débutant', color: 'text-slate-400', bg: 'bg-slate-500/20' };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Profil introuvable</h2>
            <p className="text-slate-400 mb-6">Impossible de charger votre profil.</p>
            <Link href="/dashboard">
              <button className="chess-gradient px-6 py-2 rounded-lg text-white hover:opacity-90">
                Retour au Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const category = getRatingCategory(profile.stats.elo_rating);

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header du profil */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Dashboard
          </Link>
          
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="h-24 w-24 border-4 border-blue-400">
              <AvatarFallback className="bg-blue-600 text-white text-3xl font-bold">
                {profile.pseudo.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{profile.pseudo}</h1>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className={`${category.bg} ${category.color} border-0 text-sm px-3 py-1`}>
                  {category.name}
                </Badge>
                <Badge variant="outline" className="border-blue-400/50 text-blue-400">
                  #{profile.rank} mondial
                </Badge>
                <Badge variant="secondary" className="text-slate-300">
                  <Calendar className="h-3 w-3 mr-1" />
                  Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </Badge>
              </div>
              <p className="text-slate-400">
                {profile.email}
              </p>
            </div>
          </div>
        </div>

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <Trophy className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{profile.stats.elo_rating}</div>
              <div className="text-sm text-slate-400">Rating ELO</div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-10 w-10 text-blue-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{profile.stats.games_played}</div>
              <div className="text-sm text-slate-400">Parties Jouées</div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <Award className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{profile.stats.games_won}</div>
              <div className="text-sm text-slate-400">Victoires</div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <Target className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <div className="text-3xl font-bold text-white mb-1">{profile.stats.games_lost}</div>
              <div className="text-sm text-slate-400">Défaites</div>
            </CardContent>
          </Card>
        </div>

        {/* Détails des performances */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Statistiques détaillées */}
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <span>Performances</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Analyse détaillée de vos résultats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats en grille */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-green-400">{profile.winRate}%</div>
                  <div className="text-sm text-slate-400">Taux de victoire</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-red-400">{profile.lossRate}%</div>
                  <div className="text-sm text-slate-400">Taux de défaite</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-blue-400">#{profile.rank}</div>
                  <div className="text-sm text-slate-400">Rang mondial</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-slate-400">{100 - profile.winRate - profile.lossRate}%</div>
                  <div className="text-sm text-slate-400">Match nuls</div>
                </div>
              </div>

              {/* Informations supplémentaires */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="font-semibold text-white mb-3">Statistiques avancées</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Parties par victoire :</span>
                    <span className="text-white">
                      {profile.stats.games_won > 0 ? (profile.stats.games_played / profile.stats.games_won).toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ELO moyen par partie :</span>
                    <span className="text-white">
                      {profile.stats.games_played > 0 ? Math.round(profile.stats.elo_rating / profile.stats.games_played) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ratio victoires/défaites :</span>
                    <span className="text-white">
                      {profile.stats.games_lost > 0 ? (profile.stats.games_won / profile.stats.games_lost).toFixed(2) : '∞'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progression et niveau */}
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span>Niveau & Progression</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Votre niveau actuel et catégorie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Niveau actuel */}
              <div className="text-center p-6 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${category.bg} mb-4`}>
                  <Trophy className="h-5 w-5" />
                  <span className={`font-bold ${category.color}`}>{category.name}</span>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{profile.stats.elo_rating}</div>
                <div className="text-slate-300">Rating ELO actuel</div>
              </div>

              {/* Objectifs */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Prochains objectifs</h4>
                {profile.stats.elo_rating < 1400 && (
                  <div className="p-3 rounded-lg bg-white/5 border border-yellow-400/30">
                    <div className="text-yellow-400 font-medium">🎯 Niveau Intermédiaire</div>
                    <div className="text-sm text-slate-400">
                      Plus que {1400 - profile.stats.elo_rating} points pour atteindre 1400 ELO
                    </div>
                  </div>
                )}
                {profile.stats.elo_rating >= 1400 && profile.stats.elo_rating < 1600 && (
                  <div className="p-3 rounded-lg bg-white/5 border border-green-400/30">
                    <div className="text-green-400 font-medium">🎯 Niveau Avancé</div>
                    <div className="text-sm text-slate-400">
                      Plus que {1600 - profile.stats.elo_rating} points pour atteindre 1600 ELO
                    </div>
                  </div>
                )}
                {profile.stats.elo_rating >= 1600 && profile.stats.elo_rating < 1800 && (
                  <div className="p-3 rounded-lg bg-white/5 border border-blue-400/30">
                    <div className="text-blue-400 font-medium">🎯 Niveau Expert</div>
                    <div className="text-sm text-slate-400">
                      Plus que {1800 - profile.stats.elo_rating} points pour atteindre 1800 ELO
                    </div>
                  </div>
                )}
                {profile.stats.elo_rating >= 1800 && profile.stats.elo_rating < 2000 && (
                  <div className="p-3 rounded-lg bg-white/5 border border-purple-400/30">
                    <div className="text-purple-400 font-medium">🎯 Niveau Maître</div>
                    <div className="text-sm text-slate-400">
                      Plus que {2000 - profile.stats.elo_rating} points pour atteindre 2000 ELO
                    </div>
                  </div>
                )}
                {profile.stats.elo_rating >= 2000 && (
                  <div className="p-3 rounded-lg bg-white/5 border border-purple-400/30">
                    <div className="text-purple-400 font-medium">👑 Niveau Maître atteint !</div>
                    <div className="text-sm text-slate-400">
                      Félicitations, vous avez atteint le niveau maître !
                    </div>
                  </div>
                )}
              </div>

              {/* Conseils */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="font-semibold text-white mb-2">💡 Conseils pour progresser</h4>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Jouez régulièrement pour maintenir votre niveau</li>
                  <li>• Analysez vos parties perdues pour éviter les erreurs</li>
                  <li>• Variez les adversaires et les styles de jeu</li>
                  {profile.winRate < 50 && <li>• Concentrez-vous sur la défense et la tactique</li>}
                  {profile.stats.games_played < 10 && <li>• Jouez plus de parties pour stabiliser votre ELO</li>}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <div className="mt-8 text-center">
          <div className="flex justify-center">
            <Link href="/leaderboard">
              <button className="border border-white/20 hover:bg-white/10 px-8 py-3 rounded-lg text-white transition-all">
                <Award className="mr-2 h-5 w-5 inline" />
                Voir le Classement
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}