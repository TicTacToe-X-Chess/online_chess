'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeConfig {
    table: string;
    filter?: string;
    onInsert?: (payload: any) => void;
    onUpdate?: (payload: any) => void;
    onDelete?: (payload: any) => void;
}

export function useRealtime(configs: RealtimeConfig[], dependencies: any[] = []) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        const channelName = `realtime-${configs.map(c => c.table).join('-')}-${Date.now()}`;

        const channel = supabase.channel(channelName);

        configs.forEach(config => {
            const { table, filter, onInsert, onUpdate, onDelete } = config;

            let subscription = channel.on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table,
                    ...(filter && { filter }),
                },
                (payload) => {
                    switch (payload.eventType) {
                        case 'INSERT':
                            onInsert?.(payload);
                            break;
                        case 'UPDATE':
                            onUpdate?.(payload);
                            break;
                        case 'DELETE':
                            onDelete?.(payload);
                            break;
                    }
                }
            );
        });

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Realtime subscription active');
            }
        });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, dependencies);

    const unsubscribe = () => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    };

    return { unsubscribe };
}

export function useRoomRealtime(roomId: string, callbacks: {
    onRoomUpdate?: (room: any) => void;
    onParticipantJoin?: (participant: any) => void;
    onParticipantLeave?: (participant: any) => void;
    onParticipantUpdate?: (participant: any) => void;
}) {
    const { onRoomUpdate, onParticipantJoin, onParticipantLeave, onParticipantUpdate } = callbacks;

    return useRealtime([
        {
            table: 'rooms',
            filter: `id=eq.${roomId}`,
            onUpdate: (payload) => {
                onRoomUpdate?.(payload.new);
            },
        },
        {
            table: 'room_participants',
            filter: `room_id=eq.${roomId}`,
            onInsert: (payload) => {
                onParticipantJoin?.(payload.new);
            },
            onUpdate: (payload) => {
                if (payload.old.is_active && !payload.new.is_active) {
                    onParticipantLeave?.(payload.new);
                } else {
                    onParticipantUpdate?.(payload.new);
                }
            },
            onDelete: (payload) => {
                onParticipantLeave?.(payload.old);
            },
        },
    ], [roomId]);
}