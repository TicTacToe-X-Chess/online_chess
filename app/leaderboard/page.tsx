'use client';

import { useEffect, useState } from 'react';
import { Trophy, Crown, Medal, Users, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Header } from '@/components/header';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

interface UserPublic {
  id: string;
  pseudo: string;
  created_at: string;
  updated_at: string;
  games_played: number;
  games_won: number;
  rating: number;
  is_online: boolean;
  last_seen: string;
}

interface LeaderboardUser extends UserPublic {
  rank: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    averageRating: 0,
    totalGames: 0,
  });

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // Récupérer tous les utilisateurs triés par rating
      const { data, error } = await supabase
        .from('users_publics') // ← Nom de table corrigé
        .select('*')
        .order('rating', { ascending: false })
        .limit(100); // Top 100 joueurs

      if (error) throw error;

      // Calculer les rangs et les taux de victoire
      const leaderboardData: LeaderboardUser[] = (data || []).map((user, index) => ({
        ...user,
        rank: index + 1,
        winRate: user.games_played > 0 ? Math.round((user.games_won / user.games_played) * 100) : 0,
      }));

      setUsers(leaderboardData);

      // Calculer les statistiques générales
      if (data && data.length > 0) {
        const totalPlayers = data.length;
        const averageRating = Math.round(data.reduce((sum, u) => sum + u.rating, 0) / totalPlayers);
        const totalGames = data.reduce((sum, u) => sum + u.games_played, 0);

        setStats({
          totalPlayers,
          averageRating,
          totalGames,
        });
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Erreur lors du chargement du classement');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-slate-400">#{rank}</span>;
    }
  };

  const getRatingCategory = (rating: number) => {
    if (rating >= 2000) return { name: 'Maître', color: 'text-purple-400' };
    if (rating >= 1800) return { name: 'Expert', color: 'text-blue-400' };
    if (rating >= 1600) return { name: 'Avancé', color: 'text-green-400' };
    if (rating >= 1400) return { name: 'Intermédiaire', color: 'text-yellow-400' };
    return { name: 'Débutant', color: 'text-slate-400' };
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Chargement du classement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Classement Mondial
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            Découvrez les meilleurs joueurs de ChessMaster
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalPlayers.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Joueurs Classés</div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.averageRating}</div>
              <div className="text-sm text-slate-400">Rating Moyen</div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalGames.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Parties Totales</div>
            </CardContent>
          </Card>
        </div>

        {/* Top 3 Podium */}
        {users.length >= 3 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">🏆 Podium</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 2nd Place */}
              <div className="order-1 md:order-1">
                <Card className="glass-effect border-gray-400/30 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">
                      2ème
                    </Badge>
                  </div>
                  <CardContent className="p-6 text-center pt-8">
                    <Avatar className="h-16 w-16 mx-auto mb-4 border-2 border-gray-400">
                      <AvatarFallback className="bg-gray-600 text-white text-xl">
                        {users[1].pseudo.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-white text-lg">{users[1].pseudo}</h3>
                    <div className="text-2xl font-bold text-gray-400 mt-2">{users[1].rating}</div>
                    <div className="text-sm text-slate-400">ELO Rating</div>
                  </CardContent>
                </Card>
              </div>

              {/* 1st Place */}
              <div className="order-1 md:order-2">
                <Card className="glass-effect border-yellow-400/30 relative transform md:scale-110">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border-0 text-lg px-4 py-1">
                      👑 Champion
                    </Badge>
                  </div>
                  <CardContent className="p-6 text-center pt-10">
                    <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-yellow-400">
                      <AvatarFallback className="bg-yellow-600 text-black text-2xl font-bold">
                        {users[0].pseudo.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-white text-xl">{users[0].pseudo}</h3>
                    <div className="text-3xl font-bold text-yellow-400 mt-2">{users[0].rating}</div>
                    <div className="text-sm text-slate-400">ELO Rating</div>
                    <div className="mt-2">
                      <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50">
                        {users[0].winRate}% victoires
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 3rd Place */}
              <div className="order-3 md:order-3">
                <Card className="glass-effect border-amber-600/30 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white border-0">
                      3ème
                    </Badge>
                  </div>
                  <CardContent className="p-6 text-center pt-8">
                    <Avatar className="h-16 w-16 mx-auto mb-4 border-2 border-amber-600">
                      <AvatarFallback className="bg-amber-700 text-white text-xl">
                        {users[2].pseudo.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-bold text-white text-lg">{users[2].pseudo}</h3>
                    <div className="text-2xl font-bold text-amber-600 mt-2">{users[2].rating}</div>
                    <div className="text-sm text-slate-400">ELO Rating</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span>Classement Complet</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Tous les joueurs classés par rating ELO
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Aucun joueur dans le classement pour le moment</p>
                <Link href="/auth">
                  <button className="chess-gradient px-6 py-2 rounded-lg text-white hover:opacity-90">
                    Rejoindre le classement
                  </button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Header du tableau */}
                <div className="grid grid-cols-6 gap-4 p-4 border-b border-white/10 font-semibold text-slate-300 text-sm">
                  <div className="col-span-1">Rang</div>
                  <div className="col-span-2">Joueur</div>
                  <div className="col-span-1 text-center">Parties</div>
                  <div className="col-span-1 text-center">Victoires</div>
                  <div className="col-span-1 text-center">Winrate</div>
                </div>

                {/* Lignes du tableau */}
                <div className="space-y-1">
                  {users.map((user) => {
                    const category = getRatingCategory(user.rating);
                    
                    return (
                      <div
                        key={user.id}
                        className={`grid grid-cols-6 gap-4 p-4 rounded-lg transition-all hover:bg-white/5 ${
                          user.rank <= 3 ? 'bg-white/5 border border-white/10' : 'bg-white/[0.02]'
                        }`}
                      >
                        {/* Rang */}
                        <div className="col-span-1 flex items-center">
                          <div className="flex items-center justify-center w-12">
                            {getRankIcon(user.rank)}
                          </div>
                        </div>

                        {/* Joueur (pseudo + rating) */}
                        <div className="col-span-2 flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-blue-600 text-white font-medium">
                              {user.pseudo.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-white text-lg">{user.pseudo}</h3>
                              {user.is_online && (
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xl font-bold text-white">{user.rating}</span>
                              <span className="text-sm text-slate-400">ELO</span>
                              <span className={`text-sm font-medium ${category.color}`}>
                                {category.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Parties jouées */}
                        <div className="col-span-1 text-center flex flex-col justify-center">
                          <div className="text-lg font-semibold text-white">{user.games_played}</div>
                          <div className="text-xs text-slate-400">parties</div>
                        </div>

                        {/* Victoires */}
                        <div className="col-span-1 text-center flex flex-col justify-center">
                          <div className="text-lg font-semibold text-green-400">{user.games_won}</div>
                          <div className="text-xs text-slate-400">victoires</div>
                        </div>

                        {/* Winrate */}
                        <div className="col-span-1 text-center flex flex-col justify-center">
                          <div className="text-lg font-semibold text-yellow-400">{user.winRate}%</div>
                          <div className="text-xs text-slate-400">winrate</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link 
            href="/" 
            className="text-slate-400 hover:text-blue-400 transition-colors"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}