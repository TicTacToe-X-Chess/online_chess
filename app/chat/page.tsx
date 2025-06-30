'use client';

import { useEffect, useState } from 'react';
import { Send, MessageCircle, Users, ArrowLeft, Eye } from 'lucide-react';
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [userRole, setUserRole] = useState<'white' | 'black' | 'spectator'>('spectator');
  const [spectatorCount, setSpectatorCount] = useState(0);
  const supabase = createClient();

  // ID de la partie de test
  const TEST_GAME_ID = '463beb3e-686f-49c9-9264-02d3faef3e75';

  useEffect(() => {
    // Attendre la fin du chargement de l'authentification
    if (loading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Initialiser le chat une fois l'utilisateur connecté
    initializeTestGame();
    fetchMessages();
    subscribeToMessages();
    updateSpectatorCount();
  }, [user, loading]);

  // Charger les informations de la partie existante
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

        // Récupérer les pseudos des joueurs
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

  // Simulation du nombre de spectateurs connectés
  const updateSpectatorCount = () => {
    setSpectatorCount(Math.floor(Math.random() * 10) + 1);
  };

  // Récupérer l'historique des messages et enrichir avec les pseudos
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

      // Récupérer les pseudos de tous les expéditeurs uniques
      const senderIds = Array.from(new Set(data.map(msg => msg.id_sender)));
      
      const { data: usersData } = await supabase
        .from('user_public')
        .select('id, pseudo')
        .in('id', senderIds);

      // Créer un mapping ID → pseudo pour performance O(1)
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
    const subscription = supabase
      .channel(`chat-${TEST_GAME_ID}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `game_id=eq.${TEST_GAME_ID}`
      }, async (payload) => {
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
      })
      .subscribe();

    return () => subscription.unsubscribe();
  };

  // Envoyer un nouveau message
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

  // Fonction de test pour simuler des messages de différents types d'utilisateurs
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

  // Afficher le badge de rôle selon le type d'utilisateur
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

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* En-tête de la page */}
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
            {/* Zone d'affichage des messages */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
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
                      className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isMyMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className={`text-xs font-bold ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'}`}>
                            {message.sender?.pseudo?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className={`rounded-lg p-3 ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}>
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-sm font-medium">
                              {message.sender?.pseudo || 'Utilisateur'}
                            </p>
                            {getRoleBadge(message.id_sender)}
                          </div>
                          <p className="text-sm">{message.content}</p>
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
                className="chess-gradient hover:opacity-90"
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
          </CardContent>
        </Card>

        {/* Documentation des fonctionnalités */}
        <Card className="glass-effect border-white/10 mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-white mb-3">Fonctionnalités du Chat</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• <strong>Joueurs et Spectateurs</strong> peuvent tous participer au chat</li>
              <li>• Les <strong>badges</strong> indiquent le rôle : Blanc, Noir, ou Spectateur</li>
              <li>• Chat <strong>en temps réel</strong> avec synchronisation instantanée</li>
              <li>• <strong>Historique</strong> des messages sauvegardé dans la base de données</li>
              <li>• Interface <strong>responsive</strong> et accessible sur tous les appareils</li>
              <li>• <strong>Modération</strong> automatique (limite de caractères, filtres futurs)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
