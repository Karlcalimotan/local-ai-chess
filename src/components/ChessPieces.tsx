import React from 'react';

interface PieceProps {
  color: 'w' | 'b';
  className?: string;
  size?: number;
}

// Sleek, clean, highly recognizable modern vector paths for chess pieces
export const RetroChessPiece: React.FC<PieceProps & { type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' }> = ({
  type,
  color,
  className = "",
  size = 40
}) => {
  const isWhite = color === 'w';

  // Premium, contemporary minimalist color palette:
  // White pieces: Crisp high-contrast premium white body with deep indigo/slate elegant borders
  // Black pieces: Sleek dark obsidian steel charcoal with silver/light-slate premium borders
  const fill = isWhite ? '#ffffff' : '#1e293b'; 
  const stroke = isWhite ? '#1e293b' : '#f1f5f9';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 45 45"
      className={`select-none transition-transform duration-200 hover:scale-105 active:scale-95 ${className}`}
    >
      {type === 'p' && (
        <path
          d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83 1.06-1.41 2.37-1.41 3.97v3h11v-3c0-1.6-.58-2.91-1.41-3.97 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {type === 'r' && (
        <path
          d="M9 39h27v-3H9v3zm3-3h21v-4H12v4zm2.5-4l1.5-12h13l1.5 12h-16zm-1.5-12h19v-5H13v5zm-1.5-5H13V9h4v3h4V9h4v3h4V9h4v3h4V9h3v5H11.5z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {type === 'n' && (
        <path
          d="M 22,10 C 22,10 19,11 16,15 C 13,19 13,23 13,23 C 13,23 14,20 16,19 C 18,18 20,20 20,20 C 20,20 18,21 17,23 C 16,25 16,28 17,29 C 18,30 20,28 20,28 C 20,28 19,30 18,32 C 17,34 18,35 19,35 C 20,35 22,33 23,31 C 24,29 24,27 25,27 C 26,27 28,30 30,31 C 32,32 35,32 35,32 C 35,32 33,28 32,25 C 31,22 30,20 30,17 C 30,14 28,10 22,10 z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {type === 'b' && (
        <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 36h27v-3H9v3zm2.5-3h22v-3.5h-22V33zm1.5-3.5S17 21 17 17c0-3 2.5-5.5 5.5-5.5S28 14 28 17c0 4 4 12.5 4 12.5H13z" />
          <circle cx="22.5" cy="8.5" r="2" />
          <path d="M17.5 18h10 M22.5 13.5v9" />
        </g>
      )}

      {type === 'q' && (
        <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 39h29v-3H8v3zm1.5-3h26v-4h-26v4zm2.5-4l2-16 6 8 4-13 4 13 6-8 2 16H12z" />
          <circle cx="12" cy="14" r="1.5" />
          <circle cx="20" cy="11" r="1.5" />
          <circle cx="22.5" cy="6" r="1.5" />
          <circle cx="25" cy="11" r="1.5" />
          <circle cx="33" cy="14" r="1.5" />
        </g>
      )}

      {type === 'k' && (
        <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 39h28v-3H8.5v3zm2-3h24V31.5H10.5V36zm2-4.5s4-12.5 4-16c0-3.3 2.7-6 6-6s6 2.7 6 6c0 3.5 4 16 4 16H14.5z" />
          <path d="M22.5 6V2 M20.5 4h4" />
          <path d="M16 18h13 M22.5 13v10" />
        </g>
      )}
    </svg>
  );
};

export default RetroChessPiece;
