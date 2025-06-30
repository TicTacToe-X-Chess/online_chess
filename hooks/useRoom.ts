'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Room, Profile } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';

export interface RoomParticipant {
    id: string;
    room_id: string;
    user_id: string;
    role: 'host' | 'player' | 'spectator';
    joined_at: string;
    left_at?: string;
    is_active: boolean;
    profile: Profile;
}

export interface RoomWithParticipants extends Room {
    participants: RoomParticipant[];
    host: Profile;
    guest?: Profile;
}

export function useRoom(roomId?: string) {
    const { profile } = useAuth();
    const [room, setRoom] = useState<RoomWithParticipants | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const generateRoomCode = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const createRoom = async (roomData: {
        name: string;
        isPrivate: boolean;
        timeControl: string;
        maxSpectators: number;
    }) => {
        // TEMP : désactive la vérification du profil
        // if (!profile) {
        //     throw new Error('User must be authenticated to create a room');
        // }

        try {
            const roomCode = roomData.isPrivate ? generateRoomCode() : null;

            // Retourne une fausse room simulée
            const fakeRoom: Room = {
                id: Math.random().toString(36).substring(2, 10),
                name: roomData.name,
                host_id: profile?.id || 'mock-user-id',
                guest_id: undefined, // ✅ au lieu de null
                is_private: roomData.isPrivate,
                room_code: roomCode ?? undefined,
                status: 'waiting',
                max_spectators: roomData.maxSpectators,
                time_control: roomData.timeControl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };


            return fakeRoom;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to create room');
        }
    };

    const joinRoom = async (roomId: string, roomCode?: string) => {
        if (!profile) {
            throw new Error('User must be authenticated to join a room');
        }

        try {
            // Check if room exists and is joinable
            const { data: roomData, error: roomError } = await supabase
                .from('rooms')
                .select('*, host:profiles!rooms_host_id_fkey(*)')
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
        } catch (error: any) {
            throw new Error(error.message || 'Failed to join room');
        }
    };

    const leaveRoom = async (roomId: string) => {
        if (!profile) return;

        try {
            // Mark participant as inactive
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

    const fetchRoom = async (id: string) => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('rooms')
                .select(`
          *,
          host:profiles!rooms_host_id_fkey(*),
          guest:profiles!rooms_guest_id_fkey(*)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;

            const { data: participants, error: participantsError } = await supabase
                .from('room_participants')
                .select(`
          *,
          profile:profiles(*)
        `)
                .eq('room_id', id)
                .eq('is_active', true)
                .order('joined_at', { ascending: true });

            if (participantsError) throw participantsError;

            const roomWithParticipants: RoomWithParticipants = {
                ...data,
                participants: participants.map(p => ({
                    ...p,
                    profile: p.profile as Profile,
                })),
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
        if (roomId) {
            fetchRoom(roomId);
        } else {
            setLoading(false);
        }
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