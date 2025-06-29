// hooks/useChessEngine.ts
import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';

export function useChessEngine() {

  // Initialisaton de l'échiquier, de la position de départ et de la liste des coups
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [history, setHistory] = useState<string[]>([]);

  // Vérifie la jouabilité du coup et met a jour la position et la liste si valable
  const makeMove = (move: { from: string; to: string; promotion?: string }) => {
    const result = chess.move(move);
    if (result) {
      setFen(chess.fen());
      setHistory([...chess.history()]);
    }
    return result;
  };

  // Réinitialisation du jeu d'echec
  const resetGame = () => {
    chess.reset();
    setFen(chess.fen());
    setHistory([]);
  };

  // Valeurs de sortie du hook
  return {
    fen, // Position de l'echiquier
    makeMove, // Permet aux joueurs de jouer
    resetGame, // Réinitialisation de la partie
    history, // Historique des coups
    turn: chess.turn(), // Tour de jeu (a quel joueur de jouer)
    isGameOver: chess.isGameOver(), // Partie finie ou non
    getChessInstance: () => chess // Instance de chess
  };
}
