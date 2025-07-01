'use client';

import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

interface GameInfo {
  id_game: string;
  white_player: string;
  black_player: string;
  white_pseudo: string;
  black_pseudo: string;
}

// Détermine le rôle de l'utilisateur dans la partie
const determineUserRole = (gameData: any, userId: string): 'white' | 'black' | 'spectator' => {
  if (gameData.white_player === userId) return 'white';
  if (gameData.black_player === userId) return 'black';
  return 'spectator';
};

export default function ChatTestPage() {
  const { user, loading } = useAuth(); // ✅ Récupérer loading
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [userRole, setUserRole] = useState<'white' | 'black' | 'spectator'>('spectator');
  const [spectatorCount, setSpectatorCount] = useState(0);
  const supabase = createClient();
  
  // Gestion des connexions temps réel et reconnexion automatique
  const subscriptionRef = useRef<any>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');

  const TEST_GAME_ID = '463beb3e-686f-49c9-9264-02d3faef3e75';

  // Gérer la reconnexion automatique lors des changements d'onglets (Alt+Tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      
      if (isVisible && user) {
        console.log('Page redevenue visible, reconnexion...');
        reconnectRealtime();
      } else {
        console.log('Page cachée, nettoyage...');
        cleanupSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupSubscription();
    };
  }, [user]);

  // Vérifier périodiquement que la session utilisateur est toujours valide
  useEffect(() => {
    const checkSession = async () => {
      if (!document.hidden && user) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            console.warn('Session invalide détectée:', error);
            router.push('/auth/login');
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de session:', error);
        }
      }
    };

    const sessionInterval = setInterval(checkSession, 30000);
    return () => clearInterval(sessionInterval);
  }, [router, supabase, user]);

  // Nettoyer proprement les souscriptions Supabase pour éviter les fuites mémoire
  const cleanupSubscription = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
  };

  // Reconnecter le chat temps réel après une déconnexion
  const reconnectRealtime = async () => {
    if (!user || !isPageVisible) return;
    
    setConnectionStatus('reconnecting');
    
    try {
      cleanupSubscription();
      
      // Vérifier que la session est toujours valide avant de reconnecter
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.warn('Session invalide, redirection...');
        router.push('/auth/login');
        return;
      }
      
      // Délai pour éviter les conflits de connexion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      subscribeToMessages();
      await fetchMessages();
      
      console.log('Reconnexion réussie');
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Erreur lors de la reconnexion:', error);
      setConnectionStatus('disconnected');
      
      // Retry automatique après 5 secondes
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          reconnectRealtime();
        }
      }, 5000);
    }
  };

  // Initialisation du chat quand l'utilisateur est connecté
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    initializeTestGame();
    fetchMessages();
    
    // S'abonner aux messages seulement si la page est visible
    if (isPageVisible) {
      subscribeToMessages();
    }
    
    updateSpectatorCount();

    return () => {
      cleanupSubscription();
    };
  }, [user, loading, isPageVisible]);

  // Charger les informations de la partie depuis la base de données
  const initializeTestGame = async () => {
    if (!user?.id) return;

    try {
      const { data: gameData, error: gameQueryError } = await supabase
        .from('games')
        .select(`
          id_game,
          white_player,
          black_player
        `)
        .eq('id_game', TEST_GAME_ID)
        .single();

      if (gameQueryError) {
        console.error('Game not found:', gameQueryError);
        toast.error('Game non trouvée');
        return;
      }

      if (gameData) {
        const role = determineUserRole(gameData, user.id);
        setUserRole(role);

        // Récupérer les pseudos des joueurs pour l'affichage
        const [whitePlayerData, blackPlayerData] = await Promise.all([
          gameData.white_player ? supabase
            .from('user_public')
            .select('pseudo')
            .eq('id', gameData.white_player)
            .single() : { data: null },
          gameData.black_player ? supabase
            .from('user_public')
            .select('pseudo')
            .eq('id', gameData.black_player)
            .single() : { data: null }
        ]);

        setGameInfo({
          id_game: gameData.id_game,
          white_player: gameData.white_player || '',
          black_player: gameData.black_player || '',
          white_pseudo: whitePlayerData.data?.pseudo || 'Joueur Blanc',
          black_pseudo: blackPlayerData.data?.pseudo || 'Joueur Noir'
        });
      }
    } catch (error) {
      console.error('Error loading game:', error);
      toast.error('Erreur lors du chargement de la partie');
    }
  };

  // Générer un nombre aléatoire de spectateurs pour la démo
  const updateSpectatorCount = () => {
    setSpectatorCount(Math.floor(Math.random() * 10) + 1);
  };

  // Charger l'historique des messages avec les pseudos des expéditeurs
  const fetchMessages = async () => {
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
        .eq('game_id', TEST_GAME_ID)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setMessages([]);
        return;
      }

      // Optimisation : récupérer tous les pseudos en une seule requête
      const senderIds = Array.from(new Set(data.map(msg => msg.id_sender)));
      
      const { data: usersData } = await supabase
        .from('user_public')
        .select('id, pseudo')
        .in('id', senderIds);

      // Mapping ID → pseudo pour performance O(1)
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
          pseudo: usersMap[message.id_sender] || 'Utilisateur Test'
        }
      }));

      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  };

  // Écouter les nouveaux messages en temps réel via Supabase Realtime
  const subscribeToMessages = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    const subscription = supabase
      .channel(`chat-${TEST_GAME_ID}-${Date.now()}`) // Nom unique pour éviter les conflits
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `game_id=eq.${TEST_GAME_ID}`
      }, async (payload) => {
        try {
          // Récupérer le pseudo de l'expéditeur du nouveau message
          const { data: senderData } = await supabase
            .from('user_public')
            .select('pseudo')
            .eq('id', payload.new.id_sender)
            .single();

          const newMessage: ChatMessage = {
            ...payload.new as any,
            sender: senderData ? { pseudo: senderData.pseudo } : { pseudo: 'Utilisateur Test' }
          };

          setMessages(prev => [...prev, newMessage]);
        } catch (error) {
          console.error('Erreur lors du traitement du nouveau message:', error);
        }
      })
      .subscribe((status) => {
        console.log('Statut de la souscription:', status);
        
        // Mettre à jour l'indicateur de connexion selon le statut
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('disconnected');
          // Retry automatique
          setTimeout(() => {
            if (document.visibilityState === 'visible') {
              reconnectRealtime();
            }
          }, 2000);
        }
      });

    subscriptionRef.current = subscription;
  };

  // Envoyer un nouveau message dans le chat
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;

    setIsSending(true);

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          game_id: TEST_GAME_ID,
          id_sender: user.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  // Simuler des messages pour tester le chat (dev/demo)
  const simulateMessage = async (type: 'player' | 'spectator') => {
    if (!user?.id) return;

    try {
      const messages = {
        player: [
          'Bon coup !',
          'Merci pour cette partie',
          'Tu joues bien',
          'Bonne chance'
        ],
        spectator: [
          'Superbe partie !',
          'Ce coup était impressionnant',
          'Allez-y les gars !',
          'Quelle tension !',
          'Bravo pour ce niveau de jeu'
        ]
      };

      const randomMessage = messages[type][Math.floor(Math.random() * messages[type].length)];

      await supabase
        .from('chat_messages')
        .insert({
          game_id: TEST_GAME_ID,
          id_sender: user.id,
          content: `[${type.toUpperCase()} TEST] ${randomMessage}`,
          created_at: new Date().toISOString()
        });

      toast.success(`Message ${type} simulé !`);
    } catch (error) {
      console.error('Error simulating message:', error);
      toast.error('Erreur lors de la simulation');
    }
  };

  // Afficher le badge de rôle (Blanc/Noir/Spectateur) pour chaque message
  const getRoleBadge = (senderId: string) => {
    if (!gameInfo) return null;
    
    if (senderId === gameInfo.white_player) {
      return <Badge variant="outline" className="text-xs border-white/20 text-white">Blanc</Badge>;
    }
    if (senderId === gameInfo.black_player) {
      return <Badge variant="outline" className="text-xs border-white/20 text-white">Noir</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-blue-400/50 text-blue-400">Spectateur</Badge>;
  };

  // ✅ AJOUT : Gestion du loading
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

  // ✅ MODIFICATION : Vérifier user seulement après le loading
  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-slate-400 mb-4">Vous devez être connecté pour accéder au chat</p>
            <Link href="/auth/login">
              <Button className="chess-gradient">Se connecter</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Le reste du composant reste identique
  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Indicateur de statut de connexion en temps réel */}
        {connectionStatus !== 'connected' && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-900/50 border border-yellow-600/50">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
              <span className="text-yellow-200 text-sm">
                {connectionStatus === 'disconnected' ? 'Connexion perdue... Reconnexion automatique' : 'Reconnexion en cours...'}
              </span>
            </div>
          </div>
        )}

        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Dashboard
          </Link>
          
          <div className="flex items-center space-x-4 mb-6">
            <MessageCircle className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Chat de la Partie</h1>
              <p className="text-slate-400">
                {userRole === 'spectator' ? 'Vous regardez cette partie en tant que spectateur' : 'Vous participez à cette partie'}
              </p>
            </div>
          </div>

          {/* Informations sur la partie en cours */}
          {gameInfo && (
            <Card className="glass-effect border-white/10 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-white">
                      <span className="font-medium">{gameInfo.white_pseudo}</span>
                      <span className="text-slate-400 mx-2">vs</span>
                      <span className="font-medium">{gameInfo.black_pseudo}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="border-white/20 text-white">
                        Votre rôle: {userRole === 'white' ? 'Joueur Blanc' : userRole === 'black' ? 'Joueur Noir' : 'Spectateur'}
                      </Badge>
                      <Badge variant="outline" className="border-blue-400/50 text-blue-400">
                        <Eye className="h-3 w-3 mr-1" />
                        {spectatorCount} spectateurs
                      </Badge>
                    </div>
                  </div>
                  {/* Boutons de test pour simuler des messages */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => simulateMessage('player')}
                      className="border-white/20 hover:bg-white/10"
                    >
                      Message joueur
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => simulateMessage('spectator')}
                      className="border-blue-400/50 hover:bg-blue-400/10"
                    >
                      Message spectateur
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Interface de chat principale */}
        <Card className="glass-effect border-white/10 h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <MessageCircle className="h-5 w-5 text-blue-400" />
              <span>Chat Public</span>
              <Badge variant="secondary" className="text-xs">
                Joueurs + Spectateurs
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Tous les participants peuvent discuter • Restez respectueux
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-4">
            {/* Zone d'affichage des messages avec scroll automatique */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 max-h-[400px]">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Aucun message pour le moment</p>
                  <p className="text-slate-500 text-sm">Les joueurs et spectateurs peuvent participer !</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isMyMessage = message.id_sender === user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} w-full`} // ✅ Ajout w-full
                    >
                      <div className={`flex items-start space-x-2 max-w-[70%] ${isMyMessage ? 'flex-row-reverse space-x-reverse' : ''}`}> {/* ✅ Réduction max-width */}
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className={`text-xs font-bold ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'}`}>
                            {message.sender?.pseudo?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={`rounded-lg p-3 break-words word-wrap ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}> {/* ✅ Ajout break-words */}
                          <div className="flex items-center space-x-2 mb-1 flex-wrap"> {/* ✅ Ajout flex-wrap */}
                            <p className="text-sm font-medium break-words"> {/* ✅ break-words sur le pseudo */}
                              {message.sender?.pseudo || 'Utilisateur'}
                            </p>
                            {getRoleBadge(message.id_sender)}
                          </div>
                          <p className="text-sm break-words whitespace-pre-wrap"> {/* ✅ break-words + whitespace-pre-wrap */}
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
            </div>

            {/* Formulaire d'envoi de message */}
            <div className="border-t border-white/10 pt-4"> {/* ✅ Séparation visuelle */}
              <form onSubmit={sendMessage} className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Tapez votre message ${userRole === 'spectator' ? '(en tant que spectateur)' : ''}...`}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                  disabled={isSending}
                  maxLength={500}
                />
                <Button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className="chess-gradient hover:opacity-90 flex-shrink-0" // ✅ flex-shrink-0
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              <p className="text-xs text-slate-500 mt-2">
                Limite de 500 caractères • Chat public visible par tous les participants
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}