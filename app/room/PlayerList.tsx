'use client';

import { Crown, User, Eye, UserMinus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RoomParticipant } from '@/hooks/useRoom';
import { useAuth } from '@/hooks/useAuth';

interface PlayersListProps {
    participants: RoomParticipant[];
    hostId: string;
    guestId?: string;
    onKickPlayer?: (participantId: string) => void;
    canManageParticipants?: boolean;
}

export function PlayersList({
                                participants,
                                hostId,
                                guestId,
                                onKickPlayer,
                                canManageParticipants = false
                            }: PlayersListProps) {
    const { profile } = useAuth();

    const host = participants.find(p => p.role === 'host');
    const player = participants.find(p => p.role === 'player' && p.user_id !== hostId);
    const spectators = participants.filter(p => p.role === 'spectator');

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'host':
                return <Crown className="h-4 w-4 text-yellow-400" />;
            case 'player':
                return <User className="h-4 w-4 text-blue-400" />;
            case 'spectator':
                return <Eye className="h-4 w-4 text-slate-400" />;
            default:
                return null;
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'host':
                return 'Hôte';
            case 'player':
                return 'Joueur';
            case 'spectator':
                return 'Spectateur';
            default:
                return role;
        }
    };

    const ParticipantCard = ({ participant, isCurrentUser }: { participant: RoomParticipant; isCurrentUser: boolean }) => (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                    <AvatarFallback className={`text-white ${
                        participant.role === 'host' ? 'bg-yellow-600' :
                            participant.role === 'player' ? 'bg-blue-600' : 'bg-slate-600'
                    }`}>
                        {participant.profile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">{participant.profile.username}</span>
                        {isCurrentUser && <Badge variant="secondary" className="text-xs">Vous</Badge>}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                        {getRoleIcon(participant.role)}
                        <span>{getRoleLabel(participant.role)}</span>
                        <span>•</span>
                        <span>{participant.profile.rating} ELO</span>
                    </div>
                </div>
            </div>

            {canManageParticipants && !isCurrentUser && participant.role !== 'host' && onKickPlayer && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onKickPlayer(participant.id)}
                    className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                >
                    <UserMinus className="h-4 w-4" />
                </Button>
            )}
        </div>
    );

    return (
        <Card className="glass-effect border-white/10">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                    <span>Participants ({participants.length})</span>
                    <Badge variant="outline" className="border-blue-400/50 text-blue-400">
                        {participants.filter(p => p.role !== 'spectator').length}/2 Joueurs
                    </Badge>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Host */}
                {host && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Hôte</h4>
                        <ParticipantCard
                            participant={host}
                            isCurrentUser={host.user_id === profile?.id}
                        />
                    </div>
                )}

                {/* Player */}
                {player ? (
                    <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Joueur</h4>
                        <ParticipantCard
                            participant={player}
                            isCurrentUser={player.user_id === profile?.id}
                        />
                    </div>
                ) : (
                    <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">En attente d'un joueur</h4>
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5 border-2 border-dashed border-white/20">
                            <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <div className="flex-1">
                                <span className="text-slate-400">Slot libre...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Spectators */}
                {spectators.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">
                            Spectateurs ({spectators.length})
                        </h4>
                        <div className="space-y-2">
                            {spectators.map((spectator) => (
                                <ParticipantCard
                                    key={spectator.id}
                                    participant={spectator}
                                    isCurrentUser={spectator.user_id === profile?.id}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {participants.length === 1 && (
                    <div className="text-center py-4">
                        <p className="text-sm text-slate-400">
                            Partagez le lien de la salle pour inviter d'autres joueurs
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}