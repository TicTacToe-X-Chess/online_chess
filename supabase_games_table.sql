-- ✅ Script pour créer/vérifier la table games dans Supabase
-- Exécuter ce script dans l'interface SQL de Supabase

-- 1. Vérifier la structure actuelle de la table games
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'games' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Supprimer et recréer la table si nécessaire (ATTENTION: supprime toutes les données!)
-- Décommentez les lignes suivantes SEULEMENT si vous voulez recréer la table
/*
DROP TABLE IF EXISTS public.games CASCADE;
*/

-- 3. Créer la table games avec la structure correcte
CREATE TABLE IF NOT EXISTS public.games (
    id BIGSERIAL PRIMARY KEY,
    id_game UUID NOT NULL UNIQUE REFERENCES public.rooms(id) ON DELETE CASCADE,
    white_player UUID NOT NULL REFERENCES public.user_public(id) ON DELETE CASCADE,
    black_player UUID NOT NULL REFERENCES public.user_public(id) ON DELETE CASCADE,
    current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    move_history TEXT[] NOT NULL DEFAULT '{}', -- ✅ IMPORTANT: Tableau de texte, jamais NULL
    current_turn CHAR(1) NOT NULL DEFAULT 'w' CHECK (current_turn IN ('w', 'b')),
    winner UUID NULL REFERENCES public.user_public(id) ON DELETE SET NULL,
    game_status TEXT DEFAULT 'playing' CHECK (game_status IN ('playing', 'checkmate', 'stalemate', 'draw', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_games_id_game ON public.games(id_game);
CREATE INDEX IF NOT EXISTS idx_games_white_player ON public.games(white_player);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON public.games(black_player);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(game_status);

-- 5. Activer les mises à jour automatiques du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_games_updated_at ON public.games;
CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON public.games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Activer Realtime pour la table games
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- 7. Politique de sécurité pour permettre la lecture/écriture aux participants du jeu
CREATE POLICY "Users can view games they participate in" ON public.games
    FOR SELECT USING (
        auth.uid() = white_player OR 
        auth.uid() = black_player OR
        EXISTS (
            SELECT 1 FROM public.room_participants rp 
            WHERE rp.room_id = games.id_game 
            AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Players can update their games" ON public.games
    FOR UPDATE USING (
        auth.uid() = white_player OR 
        auth.uid() = black_player
    );

CREATE POLICY "Players can insert new games" ON public.games
    FOR INSERT WITH CHECK (
        auth.uid() = white_player OR 
        auth.uid() = black_player
    );

-- 8. Activer les publications Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- 9. Vérifier que tout est configuré correctement
SELECT 
    table_name,
    schemaname,
    hasrls as "Row Level Security",
    hasrowsecurity as "Has Security"
FROM pg_tables 
WHERE table_name = 'games';

-- 10. Lister les politiques créées
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'games';

COMMENT ON TABLE public.games IS 'Table pour stocker l''état des parties d''échecs en cours et terminées';
COMMENT ON COLUMN public.games.move_history IS 'Historique des coups en notation algébrique (format TEXT[] pour éviter les erreurs de type)';
COMMENT ON COLUMN public.games.current_fen IS 'Position actuelle de l''échiquier en notation FEN';
