export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
          games_played: number;
          games_won: number;
          rating: number;
          is_online: boolean;
          last_seen: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
          games_played?: number;
          games_won?: number;
          rating?: number;
          is_online?: boolean;
          last_seen?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
          games_played?: number;
          games_won?: number;
          rating?: number;
          is_online?: boolean;
          last_seen?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          host_id: string;
          guest_id?: string;
          is_private: boolean;
          room_code?: string;
          status: 'waiting' | 'playing' | 'finished';
          created_at: string;
          updated_at: string;
          max_spectators: number;
          time_control: string;
        };
        Insert: {
          id?: string;
          name: string;
          host_id: string;
          guest_id?: string;
          is_private?: boolean;
          room_code?: string;
          status?: 'waiting' | 'playing' | 'finished';
          created_at?: string;
          updated_at?: string;
          max_spectators?: number;
          time_control?: string;
        };
        Update: {
          id?: string;
          name?: string;
          host_id?: string;
          guest_id?: string;
          is_private?: boolean;
          room_code?: string;
          status?: 'waiting' | 'playing' | 'finished';
          created_at?: string;
          updated_at?: string;
          max_spectators?: number;
          time_control?: string;
        };
      };
      room_participants: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: 'host' | 'player' | 'spectator';
          joined_at: string;
          left_at?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role?: 'host' | 'player' | 'spectator';
          joined_at?: string;
          left_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          role?: 'host' | 'player' | 'spectator';
          joined_at?: string;
          left_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          room_id: string;
          white_player_id: string;
          black_player_id: string;
          current_turn: 'white' | 'black';
          board_state: string;
          moves_history: string[];
          status: 'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned';
          winner_id?: string;
          started_at: string;
          ended_at?: string;
          time_white: number;
          time_black: number;
        };
        Insert: {
          id?: string;
          room_id: string;
          white_player_id: string;
          black_player_id: string;
          current_turn?: 'white' | 'black';
          board_state?: string;
          moves_history?: string[];
          status?: 'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned';
          winner_id?: string;
          started_at?: string;
          ended_at?: string;
          time_white?: number;
          time_black?: number;
        };
        Update: {
          id?: string;
          room_id?: string;
          white_player_id?: string;
          black_player_id?: string;
          current_turn?: 'white' | 'black';
          board_state?: string;
          moves_history?: string[];
          status?: 'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned';
          winner_id?: string;
          started_at?: string;
          ended_at?: string;
          time_white?: number;
          time_black?: number;
        };
      };
      spectators: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          joined_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Room = Database['public']['Tables']['rooms']['Row'];
export type RoomParticipant = Database['public']['Tables']['room_participants']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type Spectator = Database['public']['Tables']['spectators']['Row'];