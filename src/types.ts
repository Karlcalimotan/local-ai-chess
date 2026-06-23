export type AIMode = 'lm-studio' | 'local-minimax';
export type PlayerColor = 'white' | 'black' | 'random';
export type GameStatus = 'menu' | 'playing' | 'checkmate' | 'draw' | 'stalemate' | 'threefold';
export type GameWinner = 'white' | 'black' | 'draw' | null;

export interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'system' | 'ai-thought' | 'ai-action' | 'player-action' | 'warning' | 'success';
}

export interface GameSettings {
  lmStudioUrl: string;
  modelId: string;
  aiMode: AIMode;
  difficulty: 'easy' | 'medium' | 'hard';
  playerColor: PlayerColor;
  initTimeMinutes: number;
}

export interface ChessPiece {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  color: 'w' | 'b';
  square: string;
}
