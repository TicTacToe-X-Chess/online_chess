// hooks/useChessEngine.ts
import { useState } from 'react';
import { Chess, Move } from 'chess.js';

export function useChessEngine() {

  /* --- Initialisation des différents éléments de la partie d'échecs --- */
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameReason, setGameReason] = useState<string>('');

  /* --- Event listener sur les coups joués --- */
  const makeMove = (move: { from: string; to: string; promotion?: string }): Move | null => {
    const result = chess.move(move);

    if (result) {
      setFen(chess.fen());
      setHistory([...chess.history()]);

      if (chess.isGameOver()) {
        setIsGameOver(true);

        let reason = '';
        if (chess.isCheckmate()) reason = 'Échec et mat';
        else if (chess.isStalemate()) reason = 'Pat';
        else if (chess.isThreefoldRepetition()) reason = 'Répétition';
        else if (chess.isInsufficientMaterial()) reason = 'Matériel insuffisant';
        else if (chess.isDraw()) reason = 'Partie nulle';
        else reason = 'Fin de partie inconnue';

        setGameReason(reason);
      }
    }

    return result;
  };

  /* --- Fonction de réinitialisation de la partie --- */
  const resetGame = () => {
    chess.reset();
    setFen(chess.fen());
    setHistory([]);
    setIsGameOver(false);
    setGameReason('');
  };

  /* --- Parametres de sortie du hook --- */
  return {
    fen,
    makeMove,
    resetGame,
    history,
    turn: chess.turn(),
    isGameOver,
    gameReason,
    getChessInstance: () => chess,
  };
}

