'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Eye, Clock, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Header } from '@/components/header';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
<<<<<<< HEAD
import { Room, Profile } from '@/types/database';
import { toast } from 'sonner';
import { Chessboard } from 'react-chessboard';
import { useChessEngine } from '@/hooks/useChessEngine';
import Link from 'next/link';

interface RoomWithProfiles extends Room {
  host: Profile;
  guest?: Profile;
}

// Profil hote de test
const hostProfile: Profile = {
  id: 'mock-user-1',
  username: 'Hote',
  avatar_url: undefined,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  games_played: 42,
  games_won: 21,
  rating: 1300,
  is_online: true,
  last_seen: new Date().toISOString()
};

// Profil invité de test
const guestProfile: Profile = {
  id: 'mock-user-2',
  username: 'Invité',
  avatar_url: undefined,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  games_played: 42,
  games_won: 21,
  rating: 1150,
  is_online: true,
  last_seen: new Date().toISOString()
}; 

// Vérification si en développement ou non --> Pour les test
// const isLocalTest = process.env.NODE_ENV === 'development';
const isLocalTest = false;


export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const profile = isLocalTest ? hostProfile : useAuth().profile;
  const roomId = params.id as string;
=======
import { Room, UserProfile } from '@/types/database';
import { toast } from 'sonner';
import Link from 'next/link';

interface RoomWithProfiles extends Room {
  host: UserProfile;
  guest?: UserProfile;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
>>>>>>> feature/login
  const [room, setRoom] = useState<RoomWithProfiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [spectatorCount, setSpectatorCount] = useState(0);

<<<<<<< HEAD
  // Initialisation de l'echiquier
  const {
    fen,
    makeMove,
    resetGame,
    history,
    isGameOver,
    gameReason,
    turn
  } = useChessEngine();
=======
  const roomId = params.id as string;
>>>>>>> feature/login

