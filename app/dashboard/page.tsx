'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Eye, Clock, Trophy, Play, Lock, Globe, Crown, AlertCircle } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Type pour les rooms avec relations et participants
interface RoomWithDetails {
  id: string;
  name: string;
  host_id: string;
  guest_id?: string;
  time_control: string;
  is_private: boolean;
  room_code?: string;
  status: string;
  max_spectators: number;
  created_at: string;
  updated_at: string;
  host: {
    pseudo: string;
  };
  guest?: {
    pseudo: string;
  };
  participants_count: number;
  spectators_count: number;
  user_role?: string;
  can_join_as_player: boolean;
  can_join_as_spectator: boolean;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<any>(null);
  const { ranking, loading: rankingLoading, error: rankingError, getWinRate } = useUserRanking(user?.id || null);
  const [rooms, setRooms] = useState<RoomWithDetails[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [roomsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const supabase = createClient();

  // Récupérer le profil utilisateur
  useEffect(() => {
    async function getUserProfile() {
      if (!user) return;
      
      try {
        console.log('📋 Fetching user profile for:', user.id);
        const { data, error } = await supabase
          .from('user_public')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('❌ Error fetching user profile:', error);
          return;
        }
        
        if (data) {
          console.log('✅ User profile fetched:', data);
          setUserProfile(data);
        }
      } catch (error) {
        console.error('💥 Exception in getUserProfile:', error);
      }
    }

    getUserProfile();
  }, [user, supabase]);

  const fetchRooms = useCallback(async () => {
    try {
      console.log('🔄 Fetching rooms...');
      
      // Modifier la requête pour inclure les statuts "waiting" ET "playing"
      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select(`
          id,
          name,
          host_id,
          guest_id,
          time_control,
          is_private,
          room_code,
          status,
          max_spectators,
          created_at,
          updated_at,
          host:user_public!rooms_host_id_fkey(pseudo),
          guest:user_public!rooms_guest_id_fkey(pseudo)
        `)
        .in('status', ['waiting', 'playing']) 
        .eq('is_private', false)
        .order('created_at', { ascending: false });
        // Suppression de .limit(10)

      if (error) {
        console.error('❌ Supabase rooms error:', error);
        throw error;
      }

      console.log('📊 Raw rooms data:', roomsData);

      // Transformer les données avec logique métier
      const enrichedRooms = await Promise.all(
        (roomsData || []).map(async (room: any) => {
          try {
            // Compter les participants et spectateurs
            const { data: participants, error: participantsError } = await supabase
              .from('room_participants')
              .select('role, user_id')
              .eq('room_id', room.id);

            if (participantsError) {
              console.warn('⚠️ Error fetching participants for room', room.id, participantsError);
            }

            const participantsData = participants || [];
            const spectators_count = participantsData.filter(p => p.role === 'spectator').length;
            const participants_count = participantsData.length;
            const user_role = participantsData.find(p => p.user_id === user?.id)?.role;

            // Logique métier pour déterminer les actions possibles
            const isUserHost = room.host_id === user?.id;
            const hasUserRole = !!user_role;
            const isRoomFull = !!room.guest_id;
            const spectatorsFull = spectators_count >= room.max_spectators;

            const can_join_as_player = !hasUserRole && !isUserHost && !isRoomFull && room.status === 'waiting';
            const can_join_as_spectator = !hasUserRole && !spectatorsFull;

            // Transformer les relations
            return {
              id: room.id,
              name: room.name,
              host_id: room.host_id,
              guest_id: room.guest_id,
              time_control: room.time_control,
              is_private: room.is_private,
              room_code: room.room_code,
              status: room.status,
              max_spectators: room.max_spectators,
              created_at: room.created_at,
              updated_at: room.updated_at,
              host: {
                pseudo: Array.isArray(room.host) ? room.host[0]?.pseudo || 'Inconnu' : room.host?.pseudo || 'Inconnu'
              },
              guest: room.guest ? {
                pseudo: Array.isArray(room.guest) ? room.guest[0]?.pseudo || 'Inconnu' : room.guest?.pseudo || 'Inconnu'
              } : undefined,
              participants_count,
              spectators_count,
              user_role,
              can_join_as_player,
              can_join_as_spectator
            } as RoomWithDetails;
          } catch (roomError) {
            console.error('💥 Error processing room:', room.id, roomError);
            return null;
          }
        })
      );
      
      const validRooms = enrichedRooms.filter(room => room !== null) as RoomWithDetails[];
      console.log('🏠 Enriched rooms:', validRooms.length, 'valid rooms');
      setRooms(validRooms);
    } catch (error) {
      console.error('💥 Error fetching rooms:', error);
      toast.error('Erreur lors du chargement des salles');
    } finally {
      setLoadingRooms(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const fetchAndSubscribe = async () => {
      if (isMounted) {
        await fetchRooms();
      }
      
      // Subscribe to room changes
      const subscription = supabase
        .channel('dashboard-rooms')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'rooms' },
          () => {
            if (isMounted) {
              console.log('🔔 Room change detected, refetching...');
              fetchRooms();
            }
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'room_participants' },
          () => {
            if (isMounted) {
              console.log('🔔 Participant change detected, refetching...');
              fetchRooms();
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    const unsubscribe = fetchAndSubscribe();

    return () => {
      isMounted = false;
      unsubscribe.then(cleanup => cleanup?.());
    };
  }, [fetchRooms, supabase]);

  const joinRoom = async (roomId: string) => {
    console.log('🚀 === JOIN ROOM START ===');
    console.log('🎯 Room ID:', roomId);
    console.log('👤 User Profile:', userProfile);
    console.log('🔄 Current joining state:', joiningRoom);
    console.log('⏰ Timestamp:', new Date().toISOString());

    if (!userProfile) {
      console.log('❌ No user profile, showing error');
      toast.error('Vous devez être connecté pour rejoindre une partie');
      return;
    }

    if (joiningRoom) {
      console.log('⏸️ Already joining a room, ignoring click');
      return;
    }

    setJoiningRoom(roomId);

    try {
      console.log('🔍 Step 1: Checking room availability...');
      
      // Vérifier que la room est toujours disponible
      const { data: roomCheck, error: roomCheckError } = await supabase
        .from('rooms')
        .select('guest_id, status, host_id, name, max_spectators')
        .eq('id', roomId)
        .single();

      console.log('📋 Room check response:', { data: roomCheck, error: roomCheckError });

      if (roomCheckError) {
        console.error('❌ Room check failed:', roomCheckError);
        if (roomCheckError.code === 'PGRST116') {
          toast.error('Cette salle n\'existe plus');
          return;
        }
        throw new Error(`Room check failed: ${roomCheckError.message || 'Unknown error'}`);
      }

      if (!roomCheck) {
        console.log('❌ Room not found');
        toast.error('Cette salle n\'existe plus');
        return;
      }

      if (roomCheck.guest_id) {
        console.log('🚫 Room already has guest:', roomCheck.guest_id);
        toast.error('Cette salle est déjà complète');
        return;
      }

      if (roomCheck.status !== 'waiting') {
        console.log('🚫 Room status is not waiting:', roomCheck.status);
        toast.error('Cette salle n\'est plus en attente');
        return;
      }

      if (roomCheck.host_id === userProfile.id) {
        console.log('🚫 User is host, cannot join own room');
        toast.error('Vous ne pouvez pas rejoindre votre propre salle');
        return;
      }

      console.log('➕ Step 2: Adding participant...');
      
      // Ajouter participant AVANT de mettre à jour la room
      const { data: participantData, error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: userProfile.id,
          role: 'player'
        })
        .select()
        .single();

      console.log('📝 Participant insert response:', { data: participantData, error: participantError });

      if (participantError) {
        if (participantError.code === '23505') {
          console.log('ℹ️ User already participant');
          toast.info('Vous participez déjà à cette partie');
          return;
        }
        console.error('❌ Participant insert failed:', participantError);
        throw new Error(`Failed to add participant: ${participantError.message || 'Unknown error'}`);
      }

      console.log('🔄 Step 3: Updating room...');
      
      // Stratégie 1: Essayer avec une fonction RPC si elle existe
      try {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('join_room_as_player', {
            room_id: roomId,
            player_id: userProfile.id
          });

        console.log('🔧 RPC response:', { data: rpcResult, error: rpcError });

        if (rpcError) {
          throw rpcError;
        }

        if (rpcResult && rpcResult.length > 0 && rpcResult[0].success) {
          console.log('✅ RPC update successful');
        } else {
          throw new Error('RPC returned failure');
        }
      } catch (rpcError) {
        console.log('⚠️ RPC failed, trying direct update:', rpcError);
        
        // Stratégie 2: Mise à jour directe avec politique RLS permissive
        const { data: roomUpdateData, error: roomError } = await supabase
          .from('rooms')
          .update({ 
            guest_id: userProfile.id,
            status: 'playing',
            updated_at: new Date().toISOString()
          })
          .eq('id', roomId)
          .eq('status', 'waiting')
          .is('guest_id', null)
          .select('*')
          .single();

        console.log('📝 Direct room update response:', { data: roomUpdateData, error: roomError });

        if (roomError) {
          console.error('❌ Room update failed, rolling back participant...');
          
          // Rollback - supprimer le participant ajouté
          const { error: rollbackError } = await supabase
            .from('room_participants')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userProfile.id);

          if (rollbackError) {
            console.error('💥 Rollback failed:', rollbackError);
          } else {
            console.log('🔄 Rollback successful');
          }
          
          if (roomError.message?.includes('row-level security')) {
            toast.error('Erreur de permissions. Veuillez réessayer.');
          } else if (roomError.code === 'PGRST116') {
            toast.error('La salle n\'est plus disponible');
          } else {
            toast.error('Impossible de rejoindre cette salle');
          }
          return;
        }

        if (!roomUpdateData) {
          console.error('❌ Room update returned no data');
          // Rollback
          await supabase
            .from('room_participants')
            .delete()
            .eq('room_id', roomId)
            .eq('user_id', userProfile.id);
          
          toast.error('Erreur lors de la mise à jour de la salle');
          return;
        }
      }

      console.log('🎉 Step 4: Success! Redirecting...');
      toast.success('Vous avez rejoint la partie ! 🎯');

      console.log('🔄 Redirecting to room:', `/room/${roomId}`);
      
      // Redirection immédiate avec Next.js router
      router.push(`/room/${roomId}`);

    } catch (error) {
      console.error('💥 Exception in joinRoom:', error);
      
      // Afficher l'erreur avec plus de détails
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('🔍 Detailed error:', errorMessage);
      
      if (errorMessage.includes('row-level security')) {
        toast.error('Erreur de permissions. Contactez l\'administrateur.');
      } else if (errorMessage.includes('Failed to update room')) {
        toast.error('Impossible de mettre à jour la salle. Réessayez.');
      } else {
        toast.error(`Erreur: ${errorMessage}`);
      }
    } finally {
      console.log('🏁 === JOIN ROOM END ===');
      setJoiningRoom(null);
    }
  };

  const joinAsSpectator = async (roomId: string) => {
    console.log('👀 === JOIN AS SPECTATOR START ===');
    
    if (!userProfile) {
      toast.error('Vous devez être connecté pour regarder une partie');
      return;
    }

    if (joiningRoom) {
      console.log('⏸️ Already joining a room, ignoring click');
      return;
    }

    setJoiningRoom(roomId);

    try {
      console.log('🔍 Checking spectator limits...');
      
      // Vérifier les limites de spectateurs
      const { data: spectatorCheck, error: spectatorCheckError } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', roomId)
        .eq('role', 'spectator');

      if (spectatorCheckError) {
        console.error('❌ Spectator check error:', spectatorCheckError);
        throw new Error(`Spectator check failed: ${spectatorCheckError.message}`);
      }

      const room = rooms.find(r => r.id === roomId);
      if (!room) {
        toast.error('Salle introuvable');
        return;
      }

      if (spectatorCheck.length >= room.max_spectators) {
        toast.error(`Cette salle a atteint sa limite de ${room.max_spectators} spectateurs`);
        return;
      }

      console.log('➕ Adding spectator...');
      
      // Ajouter comme spectateur
      const { error } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: userProfile.id,
          role: 'spectator'
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Vous regardez déjà cette partie');
          return;
        }
        console.error('❌ Spectator insert error:', error);
        throw new Error(`Failed to add spectator: ${error.message}`);
      }

      console.log('✅ Successfully joined as spectator');
      toast.success('Vous regardez maintenant cette partie ! 👀');
      
      console.log('🔄 Redirecting to room as spectator:', `/room/${roomId}`);
      
      // Redirection immédiate avec Next.js router
      router.push(`/room/${roomId}`);

    } catch (error) {
      console.error('💥 Exception in joinAsSpectator:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Impossible de rejoindre en tant que spectateur: ${errorMessage}`);
    } finally {
      console.log('🏁 === JOIN AS SPECTATOR END ===');
      setJoiningRoom(null);
    }
  };

  // Filtrer les rooms selon l'onglet sélectionné
  const getFilteredRooms = () => {
    switch (currentTab) {
      case 'available':
        return rooms.filter(room => room.can_join_as_player);
      case 'spectatable':
        return rooms.filter(room => room.can_join_as_spectator && !room.can_join_as_player);
      case 'playing':  // Nouveau filtre
        return rooms.filter(room => room.status === 'playing');
      case 'full':
        return rooms.filter(room => !room.can_join_as_player && !room.can_join_as_spectator);
      case 'my-rooms':
        return rooms.filter(room => room.host_id === userProfile?.id || room.user_role);
      default:
        return rooms;
    }
  };

  // Pagination
  const filteredRooms = getFilteredRooms();
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
  const startIndex = (currentPage - 1) * roomsPerPage;
  const paginatedRooms = filteredRooms.slice(startIndex, startIndex + roomsPerPage);

  // Reset page when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab]);

  const getTimeControlBadgeColor = (timeControl: string) => {
    const time = parseInt(timeControl.split('+')[0]);
    if (time <= 3) return 'bg-red-600/20 text-red-400 border-red-400/50';
    if (time <= 5) return 'bg-orange-600/20 text-orange-400 border-orange-400/50';
    if (time <= 10) return 'bg-blue-600/20 text-blue-400 border-blue-400/50';
    return 'bg-green-600/20 text-green-400 border-green-400/50';
  };

  const getTimeControlLabel = (timeControl: string) => {
    const time = parseInt(timeControl.split('+')[0]);
    if (time <= 3) return 'Bullet';
    if (time <= 10) return 'Blitz';
    return 'Rapide';
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'host': 
        return (
          <span title="Hôte" className="inline-flex">
            <Crown className="h-3 w-3 text-yellow-400" />
          </span>
        );
      case 'player': 
        return (
          <span title="Joueur" className="inline-flex">
            <Play className="h-3 w-3 text-blue-400" />
          </span>
        );
      case 'spectator': 
        return (
          <span title="Spectateur" className="inline-flex">
            <Eye className="h-3 w-3 text-purple-400" />
          </span>
        );
      default: return null;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoomStatusInfo = (room: RoomWithDetails) => {
    if (room.status === 'playing') {
      return {
        color: 'bg-blue-600/20 text-blue-400 border-blue-400/50',
        text: 'En cours',
        icon: <Play className="h-3 w-3" />
      };
    }
    
    if (room.guest_id) {
      return {
        color: 'bg-orange-600/20 text-orange-400 border-orange-400/50',
        text: 'Complète',
        icon: <Users className="h-3 w-3" />
      };
    }
    
    if (room.spectators_count >= room.max_spectators) {
      return {
        color: 'bg-yellow-600/20 text-yellow-400 border-yellow-400/50',
        text: 'Spectateurs pleins',
        icon: <AlertCircle className="h-3 w-3" />
      };
    }

    return {
      color: 'bg-green-600/20 text-green-400 border-green-400/50',
      text: 'Disponible',
      icon: <Play className="h-3 w-3" />
    };
  };

  if (loading || loadingRooms || !userProfile) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Chargement de votre dashboard...</p>
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
            <div className="w-16 h-16 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Accès restreint</h2>
            <p className="text-slate-400 mb-6">Vous devez être connecté pour accéder au dashboard.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/login">
                <Button className="chess-gradient">
                  Se connecter
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="outline" className="border-white/20 hover:bg-white/10">
                  Créer un compte
                </Button>
              </Link>
            </div>
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
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {userProfile?.pseudo?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Bienvenue, {userProfile?.pseudo || user.email} ! 👋
              </h1>
              <p className="text-slate-400">
                Prêt pour une nouvelle partie d'échecs ? Choisissez votre mode de jeu préféré.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-effect border-white/10 hover-lift">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">
                {rankingLoading ? (
                  <div className="animate-pulse bg-slate-600 h-8 w-16 mx-auto rounded"></div>
                ) : (
                  ranking?.elo_rating || 1200
                )}
              </div>
              <div className="text-sm text-slate-400">ELO Rating</div>
              {rankingError && (
                <div className="text-xs text-red-400 mt-1">Erreur de chargement</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="glass-effect border-white/10 hover-lift">
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
          
          <Card className="glass-effect border-white/10 hover-lift">
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
          
          <Card className="glass-effect border-white/10 hover-lift">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">%</span>
                </div>
              </div>
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
          <Card className="glass-effect border-white/10 hover-lift group cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-blue-400 transition-colors">
                <Plus className="h-5 w-5 text-blue-400" />
                <span>Créer une Nouvelle Partie</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Créez une salle publique ou privée et invitez vos amis à jouer
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

          <Card className="glass-effect border-white/10 hover-lift group cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-white group-hover:text-purple-400 transition-colors">
                <Users className="h-5 w-5 text-purple-400" />
                <span>Partie Rapide</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Trouvez un adversaire rapidement pour une partie classique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full border-white/20 hover:bg-white/10" disabled>
                <Users className="mr-2 h-4 w-4" />
                Bientôt Disponible
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Active Rooms with Tabs */}
        <Card className="glass-effect border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Users className="h-5 w-5 text-blue-400" />
              <span>Salles Disponibles</span>
              <Badge variant="outline" className="ml-2 border-blue-400/50 text-blue-400">
                {filteredRooms.length} {filteredRooms.length > 1 ? 'salles' : 'salle'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Rejoignez une partie en attente de joueurs ou regardez en spectateur
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {loadingRooms ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-slate-400">Chargement des salles...</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-slate-600/20 to-slate-700/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Aucune salle disponible</h3>
                <p className="text-slate-400 mb-4">Aucune salle publique n'est disponible pour le moment</p>
                <p className="text-slate-500 text-sm mb-6">Soyez le premier à créer une partie et invitez d'autres joueurs !</p>
                <Link href="/create-room">
                  <Button className="chess-gradient hover:opacity-90">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer la première salle
                  </Button>
                </Link>
              </div>
            ) : (
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 bg-white/5 border border-white/10">
                  <TabsTrigger value="all" className="text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Toutes ({rooms.length})
                  </TabsTrigger>
                  <TabsTrigger value="available" className="text-white data-[state=active]:bg-green-600 data-[state=active]:text-white">
                    Disponibles ({rooms.filter(r => r.can_join_as_player).length})
                  </TabsTrigger>
                  <TabsTrigger value="playing" className="text-white data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                    En Cours ({rooms.filter(r => r.status === 'playing').length})
                  </TabsTrigger>
                  <TabsTrigger value="spectatable" className="text-white data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    Spectateurs ({rooms.filter(r => r.can_join_as_spectator && !r.can_join_as_player).length})
                  </TabsTrigger>
                  <TabsTrigger value="full" className="text-white data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                    Pleines ({rooms.filter(r => !r.can_join_as_player && !r.can_join_as_spectator).length})
                  </TabsTrigger>
                  <TabsTrigger value="my-rooms" className="text-white data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
                    Mes Salles ({rooms.filter(r => r.host_id === userProfile?.id || r.user_role).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={currentTab} className="mt-6">
                  {filteredRooms.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-400">Aucune salle dans cette catégorie</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {paginatedRooms.map((room) => {
                          const isUserHost = room.host_id === userProfile?.id;
                          const hasUserRole = !!room.user_role;
                          const statusInfo = getRoomStatusInfo(room);
                          const isJoining = joiningRoom === room.id;
                          
                          return (
                            <div
                              key={room.id}
                              className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200 group"
                            >
                              <div className="flex items-center space-x-4 flex-1">
                                <Avatar className="h-12 w-12 ring-2 ring-white/10">
                                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                                    {room.host?.pseudo?.charAt(0).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h3 className="font-semibold text-white text-lg truncate">{room.name}</h3>
                                    {hasUserRole && getRoleIcon(room.user_role)}
                                    {room.is_private ? (
                                      <Lock className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                    ) : (
                                      <Globe className="h-4 w-4 text-green-400 flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-3 text-sm flex-wrap gap-1">
                                    <span className="flex items-center text-slate-400">
                                      <Crown className="h-3 w-3 mr-1 text-yellow-400 flex-shrink-0" />
                                      <span className="text-white font-medium truncate max-w-[100px]">
                                        {room.host?.pseudo || 'Inconnu'}
                                      </span>
                                      {isUserHost && <span className="text-blue-400 ml-1">(Vous)</span>}
                                    </span>
                                    <Badge variant="outline" className={`${getTimeControlBadgeColor(room.time_control)} text-xs flex-shrink-0`}>
                                      <Clock className="h-3 w-3 mr-1" />
                                      {room.time_control} • {getTimeControlLabel(room.time_control)}
                                    </Badge>
                                    <span className="flex items-center text-slate-500 text-xs">
                                      <Eye className="h-3 w-3 mr-1 flex-shrink-0" />
                                      {room.spectators_count}/{room.max_spectators} spectateurs
                                    </span>
                                    <span className="text-xs text-slate-500 flex-shrink-0">
                                      {formatTimeAgo(room.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3 flex-shrink-0">
                                <div className="text-center">
                                  <Badge variant="outline" className={`${statusInfo.color} mb-1 text-xs flex items-center space-x-1`}>
                                    {statusInfo.icon}
                                    <span>{statusInfo.text}</span>
                                  </Badge>
                                  <div className="text-xs text-slate-500">
                                    {room.participants_count}/{room.max_spectators + 2}
                                  </div>
                                </div>
                                
                                <div className="flex flex-col space-y-2">
                                  {/* Boutons pour utilisateur non-participant */}
                                  {!hasUserRole && !isUserHost && (
                                    <>
                                      {room.can_join_as_player && (
                                        <Button
                                          size="sm"
                                          onClick={() => joinRoom(room.id)}
                                          className="chess-gradient hover:opacity-90 min-w-[100px] text-xs"
                                          disabled={isJoining}
                                        >
                                          {isJoining ? (
                                            <div className="flex items-center">
                                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
                                              Rejoindre...
                                            </div>
                                          ) : (
                                            <>
                                              <Play className="mr-1 h-3 w-3" />
                                              Rejoindre
                                            </>
                                          )}
                                        </Button>
                                      )}
                                      
                                      {room.can_join_as_spectator && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => joinAsSpectator(room.id)}
                                          className="border-white/20 hover:bg-white/10 min-w-[100px] text-xs"
                                          disabled={isJoining}
                                        >
                                          {isJoining ? (
                                            <div className="flex items-center">
                                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
                                              Regarder...
                                            </div>
                                          ) : (
                                            <>
                                              <Eye className="mr-1 h-3 w-3" />
                                              Regarder
                                            </>
                                          )}
                                        </Button>
                                      )}

                                      {!room.can_join_as_player && !room.can_join_as_spectator && (
                                        <div className="text-center py-2">
                                          <span className="text-xs text-slate-500">Salle pleine</span>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Bouton pour l'hôte */}
                                  {isUserHost && (
                                    <Link href={`/room/${room.id}`}>
                                      <Button
                                        size="sm"
                                        className="chess-gradient hover:opacity-90 min-w-[100px] text-xs"
                                      >
                                        <Crown className="mr-1 h-3 w-3" />
                                        Ma Salle
                                      </Button>
                                    </Link>
                                  )}

                                  {/* Bouton pour un participant existant */}
                                  {hasUserRole && !isUserHost && (
                                    <Link href={`/room/${room.id}`}>
                                      <Button
                                        size="sm"
                                        className="chess-gradient hover:opacity-90 min-w-[100px] text-xs"
                                      >
                                        {room.user_role === 'spectator' ? (
                                          <>
                                            <Eye className="mr-1 h-3 w-3" />
                                            Regarder
                                          </>
                                        ) : (
                                          <>
                                            <Play className="mr-1 h-3 w-3" />
                                            Jouer
                                          </>
                                        )}
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center space-x-2 mt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="border-white/20 hover:bg-white/10"
                          >
                            Précédent
                          </Button>
                          
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className={currentPage === page 
                                  ? "chess-gradient" 
                                  : "border-white/20 hover:bg-white/10"
                                }
                              >
                                {page}
                              </Button>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="border-white/20 hover:bg-white/10"
                          >
                            Suivant
                          </Button>
                        </div>
                      )}

                      <div className="text-center mt-4">
                        <p className="text-sm text-slate-500">
                          Affichage de {startIndex + 1} à {Math.min(startIndex + roomsPerPage, filteredRooms.length)} sur {filteredRooms.length} salles
                        </p>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}