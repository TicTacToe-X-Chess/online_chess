'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Room, UserProfile } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RoomParticipant {
    id: string;
    room_id: string;
    user_id: string;
    role: 'host' | 'player' | 'spectator';
    joined_at: string;
    left_at?: string;
    is_active: boolean;
    user: {
        id: string;
        email?: string;
        user_metadata: {
            pseudo: string;
            avatar_url?: string;
        };
    };
}

export interface RoomWithParticipants extends Room {
    participants: RoomParticipant[];
    host: UserProfile;
    guest?: UserProfile;
}

export function useRoom(roomId?: string) {
    const { profile } = useAuth();
    const [room, setRoom] = useState<RoomWithParticipants | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const generateRoomCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 6 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };

    const createRoom = async (roomData: {
        name: string;
        isPrivate: boolean;
        timeControl: string;
        maxSpectators: number;
    }) => {
        const roomCode = roomData.isPrivate ? generateRoomCode() : null;

        const fakeRoom: Room = {
            id: Math.random().toString(36).substring(2, 10),
            name: roomData.name,
            host_id: profile?.id || 'mock-user-id',
            guest_id: undefined,
            is_private: roomData.isPrivate,
            room_code: roomCode ?? undefined,
            status: 'waiting',
            max_spectators: roomData.maxSpectators,
            time_control: roomData.timeControl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        return fakeRoom;
    };

    const joinRoom = async (roomId: string, roomCode?: string) => {
        if (!profile) throw new Error('User must be authenticated to join a room');

        // Récupérer les données de la room avec le host depuis auth.users
        const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (roomError) throw roomError;

        if (roomData.is_private && roomData.room_code !== roomCode) {
            throw new Error('Invalid room code');
        }

        if (roomData.status !== 'waiting') {
            throw new Error('Room is not accepting new players');
        }

        const { data: existingParticipant } = await supabase
            .from('room_participants')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', profile.id)
            .eq('is_active', true)
            .single();

        if (existingParticipant) {
            throw new Error('You are already in this room');
        }

        const { data: participants } = await supabase
            .from('room_participants')
            .select('role')
            .eq('room_id', roomId)
            .eq('is_active', true);

        const hasPlayer = participants?.some(p => p.role === 'player');
        const role = hasPlayer ? 'spectator' : 'player';

        const { error: participantError } = await supabase
            .from('room_participants')
            .insert({
                room_id: roomId,
                user_id: profile.id,
                role,
            });

        if (participantError) throw participantError;

        if (role === 'player' && !roomData.guest_id) {
            const { error: updateError } = await supabase
                .from('rooms')
                .update({
                    guest_id: profile.id,
                    status: 'playing',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', roomId);

            if (updateError) throw updateError;
        }

        return { success: true, role };
    };

    const leaveRoom = async (roomId: string) => {
        if (!profile) return;

        try {
            const { error } = await supabase
                .from('room_participants')
                .update({
                    is_active: false,
                    left_at: new Date().toISOString(),
                })
                .eq('room_id', roomId)
                .eq('user_id', profile.id)
                .eq('is_active', true);

            if (error) throw error;

            const { data: roomData } = await supabase
                .from('rooms')
                .select('host_id, guest_id')
                .eq('id', roomId)
                .single();

            if (roomData?.guest_id === profile.id) {
                await supabase
                    .from('rooms')
                    .update({
                        guest_id: null,
                        status: 'waiting',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', roomId);
            }

            return { success: true };
        } catch (error: any) {
            throw new Error(error.message || 'Failed to leave room');
        }
    };

    // Fonction utilitaire pour récupérer les données utilisateur depuis auth.users
    const getUserData = async (userId: string) => {
        const { data, error } = await supabase.auth.admin.getUserById(userId);
        if (error || !data?.user) return null;

        return {
            id: data.user.id,
            email: data.user.email,
            user_metadata: data.user.user_metadata || { pseudo: 'Anonymous' }
        };
    };

    const fetchRoom = async (id: string) => {
        try {
            setLoading(true);
            setError(null);

            // Récupérer les données de la salle
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', id)
                .single();

            if (roomError) throw roomError;

            // Récupérer les participants
            const { data: participants, error: participantsError } = await supabase
                .from('room_participants')
                .select('*')
                .eq('room_id', id)
                .eq('is_active', true)
                .order('joined_at', { ascending: true });

            if (participantsError) throw participantsError;

            // Récupérer les données des utilisateurs pour les participants
            const participantsWithUsers: RoomParticipant[] = [];

            for (const participant of participants) {
                const userData = await getUserData(participant.user_id);
                if (userData) {
                    participantsWithUsers.push({
                        id: participant.id,
                        room_id: participant.room_id,
                        user_id: participant.user_id,
                        role: participant.role,
                        joined_at: participant.joined_at,
                        is_active: participant.is_active,
                        left_at: participant.left_at,
                        user: userData
                    });
                }
            }

            // Récupérer les données du host
            const hostData = await getUserData(roomData.host_id);

            // Récupérer les données du guest si présent
            let guestData = null;
            if (roomData.guest_id) {
                guestData = await getUserData(roomData.guest_id);
            }

            const roomWithParticipants: RoomWithParticipants = {
                ...roomData,
                participants: participantsWithUsers,
                host: hostData || { id: roomData.host_id, email: null, pseudo: 'Unknown', created_at: '', last_connection: null, country: null },
                guest: guestData || undefined
            };

            setRoom(roomWithParticipants);
        } catch (error: any) {
            setError(error.message);
            setRoom(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!roomId) return;

        fetchRoom(roomId);

        const roomChannel: RealtimeChannel = supabase
            .channel(`room-${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
                async (payload) => {
                    const updatedRoom = payload.new;

                    if (!updatedRoom) return;

                    if (updatedRoom.guest_id && !room?.guest) {
                        const guestData = await getUserData(updatedRoom.guest_id);

                        setRoom(prev =>
                            prev
                                ? {
                                    ...prev,
                                    ...updatedRoom,
                                    guest: guestData || prev.guest,
                                }
                                : prev
                        );
                    } else if (!updatedRoom.guest_id) {
                        setRoom(prev => (prev ? { ...prev, ...updatedRoom, guest: undefined } : prev));
                    } else {
                        setRoom(prev => (prev ? { ...prev, ...updatedRoom } : prev));
                    }
                }
            )
            .subscribe();

        const participantsChannel: RealtimeChannel = supabase
            .channel(`room-participants-${roomId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    const participantRaw = payload.new;

                    // Récupérer les données de l'utilisateur depuis auth.users
                    const userData = await getUserData(participantRaw.user_id);

                    if (!userData) return;

                    const participant: RoomParticipant = {
                        id: participantRaw.id,
                        room_id: participantRaw.room_id,
                        user_id: participantRaw.user_id,
                        role: participantRaw.role as 'host' | 'player' | 'spectator',
                        joined_at: participantRaw.joined_at,
                        is_active: participantRaw.is_active,
                        left_at: participantRaw.left_at,
                       // user: userData
                    };

                    setRoom(prev =>
                        prev ? { ...prev, participants: [...prev.participants, participant] } : prev
                    );
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    setRoom(prev => {
                        if (!prev) return prev;
                        const updatedParticipants = prev.participants.map(p =>
                            p.id === payload.new.id ? {
                                ...p,
                                role: payload.new.role,
                                is_active: payload.new.is_active,
                                left_at: payload.new.left_at
                            } : p
                        );
                        return { ...prev, participants: updatedParticipants };
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
                (payload) => {
                    setRoom(prev => {
                        if (!prev) return prev;
                        const filteredParticipants = prev.participants.filter(p => p.id !== payload.old.id);
                        return { ...prev, participants: filteredParticipants };
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(roomChannel);
            supabase.removeChannel(participantsChannel);
        };
    }, [roomId]);

    return {
        room,
        loading,
        error,
        createRoom,
        joinRoom,
        leaveRoom,
        fetchRoom,
        generateRoomCode,
    };
}