  useEffect(() => {
    if (!roomId) return;

<<<<<<< HEAD
    // Récupération des infos à l'ouverture de la salle
    fetchRoom();
    
    /* --- Actualisation de la salle a chaque changements en temps réel --- */
=======
    fetchRoom();
    
    // Subscribe to room changes
>>>>>>> feature/login
    const subscription = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
<<<<<<< HEAD
          // Actualisation de la salle
=======
>>>>>>> feature/login
          fetchRoom();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'spectators', filter: `room_id=eq.${roomId}` },
        () => {
<<<<<<< HEAD
          // Actualisation de la salle
=======
>>>>>>> feature/login
          fetchSpectators();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

<<<<<<< HEAD
  /* --- Récupération des informations de la salle --- */
  const fetchRoom = async () => {
    try {
      // Cas de test sans bdd ou avec
      if (isLocalTest) {
        setRoom({
          id: 'room-1',
          name: 'Salle de Test',
          room_code: 'TEST123',
          status: 'finished',
          time_control: '5+3',
          is_private: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          max_spectators: 10,
          host_id: hostProfile.id,
          guest_id: guestProfile.id,
          host: hostProfile,
          guest: guestProfile,
        });
        setSpectatorCount(3);
      } else {
        const { data, error } = await supabase
          .from('rooms')
          .select(`
            *,
            host:profiles!rooms_host_id_fkey(*),
            guest:profiles!rooms_guest_id_fkey(*)
          `)
          .eq('id', roomId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            toast.error('Cette salle n\'existe pas');
            router.push('/dashboard');
            return;
          }
          throw error;
        }

        setRoom(data as RoomWithProfiles);
        fetchSpectators();
      }
=======
  const fetchRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          host:user_public!rooms_host_id_fkey(*),
          guest:user_public!rooms_guest_id_fkey(*)
        `)
        .eq('id', roomId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Cette salle n\'existe pas');
          router.push('/dashboard');
          return;
        }
        throw error;
      }

      setRoom(data as RoomWithProfiles);
      fetchSpectators();
>>>>>>> feature/login
    } catch (error) {
      console.error('Error fetching room:', error);
      toast.error('Erreur lors du chargement de la salle');
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  /* --- Compteur du nombre de spectateurs --- */
=======
>>>>>>> feature/login
  const fetchSpectators = async () => {
    try {
      const { count, error } = await supabase
        .from('spectators')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if (error) throw error;
<<<<<<< HEAD

      setSpectatorCount(isLocalTest ? 3 : (count ?? 0));

=======
      setSpectatorCount(count || 0);
>>>>>>> feature/login
    } catch (error) {
      console.error('Error fetching spectators:', error);
    }
  };

<<<<<<< HEAD
  /* --- Fonction permettant de rejoindre la salle en tant que spectateur --- */
=======
>>>>>>> feature/login
  const joinAsSpectator = async () => {
    if (!profile || !room) return;

    try {
<<<<<<< HEAD
      // En cas de test avec bdd seulement
      if (!isLocalTest) {
        const { error } = await supabase
          .from('spectators')
          .insert({
            room_id: roomId,
            user_id: profile.id,
          });

        // 23505 = Conflit unique --> Utilisateur déja spectateur
        if (error) {
          if (error.code === '23505') {
            toast.info('Vous êtes déjà spectateur de cette partie');
            return;
          }
          throw error;
        }

        toast.success('Vous regardez maintenant cette partie');
      }
=======
      const { error } = await supabase
        .from('spectators')
        .insert({
          room_id: roomId,
          user_id: profile.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Vous êtes déjà spectateur de cette partie');
          return;
        }
        throw error;
      }

      toast.success('Vous regardez maintenant cette partie');
>>>>>>> feature/login
    } catch (error) {
      console.error('Error joining as spectator:', error);
      toast.error('Impossible de rejoindre en tant que spectateur');
    }
  };

<<<<<<< HEAD
  /* --- Copie du code d’accès à la salle --- */
=======
>>>>>>> feature/login
  const copyRoomCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code);
      toast.success('Code de la salle copié !');
    }
  };

<<<<<<< HEAD
  /* --- Copie le lien complet de la salle --- */
=======
>>>>>>> feature/login
  const shareRoom = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Lien de la salle copié !');
  };

<<<<<<< HEAD
  /* --- Chargement de la salle --- */
=======
>>>>>>> feature/login
  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Chargement de la salle...</p>
          </div>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  /* --- Salle introuvable --- */
=======
>>>>>>> feature/login
  if (!room) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Salle introuvable</h2>
            <p className="text-slate-400 mb-6">Cette salle n'existe pas ou a été supprimée.</p>
            <Link href="/dashboard">
              <Button className="chess-gradient">
                Retour au Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  // Vérification des joueurs présents dans la salle
=======
>>>>>>> feature/login
  const isHost = profile?.id === room.host_id;
  const isGuest = profile?.id === room.guest_id;
  const isPlayer = isHost || isGuest;
  const canJoin = !room.guest_id && !isHost && room.status === 'waiting';

<<<<<<< HEAD
  /* --- Contenu HTML --- */
=======
>>>>>>> feature/login
  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {room.name}
              </h1>
              <div className="flex items-center space-x-4">
                <Badge 
                  variant={room.status === 'waiting' ? 'secondary' : room.status === 'playing' ? 'default' : 'outline'}
                  className={
                    room.status === 'waiting' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-400/50' :
                    room.status === 'playing' ? 'bg-green-600/20 text-green-400 border-green-400/50' :
                    'bg-slate-600/20 text-slate-400 border-slate-400/50'
                  }
                >
                  {room.status === 'waiting' ? 'En attente' : 
                   room.status === 'playing' ? 'En cours' : 'Terminée'}
                </Badge>
                <Badge variant="outline" className="border-blue-400/50 text-blue-400">
                  <Clock className="h-3 w-3 mr-1" />
                  {room.time_control}
                </Badge>
                {room.is_private && (
                  <Badge variant="outline" className="border-purple-400/50 text-purple-400">
                    Privée
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {room.is_private && room.room_code && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyRoomCode}
                  className="border-white/20 hover:bg-white/10"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {room.room_code}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={shareRoom}
                className="border-white/20 hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<<<<<<< HEAD
          {/* Block du plateau de jeu + historique */}
          <div className="lg:col-span-2">
            {room.host_id && room.guest_id ? (
              <>
              <div>
                <Chessboard
                  position={fen}
                  onPieceDrop={(sourceSquare, targetSquare) => {
                    const move = makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
                    return move !== null;
                  } } />
              </div>
              <Card className="glass-effect border-white/10 mt-4">
                <CardHeader>
                  <CardTitle className="text-white">Historique des Coups</CardTitle>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <p className="text-slate-400">Aucun coup joué pour l’instant.</p>
                  ) : (
                    <ol className="text-white space-y-1 text-sm list-decimal list-inside">
                      {history.map((move, index) => (
                        <li key={index}>{move}</li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
              </>
            ) : (
              <Card className="glass-effect border-white/10 h-96">
                <CardContent className="p-6 flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Plateau d'Échecs
                    </h3>
                    <p className="text-slate-400 mb-4">
                      Le plateau d'échecs sera affiché ici une fois la partie commencée
                    </p>
                    {room.status === 'waiting' && (
                      <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400 border-yellow-400/50">
                        En attente d'un adversaire...
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          { /* Modale de fin de partie */ }
          {isGameOver && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl w-[90%] max-w-md text-center">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                  Partie terminée
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {turn === 'w' ? 'Victoire des noirs' : 'Victoire des blancs'}
                </p>
                <p>{gameReason}</p>
                <button
                  onClick={resetGame}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
                >
                  Rejouer
                </button>
              </div>
            </div>
          )}

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Joueurs */}
=======
          {/* Game Board Area */}
          <div className="lg:col-span-2">
            <Card className="glass-effect border-white/10 h-96">
              <CardContent className="p-6 flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Plateau d'Échecs
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Le plateau d'échecs sera affiché ici une fois la partie commencée
                  </p>
                  {room.status === 'waiting' && (
                    <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400 border-yellow-400/50">
                      En attente d'un adversaire...
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Players */}
>>>>>>> feature/login
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span>Joueurs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
<<<<<<< HEAD
                {/* Hote */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {room.host.username.charAt(0).toUpperCase()}
=======
                {/* Host */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {room.host.pseudo.charAt(0).toUpperCase()}
>>>>>>> feature/login
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
<<<<<<< HEAD
                      <span className="font-medium text-white">{room.host.username}</span>
                      {isHost && <Badge variant="secondary" className="text-xs">Vous</Badge>}
                    </div>
                    <div className="text-sm text-slate-400">
                      Hôte • {room.host.rating} ELO
=======
                      <span className="font-medium text-white">{room.host.pseudo}</span>
                      {isHost && <Badge variant="secondary" className="text-xs">Vous</Badge>}
                    </div>
                    <div className="text-sm text-slate-400">
                      Hôte
>>>>>>> feature/login
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>

<<<<<<< HEAD
                {/* Invité */}
=======
                {/* Guest */}
>>>>>>> feature/login
                {room.guest ? (
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-600 text-white">
<<<<<<< HEAD
                        {room.guest.username.charAt(0).toUpperCase()}
=======
                        {room.guest.pseudo.charAt(0).toUpperCase()}
>>>>>>> feature/login
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
<<<<<<< HEAD
                        <span className="font-medium text-white">{room.guest.username}</span>
                        {isGuest && <Badge variant="secondary" className="text-xs">Vous</Badge>}
                      </div>
                      <div className="text-sm text-slate-400">
                        Invité • {room.guest.rating} ELO
=======
                        <span className="font-medium text-white">{room.guest.pseudo}</span>
                        {isGuest && <Badge variant="secondary" className="text-xs">Vous</Badge>}
                      </div>
                      <div className="text-sm text-slate-400">
                        Invité
>>>>>>> feature/login
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-black rounded-full"></div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border-2 border-dashed border-white/20">
                    <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <Users className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-slate-400">En attente d'un joueur...</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {canJoin && (
                  <Button className="w-full chess-gradient hover:opacity-90">
                    <Users className="mr-2 h-4 w-4" />
                    Rejoindre la Partie
                  </Button>
                )}
                
                {!isPlayer && (
                  <Button
                    variant="outline"
                    className="w-full border-white/20 hover:bg-white/10"
                    onClick={joinAsSpectator}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Regarder ({spectatorCount})
                  </Button>
                )}

                {room.status === 'waiting' && !canJoin && !isPlayer && (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400">
                      Cette partie est complète ou vous ne pouvez pas la rejoindre
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Room Info */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Créée le:</span>
                  <span className="text-white">
                    {new Date(room.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Spectateurs max:</span>
                  <span className="text-white">{room.max_spectators}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Spectateurs actuels:</span>
                  <span className="text-white">{spectatorCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}