// hooks/useChessEngine.ts
import { useState } from 'react';
import { Chess, Move } from 'chess.js';

export function useChessEngine() {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState<string>(chess.fen());
  const [history, setHistory] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [gameReason, setGameReason] = useState<string>('');

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

  const resetGame = () => {
    chess.reset();
    setFen(chess.fen());
    setHistory([]);
    setIsGameOver(false);
    setGameReason('');
  };

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

