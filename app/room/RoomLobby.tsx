'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Share2, Play, Settings, Users, Clock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRoom, RoomWithParticipants } from '@/hooks/useRoom';
import { useRoomRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {PlayersList} from "@/app/room/PlayerList";

interface RoomLobbyProps {
    initialRoom: RoomWithParticipants;
}

export function RoomLobby({ initialRoom }: RoomLobbyProps) {
    const router = useRouter();
    const { profile } = useAuth();
    const { fetchRoom, leaveRoom } = useRoom();
    const [room, setRoom] = useState<RoomWithParticipants>(initialRoom);
    const [loading, setLoading] = useState(false);

    const isHost = profile?.id === room.host_id;
    const isParticipant = room.participants.some(p => p.user_id === profile?.id && p.is_active);
    const canStartGame = isHost && room.participants.filter(p => p.role !== 'spectator').length === 2;

    useRoomRealtime(room.id, {
        onRoomUpdate: (updatedRoom) => {
            setRoom(prev => ({ ...prev, ...updatedRoom }));

            if (updatedRoom.status === 'playing') {
                toast.success('La partie commence !');
                router.push(`/room/${room.id}/game`);
            }
        },
        onParticipantJoin: async () => {
            await fetchRoom(room.id);
        },
        onParticipantLeave: async () => {
            // Refresh room data when someone leaves
            await fetchRoom(room.id);
        },
    });

    useEffect(() => {
        const updateRoom = async () => {
            try {
                await fetchRoom(room.id);
            } catch (error) {
                console.error('Error fetching room:', error);
            }
        };

        const interval = setInterval(updateRoom, 5000);
        return () => clearInterval(interval);
    }, [room.id, fetchRoom]);

    const handleCopyRoomCode = () => {
        if (room.room_code) {
            navigator.clipboard.writeText(room.room_code);
            toast.success('Code de la salle copié !');
        }
    };

    const handleShareRoom = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        toast.success('Lien de la salle copié !');
    };

    const handleStartGame = async () => {
        if (!canStartGame) return;

        setLoading(true);
        try {
            toast.info('Démarrage de la partie...');
        } catch (error) {
            console.error('Error starting game:', error);
            toast.error('Erreur lors du démarrage de la partie');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveRoom = async () => {
        try {
            await leaveRoom(room.id);
            toast.success('Vous avez quitté la salle');
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la sortie de la salle');
        }
    };

    const handleKickPlayer = async (participantId: string) => {
        toast.info('Fonctionnalité à implémenter');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card className="glass-effect border-white/10">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center space-x-2 text-white">
                                    {isHost && <Crown className="h-5 w-5 text-yellow-400" />}
                                    <span>{room.name}</span>
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Créée par {room.host.username}
                                </CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Badge
                                    variant={room.status === 'waiting' ? 'secondary' : 'default'}
                                    className={
                                        room.status === 'waiting' ? 'bg-yellow-600/20 text-yellow-400 border-yellow-400/50' :
                                            'bg-green-600/20 text-green-400 border-green-400/50'
                                    }
                                >
                                    {room.status === 'waiting' ? 'En attente' : 'En cours'}
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
                    </CardHeader>

                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    {room.participants.filter(p => p.role !== 'spectator').length}/2
                                </div>
                                <div className="text-sm text-slate-400">Joueurs</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    {room.participants.filter(p => p.role === 'spectator').length}
                                </div>
                                <div className="text-sm text-slate-400">Spectateurs</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    {room.max_spectators}
                                </div>
                                <div className="text-sm text-slate-400">Max Spectateurs</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {room.is_private && room.room_code && (
                    <Card className="glass-effect border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Code d'Invitation</CardTitle>
                            <CardDescription className="text-slate-400">
                                Partagez ce code pour inviter des joueurs dans cette salle privée
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2">
                                <Input
                                    value={room.room_code}
                                    readOnly
                                    className="bg-white/5 border-white/20 text-white font-mono text-lg text-center"
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleCopyRoomCode}
                                    className="border-white/20 hover:bg-white/10"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="glass-effect border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Contrôles de la Partie</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-white">Statut de la partie</h4>
                                <p className="text-sm text-slate-400">
                                    {canStartGame ? 'Prêt à commencer' : 'En attente d\'un second joueur'}
                                </p>
                            </div>
                            {isHost && (
                                <Button
                                    onClick={handleStartGame}
                                    disabled={!canStartGame || loading}
                                    className="chess-gradient hover:opacity-90"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Démarrage...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            Commencer la Partie
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                onClick={handleShareRoom}
                                className="border-white/20 hover:bg-white/10"
                            >
                                <Share2 className="mr-2 h-4 w-4" />
                                Partager le Lien
                            </Button>

                            {isParticipant && (
                                <Button
                                    variant="outline"
                                    onClick={handleLeaveRoom}
                                    className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                                >
                                    Quitter la Salle
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div>
                <PlayersList
                    participants={room.participants}
                    hostId={room.host_id}
                    guestId={room.guest_id || undefined}
                    onKickPlayer={handleKickPlayer}
                    canManageParticipants={isHost}
                />
            </div>
        </div>
    );
}