'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Eye, Clock, Copy, Share2, Crown, Play, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Header } from '@/components/header';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { Input } from '@/components/ui/input';
import React from 'react';

// Import dynamique pour éviter les erreurs SSR
const Chessboard = dynamic(() => import('react-chessboard').then(mod => mod.Chessboard), {
  ssr: false,
  loading: () => (
    <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center">
      <div className="text-slate-800 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-2"></div>
        <div>Chargement de l'échiquier...</div>
      </div>
    </div>
  )
});

interface UserProfile {
  id: string;
  pseudo: string;
  email: string;
  created_at: string;
  last_connection: string;
  country?: string;
}

interface SimpleUserData {
  id: string;
  pseudo: string;
  email: string;
}

interface RoomParticipant {
  id: string;
  role: 'host' | 'player' | 'spectator';
  joined_at: string;
  user: UserProfile;
}

interface RoomData {
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
  host?: SimpleUserData;
  guest?: SimpleUserData;
}

interface ChatMessage {
  id: string;
  game_id: string;
  id_sender: string;
  content: string;
  created_at: string;
  sender: {
    pseudo: string;
  } | null;
}

export default function RoomPage() {

  const [finPartie, setFinPartie] = React.useState<{
    open: boolean;
    result: null | 'checkmate' | 'draw' | 'stalemate' | 'timeout' | 'resign';
    winner: null | 'white' | 'black';
  }>({
    open: false,
    result: null,
    winner: null,
  });

  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const roomId = params.id as string;
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [joiningRoom, setJoiningRoom] = useState(false);
  
  // État du jeu d'échecs
  const [game, setGame] = useState(new Chess());
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [gameStarted, setGameStarted] = useState(false);
  
  // ✅ AJOUT : États du chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatSubscriptionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // ✅ AJOUT : États pour la synchronisation des mouvements
  const gameSubscriptionRef = useRef<any>(null);
  const currentFenRef = useRef<string>('');
  
  const supabase = createClient();

  console.log('🏠 Room Page - Room ID from params:', roomId);
  console.log('📊 Current user:', user?.id);

  // ✅ FONCTION UTILITAIRE : Garantir que l'historique est toujours un tableau valide
  const ensureGameHistoryArray = (history: any): string[] => {
    if (!history) return [];
    if (Array.isArray(history)) return history.filter(move => typeof move === 'string');
    return [];
  };

  // Récupérer le profil utilisateur
  useEffect(() => {
    async function getUserProfile() {
      if (!user) return;
      
      try {
        console.log('👤 Fetching user profile...');
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
          console.log('✅ User profile loaded:', data);
          setUserProfile(data);
        }
      } catch (error) {
        console.error('💥 Exception in getUserProfile:', error);
      }
    }

    getUserProfile();
  }, [user, supabase]);

  useEffect(() => {
    if (!roomId) {
      console.error('❌ No room ID provided');
      return;
    }

    console.log('🔍 Starting to fetch room data for ID:', roomId);

    // ✅ CORRECTION : Nettoyer d'abord toutes les subscriptions existantes
    const cleanup = () => {
      if (chatSubscriptionRef.current) {
        console.log('🧹 Cleaning up chat subscription');
        chatSubscriptionRef.current.unsubscribe();
        chatSubscriptionRef.current = null;
      }
      if (gameSubscriptionRef.current) {
        console.log('🧹 Cleaning up game subscription');
        gameSubscriptionRef.current.unsubscribe();
        gameSubscriptionRef.current = null;
      }
    };

    // Nettoyer avant de commencer
    cleanup();

    const initializeRoom = async () => {
      try {
        // Récupération des infos à l'ouverture de la salle
        await fetchRoom();
        await fetchParticipants();
        await fetchChatMessages();
        
        // ✅ IMPORTANT : Attendre un peu avant de créer les subscriptions
        setTimeout(() => {
          subscribeToChatMessages();
          subscribeToGameMoves();
        }, 500);
        
      } catch (error) {
        console.error('Error initializing room:', error);
      }
    };

    initializeRoom();

    // ✅ CORRECTION : Subscription room séparée avec un nom unique
    const roomSubscription = supabase
      .channel(`room-general-${roomId}-${Date.now()}`) // Nom unique
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => {
          console.log('🔔 Room change detected');
          fetchRoom();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
        () => {
          console.log('🔔 Participant change detected');
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      console.log('🧹 Cleaning up all subscriptions on unmount');
      cleanup();
      roomSubscription.unsubscribe();
    };
  }, [roomId]); // ✅ IMPORTANT : Supprimer supabase des dépendances

  // Initialiser le jeu quand les deux joueurs sont présents
  useEffect(() => {
    const initializeGame = async () => {
      if (room && room.host_id && room.guest_id && room.status === 'playing' && !gameStarted) {
        console.log('🎮 Initializing chess game...');
        
        try {
          // Essayer de charger l'état du jeu depuis la base de données
          const { data: gameData, error } = await supabase
            .from('games')
            .select('*')
            .eq('id_game', roomId)
            .maybeSingle(); // ✅ CORRECTION : Utiliser maybeSingle() au lieu de single()

          if (error) {
            console.error('❌ Error loading game state:', error);
            // Créer un nouveau jeu en cas d'erreur
            const newGame = new Chess();
            setGame(newGame);
            setGameHistory([]);
            setCurrentPlayer('white');
            currentFenRef.current = newGame.fen();
          } else if (gameData) {
            // Jeu existant trouvé, charger l'état
            console.log('📋 Loading existing game state:', gameData);
            
            try {
              const loadedGame = new Chess(gameData.current_fen || undefined);
              setGame(loadedGame);
              setGameHistory(ensureGameHistoryArray(gameData.move_history));
              setCurrentPlayer(loadedGame.turn() === 'w' ? 'white' : 'black');
              currentFenRef.current = loadedGame.fen();
              console.log('✅ Game state loaded successfully');
            } catch (fenError) {
              console.error('❌ Invalid FEN in database:', gameData.current_fen);
              // Fallback sur un jeu vide
              const newGame = new Chess();
              setGame(newGame);
              setGameHistory([]);
              setCurrentPlayer('white');
              currentFenRef.current = newGame.fen();
            }
          } else {
            // Aucun jeu trouvé, créer un nouveau jeu
            console.log('� No existing game found, creating new game');
            const newGame = new Chess();
            setGame(newGame);
            setGameHistory([]);
            setCurrentPlayer('white');
            currentFenRef.current = newGame.fen();
            
            // ✅ AJOUT : Créer l'entrée dans la table games maintenant
            try {
              const { error: createError } = await supabase
                .from('games')
                .insert({
                  id_game: roomId,
                  white_player: room.host_id,
                  black_player: room.guest_id,
                  current_fen: newGame.fen(),
                  move_history: [],
                  current_turn: 'w',
                  winner: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (createError) {
                console.error('❌ Error creating game entry:', createError);
              } else {
                console.log('✅ Game entry created successfully');
              }
            } catch (createGameError) {
              console.error('💥 Error creating game entry:', createGameError);
            }
          }
        } catch (error) {
          console.error('💥 Error initializing game:', error);
          // Fallback final
          const newGame = new Chess();
          setGame(newGame);
          setGameHistory([]);
          setCurrentPlayer('white');
          currentFenRef.current = newGame.fen();
        }
        
        setGameStarted(true);
        console.log('🎮 Chess game initialized successfully');
      }
    };

    initializeGame();
  }, [room, gameStarted, roomId, supabase]);

  // Récupération des informations de la salle
  const fetchRoom = async () => {
    try {
      console.log('🏠 Fetching room details...');
      
      const { data, error } = await supabase
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
          host:user_public!rooms_host_id_fkey(id, pseudo, email),
          guest:user_public!rooms_guest_id_fkey(id, pseudo, email)
        `)
        .eq('id', roomId)
        .single();

      console.log('📋 Room fetch response:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          console.error('❌ Room not found');
          toast.error('Cette salle n\'existe pas');
          router.push('/dashboard');
          return;
        }
        throw error;
      }

      if (!data) {
        console.error('❌ No room data returned');
        toast.error('Salle introuvable');
        router.push('/dashboard');
        return;
      }

      // Transformer les données pour gérer les tableaux Supabase
      const roomData: RoomData = {
        id: data.id,
        name: data.name,
        host_id: data.host_id,
        guest_id: data.guest_id,
        time_control: data.time_control,
        is_private: data.is_private,
        room_code: data.room_code,
        status: data.status,
        max_spectators: data.max_spectators,
        created_at: data.created_at,
        updated_at: data.updated_at,
        host: Array.isArray(data.host) ? data.host[0] : data.host,
        guest: data.guest ? (Array.isArray(data.guest) ? data.guest[0] : data.guest) : undefined
      };

      console.log('✅ Room data processed:', roomData);
      setRoom(roomData);
    } catch (error) {
      console.error('💥 Error fetching room:', error);
      toast.error('Erreur lors du chargement de la salle');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Récupération des participants
  const fetchParticipants = async () => {
    try {
      console.log('👥 Fetching participants...');
      
      const { data, error } = await supabase
        .from('room_participants')
        .select(`
          id,
          role,
          joined_at,
          user:user_public!room_participants_user_id_fkey(*)
        `)
        .eq('room_id', roomId);

      if (error) {
        console.error('❌ Error fetching participants:', error);
        return;
      }

      // Transformer les données
      const participantsData = (data || []).map(p => ({
        ...p,
        user: Array.isArray(p.user) ? p.user[0] : p.user
      })) as RoomParticipant[];

      console.log('👥 Participants loaded:', participantsData);
      setParticipants(participantsData);
    } catch (error) {
      console.error('💥 Error fetching participants:', error);
    }
  };

  // Récupération des messages du chat - CORRECTION
  const fetchMessages = async () => {
    try {
      console.log('💬 Fetching chat messages...');
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          game_id,
          id_sender,
          content,
          created_at
        `) // ✅ SUPPRIME la jointure sender:user_public!...
        .eq('game_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching messages:', error);
        return;
      }

      if (!data || data.length === 0) {
        setMessages([]);
        return;
      }

      // ✅ AJOUT : Récupérer tous les pseudos en une seule requête
      const senderIds = Array.from(new Set(data.map(msg => msg.id_sender)));
      
      const { data: usersData } = await supabase
        .from('user_public')
        .select('id, pseudo')
        .in('id', senderIds);

      // Mapping ID → pseudo
      const usersMap: Record<string, string> = {};
      (usersData || []).forEach(user => {
        usersMap[user.id] = user.pseudo;
      });

      // ✅ AJOUT : Enrichir les messages avec les pseudos
      const transformedMessages: ChatMessage[] = data.map((message) => ({
        id: message.id,
        game_id: message.game_id,
        id_sender: message.id_sender,
        content: message.content,
        created_at: message.created_at,
        sender: {
          pseudo: usersMap[message.id_sender] || 'Utilisateur'
        }
      }));

      console.log('💬 Messages loaded:', transformedMessages);
      setMessages(transformedMessages); // ✅ CORRECTION
      
      // Scroll vers le bas après chargement
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('💥 Error fetching messages:', error);
    }
  };

  // ✅ AJOUT : Fonction pour synchroniser un mouvement avec la base de données
  const saveGameMove = async (gameFen: string, moveHistory: string[], currentTurn: 'w' | 'b') => {
    if (!gameStarted || !room) return;

    try {
      console.log('💾 Saving game move:', {
        fen: gameFen,
        history: moveHistory,
        turn: currentTurn
      });

      const { data, error } = await supabase
        .from('games')
        .update({
          current_fen: gameFen,
          move_history: moveHistory,
          current_turn: currentTurn,
          updated_at: new Date().toISOString()
        })
        .eq('id_game', roomId)
        .select();

      if (error) {
        console.error('❌ Error saving game state:', error);
        toast.error('Erreur de synchronisation');
      } else {
        console.log('✅ Game state saved successfully:', data);
      }
    } catch (error) {
      console.error('💥 Error saving game move:', error);
    }
  };

  // ✅ AJOUT : Subscription aux mouvements de jeu
  const subscribeToGameMoves = () => {
    if (gameSubscriptionRef.current) {
      console.log('⚠️ Game subscription already exists, skipping');
      return;
    }

    try {
      const subscription = supabase
        .channel(`game-moves-${roomId}`)
        .on('postgres_changes', {
          event: '*', // ✅ Écouter INSERT et UPDATE
          schema: 'public',
          table: 'games',
          filter: `id_game=eq.${roomId}`
        }, (payload) => {
          console.log('🎮 Game change received:', payload);
          
          try {
            const newGameState = payload.new as any;
            
            console.log('🔍 New game state:', {
              fen: newGameState?.current_fen,
              history: newGameState?.move_history,
              turn: newGameState?.current_turn
            });
            
            // ✅ CORRECTION : Ne mettre à jour que si l'état a vraiment changé
            if (newGameState?.current_fen && newGameState.current_fen !== currentFenRef.current) {
              console.log('🔄 Updating game state from remote');
              console.log('🔄 Old FEN:', currentFenRef.current);
              console.log('🔄 New FEN:', newGameState.current_fen);
              
              try {
                const newGame = new Chess(newGameState.current_fen);
                setGame(newGame);
                setGameHistory(ensureGameHistoryArray(newGameState.move_history));
                setCurrentPlayer(newGame.turn() === 'w' ? 'white' : 'black');
                currentFenRef.current = newGameState.current_fen;
                
                console.log('✅ Game state updated successfully');
                console.log('✅ New turn:', newGame.turn() === 'w' ? 'white' : 'black');
              } catch (chessError) {
                console.error('❌ Invalid FEN received:', newGameState.current_fen, chessError);
              }
            } else {
              console.log('🟡 Game state unchanged, skipping update');
            }
          } catch (error) {
            console.error('❌ Error processing game move:', error);
          }
        })
        .subscribe((status) => {
          console.log('📡 Game subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Game subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Game subscription error');
          }
        });

      gameSubscriptionRef.current = subscription;
    } catch (error) {
      console.error('Error creating game subscription:', error);
    }
  };

  // Fonction pour jouer un coup
  const makeMove = (sourceSquare: string, targetSquare: string) => {
    console.log('🎯 === MOVE ATTEMPT START ===');
    console.log('🎯 Attempting move:', sourceSquare, '->', targetSquare);
    console.log('🎯 Game started:', gameStarted);
    console.log('🎯 Current turn:', game.turn());
    console.log('🎯 Is host:', isHost);
    console.log('🎯 Is guest:', isGuest);
    
    if (!gameStarted) {
      console.log('❌ Game not started yet');
      return false;
    }

    // Vérifier si c'est le tour du joueur
    const isPlayerTurn = 
      (game.turn() === 'w' && isHost) || 
      (game.turn() === 'b' && isGuest);
    
    console.log('🎯 Is player turn:', isPlayerTurn);
    
    if (!isPlayerTurn) {
      console.log('❌ Not player turn');
      toast.error('Ce n\'est pas votre tour !');
      return false;
    }

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) {
        console.log('❌ Invalid move');
        toast.error('Mouvement invalide !');
        return false;
      }

      console.log('✅ Valid move:', move);
      console.log('🎯 New FEN:', gameCopy.fen());
      
      // Mettre à jour l'état local
      const currentHistory = ensureGameHistoryArray(gameHistory);
      const newHistory = [...currentHistory, move.san];
      setGame(gameCopy);
      setGameHistory(newHistory);
      setCurrentPlayer(gameCopy.turn() === 'w' ? 'white' : 'black');
      currentFenRef.current = gameCopy.fen();

      console.log('🎯 Updated local state');
      
      // ✅ AJOUT : Synchroniser avec la base de données
      saveGameMove(gameCopy.fen(), newHistory, gameCopy.turn());

      /* --- Fin de partie --- */
      if (gameCopy.isGameOver()) {
        if (gameCopy.isCheckmate()) {
          setFinPartie({
            open: true,
            result: 'checkmate',
            winner: gameCopy.turn() === 'w' ? 'black' : 'white', // Le gagnant est celui qui n'a pas le tour
          });
        } else if (gameCopy.isDraw()) {
          setFinPartie({
            open: true,
            result: 'draw',
            winner: null,
          });
        } else if (gameCopy.isStalemate()) {
          setFinPartie({
            open: true,
            result: 'stalemate',
            winner: null,
          });
        }
      }

      console.log('🎯 === MOVE ATTEMPT END ===');
      return true;
    } catch (error) {
      console.error('💥 Error making move:', error);
      toast.error('Erreur lors du mouvement');
      return false;
    }
  };

  // Rejoindre en tant que spectateur
  const joinAsSpectator = async () => {
    if (!userProfile || !room || joiningRoom) return;

    setJoiningRoom(true);

    try {
      console.log('👀 Joining as spectator...');
      
      // Vérifier les limites
      const spectators = participants.filter(p => p.role === 'spectator');
      if (spectators.length >= room.max_spectators) {
        toast.error(`Cette salle a atteint sa limite de ${room.max_spectators} spectateurs`);
        return;
      }

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
        throw error;
      }

      toast.success('Vous regardez maintenant cette partie');
      fetchParticipants();
    } catch (error) {
      console.error('💥 Error joining as spectator:', error);
      toast.error('Impossible de rejoindre en tant que spectateur');
    } finally {
      setJoiningRoom(false);
    }
  };

  // Rejoindre en tant que joueur - MODIFICATION
  const joinAsPlayer = async () => {
    if (!userProfile || !room || room.guest_id || joiningRoom) return;

    setJoiningRoom(true);

    try {
      console.log('🎮 Joining as player...');
      
      // Ajouter comme participant
      const { error: participantError } = await supabase
        .from('room_participants')
        .insert({
          room_id: roomId,
          user_id: userProfile.id,
          role: 'player'
        });

      if (participantError) {
        if (participantError.code === '23505') {
          toast.info('Vous participez déjà à cette partie');
          return;
        }
        throw participantError;
      }

      // ✅ MODIFICATION : Ne pas créer l'entrée games ici, cela sera fait lors de l'initialisation du jeu
      // L'entrée sera créée automatiquement quand le jeu s'initialise

      // Mettre à jour la room
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ 
          guest_id: userProfile.id,
          status: 'playing',
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .eq('status', 'waiting')
        .is('guest_id', null);

      if (roomError) {
        // Rollback participant seulement
        await supabase
          .from('room_participants')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userProfile.id);
        throw roomError;
      }

      toast.success('Vous avez rejoint la partie !');
      fetchRoom();
      fetchParticipants();
    } catch (error) {
      console.error('💥 Error joining as player:', error);
      toast.error('Impossible de rejoindre la partie');
    } finally {
      setJoiningRoom(false);
    }
  };

  // Quitter la salle
  const leaveRoom = async () => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', userProfile.id);

      if (error) throw error;

      toast.success('Vous avez quitté la salle');
      router.push('/dashboard');
    } catch (error) {
      console.error('💥 Error leaving room:', error);
      toast.error('Erreur lors de la sortie de la salle');
    }
  };

  // Copie du code d'accès à la salle
  const copyRoomCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code);
      toast.success('Code de la salle copié !');
    }
  };

  // Copie du lien complet de la salle
  const shareRoom = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Lien de la salle copié !');
  };

  // Envoyer un message dans le chat
  const sendMessage = async (content: string) => {
    if (!userProfile || !roomId) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          game_id: roomId,
          id_sender: userProfile.id,
          content
        });

      if (error) {
        console.error('❌ Error sending message:', error);
        toast.error('Erreur lors de l\'envoi du message');
        return;
      }

      toast.success('Message envoyé');
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('💥 Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  // ✅ AJOUT : Fonctions du chat
  const fetchChatMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          game_id,
          id_sender,
          content,
          created_at
        `)
        .eq('game_id', roomId) // Utiliser roomId comme game_id
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setMessages([]);
        return;
      }

      // Récupérer tous les pseudos en une seule requête
      const senderIds = Array.from(new Set(data.map(msg => msg.id_sender)));
      
      const { data: usersData } = await supabase
        .from('user_public')
        .select('id, pseudo')
        .in('id', senderIds);

      // Mapping ID → pseudo
      const usersMap: Record<string, string> = {};
      (usersData || []).forEach(user => {
        usersMap[user.id] = user.pseudo;
      });

      // Enrichir les messages avec les pseudos
      const transformedMessages: ChatMessage[] = data.map((message) => ({
        id: message.id,
        game_id: message.game_id,
        id_sender: message.id_sender,
        content: message.content,
        created_at: message.created_at,
        sender: {
          pseudo: usersMap[message.id_sender] || 'Utilisateur'
        }
      }));

      setMessages(transformedMessages);
      
      // Scroll vers le bas après chargement
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    }
  };

  const subscribeToChatMessages = () => {
    console.log('📡 Setting up chat subscription for room:', roomId);
    
    // ✅ CORRECTION : Vérifier si déjà abonné
    if (chatSubscriptionRef.current) {
      console.log('⚠️ Chat subscription already exists, skipping');
      return;
    }

    try {
      const subscription = supabase
        .channel(`room-chat-${roomId}`) // ✅ Nom stable (sans timestamp)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `game_id=eq.${roomId}`
        }, async (payload) => {
          console.log('💬 New chat message received:', payload);
          
          try {
            // Récupérer le pseudo de l'expéditeur
            const { data: senderData } = await supabase
              .from('user_public')
              .select('pseudo')
              .eq('id', payload.new.id_sender)
              .single();

            const newMessage: ChatMessage = {
              ...payload.new as any,
              sender: senderData ? { pseudo: senderData.pseudo } : { pseudo: 'Utilisateur' }
            };

            console.log('💬 Adding message to state:', newMessage);
            setMessages(prev => [...prev, newMessage]);
            setTimeout(() => scrollToBottom(), 100);
          } catch (error) {
            console.error('Error processing new chat message:', error);
          }
        })
        .subscribe((status) => {
          console.log('📡 Chat subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Chat subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Chat subscription error');
            // Retry après un délai
            setTimeout(() => {
              chatSubscriptionRef.current = null;
              subscribeToChatMessages();
            }, 2000);
          }
        });

      chatSubscriptionRef.current = subscription;
    } catch (error) {
      console.error('Error creating chat subscription:', error);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !userProfile) return;

    setIsSending(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          game_id: roomId, // Utiliser roomId comme game_id
          id_sender: userProfile.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending chat message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getRoleBadge = (senderId: string) => {
    if (senderId === room?.host_id) {
      return <Badge variant="outline" className="text-xs border-yellow-400/50 text-yellow-400">Hôte</Badge>;
    }
    if (senderId === room?.guest_id) {
      return <Badge variant="outline" className="text-xs border-blue-400/50 text-blue-400">Joueur</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-purple-400/50 text-purple-400">Spectateur</Badge>;
  };

  // États et vérifications
  const spectators = participants.filter(p => p.role === 'spectator');
  const userParticipant = participants.find(p => p.user.id === userProfile?.id);
  const isHost = userProfile?.id === room?.host_id;
  const isGuest = userProfile?.id === room?.guest_id;
  const isPlayer = isHost || isGuest;
  const isSpectator = userParticipant?.role === 'spectator';
  const canJoin = !room?.guest_id && !isHost && room?.status === 'waiting' && userProfile && !userParticipant;
  const canSpectate = userProfile && !userParticipant && spectators.length < (room?.max_spectators || 10);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Chargement de la salle...</p>
            <p className="text-slate-500 text-sm mt-2">Room ID: {roomId}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Salle introuvable</h2>
            <p className="text-slate-400 mb-2">Cette salle n'existe pas ou a été supprimée.</p>
            <p className="text-slate-500 text-sm mb-6">Room ID recherché: {roomId}</p>
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

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Dashboard
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {room.name}
              </h1>
              <div className="flex items-center space-x-4 flex-wrap gap-2">
                <Badge 
                  variant="outline"
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
                <Badge variant="outline" className="border-slate-400/50 text-slate-400">
                  <Eye className="h-3 w-3 mr-1" />
                  {spectators.length} spectateur{spectators.length > 1 ? 's' : ''}
                </Badge>
                {gameStarted && (
                  <Badge variant="outline" className="border-green-400/50 text-green-400">
                    🎮 Jeu démarré
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

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Plateau de jeu + historique */}
          <div className="xl:col-span-3">
            {gameStarted && room.host_id && room.guest_id && room.status === 'playing' ? (
              <div className="space-y-4">
                {/* Échiquier */}
                <Card className="glass-effect border-white/10">
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">Tour des:</span>
                        <Badge variant="outline" className={
                          currentPlayer === 'white' 
                            ? 'border-white text-white bg-white/10' 
                            : 'border-slate-800 text-slate-800 bg-slate-800/10'
                        }>
                          {currentPlayer === 'white' ? '⚪ Blancs' : '⚫ Noirs'}
                        </Badge>
                        {isPlayer && (
                          <span className="text-sm text-slate-400">
                            {((currentPlayer === 'white' && isHost) || (currentPlayer === 'black' && isGuest)) 
                              ? '(Votre tour)' 
                              : '(Tour de l\'adversaire)'}
                          </span>
                        )}
                      </div>
                      {game.isCheck() && (
                        <Badge variant="outline" className="border-red-400 text-red-400 bg-red-400/10">
                          ⚠️ Échec !
                        </Badge>
                      )}
                    </div>
                    
                    <div className="aspect-square max-w-2xl mx-auto">
                      <Chessboard
                        position={game.fen()}
                        onPieceDrop={makeMove}
                        boardOrientation={isHost ? 'white' : 'black'}
                        arePiecesDraggable={isPlayer && gameStarted}
                        customBoardStyle={{
                          borderRadius: '8px',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                        }}
                        customDarkSquareStyle={{ backgroundColor: '#779952' }}
                        customLightSquareStyle={{ backgroundColor: '#edeed1' }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Historique des coups */}
                <Card className="glass-effect border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Historique des Coups</span>
                      <Badge variant="outline" className="border-blue-400/50 text-blue-400">
                        {gameHistory.length} coup{gameHistory.length > 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!Array.isArray(gameHistory) || gameHistory.length === 0 ? (
                      <p className="text-slate-400">Aucun coup joué pour l'instant.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-sm max-h-48 overflow-y-auto">
                        {gameHistory.map((move, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 rounded bg-white/5">
                            <span className="text-slate-400 text-xs">
                              {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'}
                            </span>
                            <span className="text-white font-mono">{move}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
                      {room.status === 'waiting' 
                        ? 'En attente d\'un adversaire pour commencer la partie'
                        : 'La partie va commencer...'}
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

          {finPartie.open && (
            <div
              className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50"
              onClick={() => setFinPartie({ open: false, result: null, winner: null })}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="glass-effect border-white/20 w-full max-w-md p-6 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-white text-center text-2xl mb-4">
                  {finPartie.result === 'checkmate' && `🏆 Échec et mat !`}
                  {finPartie.result === 'draw' && `🤝 Match nul`}
                  {finPartie.result === 'stalemate' && `🤝 Pat`}
                  {finPartie.result === 'timeout' && `⌛ Temps écoulé`}
                  {finPartie.result === 'resign' && `✋ Abandon`}
                </h2>
                <p className="text-white text-center mb-6">
                  {(finPartie.result === 'checkmate' || finPartie.result === 'timeout' || finPartie.result === 'resign') && (
                    `Victoire des ${finPartie.winner === 'white' ? 'Blancs ⚪' : 'Noirs ⚫'} !`
                  )}
                  {finPartie.result === 'draw' && 'La partie s’est terminée par un match nul.'}
                  {finPartie.result === 'stalemate' && 'La partie s’est terminée par un pat.'}
                </p>
                <button
                  className="block mx-auto px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  onClick={() => setFinPartie({ open: false, result: null, winner: null })}
                >
                  Fermer
                </button>
              </div>
            </div>
          )}


          {/* Sidebar */}
          <div className="space-y-6">
            {/* Joueurs */}
            <Card className="glass-effect border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span>Joueurs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hôte */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {room.host?.pseudo?.charAt(0).toUpperCase() || 'H'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white">{room.host?.pseudo || 'Hôte'}</span>
                      {isHost && <Badge variant="secondary" className="text-xs">Vous</Badge>}
                      <Crown className="h-3 w-3 text-yellow-400" />
                    </div>
                    <div className="text-sm text-slate-400 flex items-center space-x-2">
                      <span>Hôte • Blancs</span>
                      {gameStarted && currentPlayer === 'white' && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          Son tour
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>

                {/* Invité */}
                {room.guest ? (
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-slate-600 text-white">
                        {room.guest?.pseudo?.charAt(0).toUpperCase() || 'I'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">{room.guest?.pseudo || 'Invité'}</span>
                        {isGuest && <Badge variant="secondary" className="text-xs">Vous</Badge>}
                        <Play className="h-3 w-3 text-blue-400" />
                      </div>
                      <div className="text-sm text-slate-400 flex items-center space-x-2">
                        <span>Invité • Noirs</span>
                        {gameStarted && currentPlayer === 'black' && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            Son tour
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-slate-800 rounded-full border border-white"></div>
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
                  <Button 
                    className="w-full chess-gradient hover:opacity-90"
                    onClick={joinAsPlayer}
                    disabled={joiningRoom}
                  >
                    {joiningRoom ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                        Rejoindre...
                      </div>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Rejoindre la Partie
                      </>
                    )}
                  </Button>
                )}
                
                {canSpectate && (
                  <Button
                    variant="outline"
                    className="w-full border-white/20 hover:bg-white/10"
                    onClick={joinAsSpectator}
                    disabled={joiningRoom}
                  >
                    {joiningRoom ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                        Regarder...
                      </div>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Regarder ({spectators.length})
                      </>
                    )}
                  </Button>
                )}

                {userParticipant && !isHost && (
                  <Button
                    variant="outline"
                    className="w-full border-red-400/50 text-red-400 hover:bg-red-400/10"
                    onClick={leaveRoom}
                  >
                    Quitter la Salle
                  </Button>
                )}

                {!userProfile && (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400 mb-3">
                      Connectez-vous pour rejoindre ou regarder cette partie
                    </p>
                    <Link href="/auth/login">
                      <Button variant="outline" className="border-white/20 hover:bg-white/10">
                        Se connecter
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spectateurs */}
            {spectators.length > 0 && (
              <Card className="glass-effect border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Eye className="h-5 w-5 text-purple-400" />
                    <span>Spectateurs ({spectators.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {spectators.map((spectator) => (
                      <div key={spectator.id} className="flex items-center space-x-2 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={`bg-purple-600 text-white text-xs`}>
                            {spectator.user.pseudo.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white">{spectator.user.pseudo}</span>
                        {spectator.user.id === userProfile?.id && (
                          <Badge variant="secondary" className="text-xs">Vous</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <span className="text-slate-400">Contrôle temps:</span>
                  <span className="text-white">{room.time_control}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Spectateurs max:</span>
                  <span className="text-white">{room.max_spectators}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Participants:</span>
                  <span className="text-white">{participants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Statut:</span>
                  <span className="text-white capitalize">{room.status}</span>
                </div>
                {gameStarted && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coups joués:</span>
                    <span className="text-white">{gameHistory.length}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Chat en temps réel */}
        <div className="mt-8">
          <Card className="glass-effect border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-blue-400" />
                  <span>Chat de la Partie</span>
                </div>
                <Badge variant="outline" className="border-blue-400/50 text-blue-400">
                  {messages.length} message{messages.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {/* Zone d'affichage des messages */}
              <div className="h-48 overflow-y-auto space-y-3 mb-4 pr-2 border rounded-lg bg-white/5 p-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Aucun message pour le moment</p>
                    <p className="text-slate-500 text-xs">Soyez le premier à écrire !</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMyMessage = message.id_sender === userProfile?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start space-x-2 max-w-[80%] ${isMyMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarFallback className={`text-xs ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'}`}>
                              {message.sender?.pseudo?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className={`rounded-lg p-2 break-words ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}>
                            <div className="flex items-center space-x-1 mb-1">
                              <p className="text-xs font-medium">
                                {message.sender?.pseudo || 'Utilisateur'}
                              </p>
                              {getRoleBadge(message.id_sender)}
                            </div>
                            <p className="text-sm break-words">
                              {message.content}
                            </p>
                            <p className={`text-xs mt-1 ${isMyMessage ? 'text-blue-200' : 'text-slate-400'}`}>
                              {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulaire d'envoi de message */}
              {userProfile && userParticipant && (
                <form onSubmit={sendChatMessage} className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Écrivez votre message...`}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400 text-sm"
                    disabled={isSending}
                    maxLength={500}
                  />
                  <Button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    size="sm"
                    className="chess-gradient hover:opacity-90"
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </form>
              )}
              
              {!userProfile && (
                <div className="text-center py-2">
                  <p className="text-xs text-slate-400">
                    Connectez-vous pour participer au chat
                  </p>
                </div>
              )}

              {userProfile && !userParticipant && (
                <div className="text-center py-2">
                  <p className="text-xs text-slate-400">
                    Rejoignez la partie pour participer au chat
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}