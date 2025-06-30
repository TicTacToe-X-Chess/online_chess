'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/header';
import { RoomLobby } from '@/app/room/RoomLobby';
import { useRoom, RoomWithParticipants } from '@/hooks/useRoom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Link from 'next/link';

export default function RoomLobbyPage() {
    const params = useParams();
    const router = useRouter();
    const { profile } = useAuth();
    const { fetchRoom } = useRoom();
    const [room, setRoom] = useState<RoomWithParticipants | null>(null);
    const [loading, setLoading] = useState(true);

    const roomId = params.id as string;

    useEffect(() => {
        const loadRoom = async () => {
            try {
                setLoading(true);
                const fetchedRoom = await fetchRoom(roomId);

                if (!fetchedRoom) {
                    toast.error('Salle introuvable');
                    router.push('/dashboard');
                    return;
                }

                setRoom(fetchedRoom);
            } catch (error: any) {
                console.error('Error loading room:', error);
                toast.error('Impossible de charger la salle');
                router.push('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        if (roomId) {
            loadRoom();
        }
    }, [roomId, fetchRoom, router]);

    // Rediriger si la partie a déjà commencé
    useEffect(() => {
        if (room?.status === 'playing') {
            router.push(`/room/${roomId}/game`);
        }
    }, [room?.status, roomId, router]);

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

    if (!room) {
        return (
            <div className="min-h-screen">
                <Header />
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-4">Salle introuvable</h2>
                        <p className="text-slate-400 mb-6">Cette salle n'existe pas ou a été supprimée.</p>
                        <Link href="/dashboard">
                            <button className="chess-gradient px-6 py-3 rounded-lg font-medium">
                                Retour au Dashboard
                            </button>
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
                <div className="mb-6">
                    <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour au Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Lobby - {room.name}
                    </h1>
                    <p className="text-slate-400">
                        Attendez que tous les joueurs soient prêts pour commencer la partie
                    </p>
                </div>

                <RoomLobby initialRoom={room} />
            </div>
        </div>
    );
}
