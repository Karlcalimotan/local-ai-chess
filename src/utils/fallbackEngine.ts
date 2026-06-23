import { Chess } from 'chess.js';

// Simple piece values for heuristic evaluation
const PIECE_VALUES = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 1000
};

// Heatmaps to encourage retro positional play (from the perspectives of active side)
const PAWN_HOME_BONUS = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5,  5,  5,  5,  5,  5,  5,  5],
  [1,  1,  2,  3,  3,  2,  1,  1],
  [0.5,0.5,1,2.5,2.5,  1,0.5,0.5],
  [0,  0,  0,  2,  2,  0,  0,  0],
  [0.5,-0.5,-1,0,  0,-1,-0.5,  0.5],
  [0.5, 1, 1,-2,-2,  1, 1,0.5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_HOME_BONUS = [
  [-5, -4, -3, -3, -3, -3, -4, -5],
  [-4, -2,  0,  0,  0,  0, -2, -4],
  [-3,  0,  1,  1.5,1.5,1,  0, -3],
  [-3,  0.5,1.5,2,  2,  1.5,0.5,-3],
  [-3,  0,  1.5,2,  2,  1.5,0,  -3],
  [-3,  0.5,1,  1.5,1.5,1,  0.5,-3],
  [-4, -2,  0,  0.5,0.5,0, -2, -4],
  [-5, -4, -3, -3, -3, -3, -4, -5]
];

// Simple board evaluation from White's perspective
export function evaluateBoard(chess: Chess): number {
  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        let value = PIECE_VALUES[piece.type];
        
        // Add tiny positional bonuses
        if (piece.type === 'p') {
          const rowIdx = piece.color === 'w' ? 7 - r : r;
          value += PAWN_HOME_BONUS[rowIdx][c];
        } else if (piece.type === 'n') {
          const rowIdx = piece.color === 'w' ? 7 - r : r;
          value += KNIGHT_HOME_BONUS[rowIdx][c];
        }

        if (piece.color === 'w') {
          score += value;
        } else {
          score -= value;
        }
      }
    }
  }

  return score;
}

// Minimax with Alpha-Beta Pruning
// depth 1: super fast, depth 2-3: tactical
export function negateMinimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): { score: number; move: any } {
  if (depth === 0 || chess.isGameOver()) {
    return { score: evaluateBoard(chess), move: null };
  }

  const moves = chess.moves({ verbose: true });
  
  // Sort moves slightly (captures first) to optimize alpha-beta pruning cuts
  moves.sort((a, b) => {
    const aScore = a.captured ? PIECE_VALUES[a.captured] : 0;
    const bScore = b.captured ? PIECE_VALUES[b.captured] : 0;
    return bScore - aScore;
  });

  let bestMove = null;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      const evaluation = negateMinimax(chess, depth - 1, alpha, beta, false).score;
      chess.undo();

      if (evaluation > maxEval) {
        maxEval = evaluation;
        bestMove = move;
      }
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) {
        break; // beta cutoff
      }
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      const evaluation = negateMinimax(chess, depth - 1, alpha, beta, true).score;
      chess.undo();

      if (evaluation < minEval) {
        minEval = evaluation;
        bestMove = move;
      }
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) {
        break; // alpha cutoff
      }
    }
    return { score: minEval, move: bestMove };
  }
}

/**
 * Calculates the best move for the active player using our heuristic engine
 */
export function getMinimaxMove(chess: Chess, difficulty: 'easy' | 'medium' | 'hard'): string {
  const depth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const isWhite = chess.turn() === 'w';
  const result = negateMinimax(chess, depth, -Infinity, Infinity, isWhite);
  
  if (result.move) {
    return result.move.lan || `${result.move.from}${result.move.to}${result.move.promotion || ''}`;
  }
  
  // fallback if somehow nothing is found
  const fallbackMoves = chess.moves({ verbose: true });
  const randomIdx = Math.floor(Math.random() * fallbackMoves.length);
  const fallback = fallbackMoves[randomIdx];
  return `${fallback.from}${fallback.to}${fallback.promotion || ''}`;
}
