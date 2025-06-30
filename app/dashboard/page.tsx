'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Eye, Clock, Trophy, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Header } from '@/components/header';
import { useAuth } from '@/hooks/useAuth';
import { useUserRanking } from '@/hooks/useUserRanking';
import { createClient } from '@/lib/supabase/client';
import { Room } from '@/types/database';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const { ranking, loading: rankingLoading, error: rankingError, getWinRate } = useUserRanking(user?.id || null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const supabase = createClient();

  // Récupérer le profil utilisateur
  useEffect(() => {
    async function getUserProfile() {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('user_public')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setUserProfile(data);
      }
    }

    getUserProfile();
  }, [user, supabase]);

  useEffect(() => {
    fetchRooms();
    
    // Subscribe to room changes
    const subscription = supabase
      .channel('rooms')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('status', 'waiting')
          .eq('is_private', false)
          .order('created_at', { ascending: false })
          .limit(10);


      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Erreur lors du chargement des salles');
    } finally {
      setLoadingRooms(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .update({ 
          guest_id: userProfile.id,
          status: 'playing',
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .eq('status', 'waiting')
        .is('guest_id', null);

      if (error) throw error;

      toast.success('Vous avez rejoint la partie !');
      // Redirect to room
      window.location.href = `/rooms/${roomId}`;
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Impossible de rejoindre cette salle');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Accès restreint</h2>
            <p className="text-slate-400 mb-6">Vous devez être connecté pour accéder au dashboard.</p>
            <Link href="/auth/login">
              <Button className="chess-gradient">
                Se connecter
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bienvenue, {userProfile?.pseudo || user.email} !
          </h1>
          <p className="text-slate-400">
            Prêt pour une nouvelle partie d'échecs ?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {rankingLoading ? (
                  <div className="animate-pulse bg-slate-600 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  ranking?.elo_rating || 400
                )}
              </div>
              <div className="text-sm text-slate-400">ELO Rating</div>
              {rankingError && (
                <div className="text-xs text-red-400 mt-1">Erreur de chargement</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <Play className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {rankingLoading ? (
                  <div className="animate-pulse bg-slate-600 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  ranking?.games_played || 0
                )}
              </div>
              <div className="text-sm text-slate-400">Parties Jouées</div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {rankingLoading ? (
                  <div className="animate-pulse bg-slate-600 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  ranking?.games_won || 0
                )}
              </div>
              <div className="text-sm text-slate-400">Victoires</div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-white">
                {rankingLoading ? (
                  <div className="animate-pulse bg-slate-600 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  `${getWinRate()}%`
                )}
              </div>
              <div className="text-sm text-slate-400">Taux de Victoire</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="glass-effect border-white/10 hover-lift group">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Plus className="h-5 w-5 text-blue-400" />
                <span>Créer une Nouvelle Partie</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Créez une salle publique ou privée et invitez vos amis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/create-room">
                <Button className="w-full chess-gradient hover:opacity-90 transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une Room
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-effect border-white/10 hover-lift group">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white">
                <Users className="h-5 w-5 text-purple-400" />
                <span>Rejoindre une Partie</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Trouvez une partie en cours ou rejoignez une salle privée
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-white/20 hover:bg-white/10">
                <Users className="mr-2 h-4 w-4" />
                Parcourir les Salles
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Rooms */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Users className="h-5 w-5 text-blue-400" />
              <span>Salles Disponibles</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Rejoignez une partie en attente de joueurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRooms ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-slate-400">Chargement des salles...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Aucune salle disponible pour le moment</p>
                <Link href="/create-room">
                  <Button className="chess-gradient">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer la première salle
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600 text-white">
                          {(room as any).host?.pseudo?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-white">{room.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          <span>Hôte: {(room as any).host?.pseudo || 'Inconnu'}</span>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {room.time_control}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="border-green-400/50 text-green-400">
                        En attente
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => joinRoom(room.id)}
                        className="chess-gradient hover:opacity-90"
                        disabled={room.host_id === userProfile?.id}
                      >
                        {room.host_id === userProfile?.id ? 'Votre salle' : 'Rejoindre'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}