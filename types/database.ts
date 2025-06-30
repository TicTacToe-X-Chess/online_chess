export interface Database {
  public: {
    Tables: {
      user_public: {
        Row: {
          id: string;
          email: string;
          pseudo: string;
          created_at: string;
          last_connection: string;
        };
        Insert: {
          id: string;
          email: string;
          pseudo: string;
          created_at?: string;
          last_connection?: string;
        };
        Update: {
          id?: string;
          email?: string;
          pseudo?: string;
          created_at?: string;
          last_connection?: string;
        };
      };
      user_ranking: {
        Row: {
          id: string;
          user_id: string;
          games_played: number;
          games_won: number;
          games_lost: number;
          elo_rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          games_played?: number;
          games_won?: number;
          games_lost?: number;
          elo_rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          games_played?: number;
          games_won?: number;
          games_lost?: number;
          elo_rating?: number;
          created_at?: string;
          updated_at?: string;
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

export type UserProfile = Database['public']['Tables']['user_public']['Row'];
export type UserRanking = Database['public']['Tables']['user_ranking']['Row'];
export type Room = Database['public']['Tables']['rooms']['Row'];
export type Game = Database['public']['Tables']['games']['Row'];
export type Spectator = Database['public']['Tables']['spectators']['Row'];