import React from 'react';
import { RetroChessPiece } from './ChessPieces';

interface RetroBoardProps {
  boardState: any[][]; // 8x8 matrix from chess.js
  selectedSquare: string | null;
  validMoves: string[]; // array of target squares e.g. ["e3", "e4"]
  onSquareClick: (square: string) => void;
  isCheck: boolean;
  kingSquare: string | null;
  playerColorFlip: boolean; // if true, Black is at the bottom
  isThinking: boolean;
  lastMove?: { from: string; to: string } | null;
  frozenSquares?: Record<string, number>;
  activeSpell?: string | null;
  spellValidTargets?: string[];
}

export const RetroBoard: React.FC<RetroBoardProps> = ({
  boardState,
  selectedSquare,
  validMoves,
  onSquareClick,
  isCheck,
  kingSquare,
  playerColorFlip,
  isThinking,
  lastMove = null,
  frozenSquares = {},
  activeSpell = null,
  spellValidTargets = []
}) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  // Rotate coordinates if playing as Black
  const displayFiles = playerColorFlip ? [...files].reverse() : files;
  const displayRanks = playerColorFlip ? [...ranks].reverse() : ranks;

  const handleSquareClick = (squareCode: string) => {
    if (isThinking) return;
    onSquareClick(squareCode);
  };

  return (
    <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-4 md:p-6 select-none shadow-2xl transition-all duration-350 w-full max-w-[500px] mx-auto overflow-hidden">
      {/* Dynamic state indicators overlaid */}
      {isThinking && (
        <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center z-30 select-none pointer-events-auto rounded-3xl">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl text-center text-xs text-emerald-400 font-sans tracking-wider animate-pulse font-medium shadow-2xl flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>AI calculating optimal move...</span>
          </div>
        </div>
      )}

      {/* Main Board Layout: columns on sides and columns on top/bottom */}
      <div className="flex flex-col items-center">
        {/* Top File Labels */}
        <div className="flex w-full mb-3 px-8 justify-around font-semibold font-mono text-[10px] text-zinc-500 tracking-wider">
          {displayFiles.map(file => (
            <div key={`top-${file}`} className="w-10 text-center uppercase">
              {file}
            </div>
          ))}
        </div>

        <div className="flex items-center w-full">
          {/* Left Rank Labels */}
          <div className="flex flex-col h-[320px] md:h-[400px] justify-around pr-4 font-semibold font-mono text-[10px] text-zinc-500">
            {displayRanks.map(rank => (
              <div key={`left-${rank}`} className="h-10 flex items-center justify-center">
                {rank}
              </div>
            ))}
          </div>

          {/* 8x8 Grid of Board Squares with rounded corners */}
          <div className="grid grid-cols-8 grid-rows-8 gap-0 overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 flex-1 h-[320px] md:h-[400px] shadow-2xl">
            {displayRanks.map((rank, rIdx) => {
              return displayFiles.map((file, fIdx) => {
                const squareCode = `${file}${rank}`;
                
                // Get standard indices for the boardState matrix
                const matrixRow = 8 - rank;
                const matrixCol = file.charCodeAt(0) - 97;
                const piece = boardState[matrixRow]?.[matrixCol];

                // Determine coloring - sleek Slate / Dark Slate colorway
                const isDarkSquare = (matrixRow + matrixCol) % 2 === 1;
                const baseBg = isDarkSquare 
                  ? 'bg-slate-700/90 hover:bg-slate-700 transition-colors' 
                  : 'bg-slate-200 hover:bg-slate-100 transition-colors';

                // Highlighting & indicators
                const isSelected = selectedSquare === squareCode;
                const isValidTarget = validMoves.includes(squareCode);
                const isKingInCheck = isCheck && kingSquare === squareCode;
                const isLastMoveSrc = lastMove && lastMove.from === squareCode;
                const isLastMoveDst = lastMove && lastMove.to === squareCode;

                const isFrozen = !!(frozenSquares[squareCode] && frozenSquares[squareCode] > 0);
                const isSpellTarget = !!(activeSpell && spellValidTargets.includes(squareCode));

                let squareOverlay = '';
                if (isSpellTarget) {
                  if (activeSpell === 'fireball') {
                    squareOverlay = 'bg-rose-600/35 ring-2 ring-rose-500 animate-[pulse_1.0s_infinite] z-40 cursor-crosshair';
                  } else if (activeSpell === 'freeze') {
                    squareOverlay = 'bg-cyan-500/25 ring-2 ring-cyan-400 animate-[pulse_1.0s_infinite] z-40 cursor-crosshair';
                  } else if (activeSpell === 'teleport') {
                    squareOverlay = 'bg-purple-600/25 ring-2 ring-purple-500 animate-[pulse_1.4s_infinite] z-40 cursor-pointer';
                  } else if (activeSpell === 'summon') {
                    squareOverlay = 'bg-emerald-500/20 ring-2 ring-emerald-400 animate-[pulse_1.2s_infinite] z-40 cursor-pointer';
                  } else if (activeSpell === 'upgrade') {
                    squareOverlay = 'bg-amber-500/20 ring-2 ring-amber-400 animate-pulse z-40 cursor-pointer';
                  }
                } else if (isKingInCheck) {
                  squareOverlay = 'bg-rose-500/25 ring-2 ring-rose-500/80 z-10 animate-pulse';
                } else if (isSelected) {
                  squareOverlay = 'bg-blue-500/15 ring-2 ring-blue-500/80 z-10';
                } else if (isValidTarget) {
                  squareOverlay = 'bg-emerald-500/10 ring-1 ring-emerald-500/30 cursor-pointer z-10';
                } else if (isLastMoveDst) {
                  squareOverlay = isDarkSquare 
                    ? 'bg-amber-500/30 ring-2 ring-amber-400/50 z-10' 
                    : 'bg-yellow-500/35 ring-2 ring-yellow-400/50 z-10';
                } else if (isLastMoveSrc) {
                  squareOverlay = isDarkSquare 
                    ? 'bg-amber-500/15 border border-dashed border-amber-400/30 z-10' 
                    : 'bg-yellow-500/20 border border-dashed border-yellow-400/40 z-10';
                }

                return (
                  <div
                    id={`square-${squareCode}`}
                    key={squareCode}
                    onClick={() => handleSquareClick(squareCode)}
                    className={`relative flex items-center justify-center cursor-pointer ${baseBg}`}
                    style={{ aspectRatio: '1/1' }}
                  >
                    {/* Modern coordinate text overlay (subtle bottom-right corner) */}
                    <span 
                       className={`absolute bottom-0.5 right-0.5 text-[7px] font-mono font-medium select-none pointer-events-none opacity-25 ${
                        isDarkSquare ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {squareCode}
                    </span>

                    {/* Active highlight overlay */}
                    {squareOverlay && (
                      <div className={`absolute inset-0 ${squareOverlay}`} />
                    )}

                    {/* Frozen stasis overlay */}
                    {isFrozen && (
                      <div className="absolute inset-0 bg-cyan-400/15 ring-2 ring-cyan-400/50 flex flex-col items-center justify-center pointer-events-none z-30 select-none">
                        <span className="scale-[0.8] tracking-widest font-mono font-bold bg-zinc-950/85 text-[8px] text-cyan-300 border border-cyan-800 rounded px-1.5 py-0.5 leading-none shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                          ❄️ FROZEN
                        </span>
                      </div>
                    )}

                    {/* dot inside valid empty squares */}
                    {isValidTarget && !piece && (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399] z-10" />
                    )}

                    {/* Ultra-subtle identifier tag just to guide visual accessibility */}
                    {piece && (
                      <span className={`absolute top-0.5 left-0.5 text-[6.5px] scale-[0.75] origin-top-left font-mono font-medium px-1 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.3)] bg-zinc-950/80 pointer-events-none select-none z-30 transition-all uppercase leading-none ${
                        piece.color === 'w' 
                          ? 'text-zinc-350 border border-zinc-800' 
                          : 'text-zinc-400 border border-zinc-800'
                      }`}>
                        {piece.type === 'p' ? 'p' : piece.type === 'n' ? 'n' : piece.type === 'b' ? 'b' : piece.type === 'r' ? 'r' : piece.type === 'q' ? 'q' : 'k'}
                      </span>
                    )}

                    {/* Piece renderer */}
                    {piece && (
                      <RetroChessPiece
                        type={piece.type}
                        color={piece.color}
                        size={36}
                        className="transition-transform active:scale-95 z-20 w-[80%] h-[80%]"
                      />
                    )}
                  </div>
                );
              });
            })}
          </div>

          {/* Right Rank Labels */}
          <div className="flex flex-col h-[320px] md:h-[400px] justify-around pl-4 font-semibold font-mono text-[10px] text-zinc-500">
            {displayRanks.map(rank => (
              <div key={`right-${rank}`} className="h-10 flex items-center justify-center">
                {rank}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom File Labels */}
        <div className="flex w-full mt-3 px-8 justify-around font-semibold font-mono text-[10px] text-zinc-500 tracking-wider">
          {displayFiles.map(file => (
            <div key={`bottom-${file}`} className="w-10 text-center uppercase">
              {file}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RetroBoard;
