import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { retroAudio } from './utils/audio';
import { RetroChessPiece } from './components/ChessPieces';
import { getMinimaxMove } from './utils/fallbackEngine';
import { RetroDialog } from './components/ui/RetroDialog';
import { RetroSheet } from './components/ui/RetroSheet';
import { TerminalLog } from './components/TerminalLog';
import { RetroBoard } from './components/RetroBoard';
import { LogEntry, GameSettings, GameStatus, GameWinner, AIMode, PlayerColor } from './types';
import {
  Settings,
  RefreshCw,
  Volume2,
  VolumeX,
  Trophy,
  User,
  Monitor,
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

const DEFAULT_SETTINGS: GameSettings = {
  lmStudioUrl: 'http://localhost:1234/v1/chat/completions',
  modelId: 'gemma',
  aiMode: 'local-minimax',
  difficulty: 'medium',
  playerColor: 'white',
  initTimeMinutes: 10
};

export default function App() {
  const [chess] = useState(() => new Chess());
  const [boardState, setBoardState] = useState(() => chess.board());
  
  // Game state
  const [status, setStatus] = useState<GameStatus>('menu');
  const [winner, setWinner] = useState<GameWinner>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [isCheck, setIsCheck] = useState(false);
  const [kingSquare, setKingSquare] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Selection state
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  
  // Clocks
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isClockRunning, setIsClockRunning] = useState(false);

  // Captured pieces lists
  const [capturedWhite, setCapturedWhite] = useState<any[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<any[]>([]);

  // Logs stream
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Settings & Navigation panels
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  // Pawn Promotion trigger details
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);

  // Last Move tracker
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Adventure Spell-Casting states
  const [whiteMana, setWhiteMana] = useState<number>(3);
  const [blackMana, setBlackMana] = useState<number>(3);
  const [frozenSquares, setFrozenSquares] = useState<Record<string, number>>({});
  const [activeSpell, setActiveSpell] = useState<'fireball' | 'freeze' | 'teleport' | 'summon' | 'upgrade' | null>(null);
  const [spellTargetStep, setSpellTargetStep] = useState<number>(1);
  const [spellSelectedSquare, setSpellSelectedSquare] = useState<string | null>(null);

  const getSpellValidTargets = (): string[] => {
    if (!activeSpell) return [];
    
    const targets: string[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const playerColorChar = playerColor;
    
    for (let rank = 1; rank <= 8; rank++) {
      for (const file of files) {
        const squareCode = `${file}${rank}`;
        const piece = chess.get(squareCode as Square);
        
        if (activeSpell === 'fireball') {
          if (piece && piece.color !== playerColorChar && piece.type !== 'k') {
            targets.push(squareCode);
          }
        } else if (activeSpell === 'freeze') {
          if (piece && piece.color !== playerColorChar && piece.type !== 'k') {
            targets.push(squareCode);
          }
        } else if (activeSpell === 'teleport') {
          if (spellTargetStep === 1) {
            if (piece && piece.color === playerColorChar && piece.type !== 'k') {
              targets.push(squareCode);
            }
          } else {
            if (!piece) {
              targets.push(squareCode);
            }
          }
        } else if (activeSpell === 'summon') {
          if (!piece) {
            const isWhiteHalf = playerColorChar === 'w' ? (rank === 1 || rank === 2 || rank === 3 || rank === 4) : false;
            const isBlackHalf = playerColorChar === 'b' ? (rank === 5 || rank === 6 || rank === 7 || rank === 8) : false;
            
            if (isWhiteHalf || isBlackHalf) {
              targets.push(squareCode);
            }
          }
        } else if (activeSpell === 'upgrade') {
          if (piece && piece.color === playerColorChar && piece.type === 'p') {
            targets.push(squareCode);
          }
        }
      }
    }
    
    return targets;
  };

  const passTurn = (c: Chess) => {
    const fen = c.fen();
    const tokens = fen.split(' ');
    tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    tokens[3] = '-';
    c.load(tokens.join(' '));
  };

  // Timers and references
  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize first game logs
  useEffect(() => {
    addLog('System booting...', 'system');
    addLog('Retro Chess Arcade online. Good luck!', 'success');
  }, []);

  // Update sound state inside audio player
  useEffect(() => {
    retroAudio.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Log addition helper
  const addLog = (text: string, type: LogEntry['type']) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp,
        text,
        type
      }
    ]);
  };

  // Keep tracking game state after moves
  const updateGameState = (overrideLastMove?: { from: string; to: string } | null) => {
    const freshBoard = chess.board();
    setBoardState(freshBoard);

    if (overrideLastMove !== undefined) {
      setLastMove(overrideLastMove);
    } else {
      // Track the last move from game history
      const history = chess.history({ verbose: true });
      const last = history[history.length - 1] || null;
      if (last) {
        setLastMove({ from: last.from, to: last.to });
      } else {
        setLastMove(null);
      }
    }

    const checkState = chess.inCheck();
    setIsCheck(checkState);

    // Dynamic Adventure Game mechanics: update Mana & Frozen pieces when current turn begins
    const currentTurn = chess.turn(); // 'w' or 'b'
    
    // Gain +2 Mana per turn (max 10)
    if (currentTurn === 'w') {
      setWhiteMana(prev => Math.min(10, prev + 2));
    } else {
      setBlackMana(prev => Math.min(10, prev + 2));
    }

    setFrozenSquares(prev => {
      const nextFrozen = { ...prev };
      let updated = false;
      Object.keys(nextFrozen).forEach(sq => {
        const pieceOnSq = chess.get(sq as Square);
        if (pieceOnSq && pieceOnSq.color === currentTurn) {
          if (nextFrozen[sq] > 0) {
            nextFrozen[sq]--;
            if (nextFrozen[sq] <= 0) {
              delete nextFrozen[sq];
            }
            updated = true;
          }
        } else if (!pieceOnSq) {
          delete nextFrozen[sq];
          updated = true;
        }
      });
      return updated ? nextFrozen : prev;
    });

    // Compute King's square if in check for styling
    if (checkState) {
      retroAudio.playCheck();
      let activeKingSq: string | null = null;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = freshBoard[r][c];
          if (p && p.type === 'k' && p.color === chess.turn()) {
            activeKingSq = `${String.fromCharCode(97 + c)}${8 - r}`;
            break;
          }
        }
      }
      setKingSquare(activeKingSq);
      addLog(`CHECK INFLICTED ON THE ${chess.turn() === 'w' ? 'WHITE' : 'BLACK'} KING!`, 'warning');
    } else {
      setKingSquare(null);
    }

    // Determine missing/captured pieces
    const defaultCounts = {
      w: { p: 8, n: 2, b: 2, r: 2, q: 1 },
      b: { p: 8, n: 2, b: 2, r: 2, q: 1 }
    };
    const activeCounts = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };
    freshBoard.forEach(row => {
      row.forEach(p => {
        if (p && p.type !== 'k') {
          activeCounts[p.color as 'w' | 'b'][p.type as 'p'|'n'|'b'|'r'|'q']++;
        }
      });
    });

    const parsedCapturedWhite: any[] = [];
    const parsedCapturedBlack: any[] = [];

    (['p', 'n', 'b', 'r', 'q'] as const).forEach(type => {
      const missingWhite = Math.max(0, defaultCounts.w[type] - activeCounts.w[type]);
      for (let i = 0; i < missingWhite; i++) parsedCapturedWhite.push({ type, color: 'w' });

      const missingBlack = Math.max(0, defaultCounts.b[type] - activeCounts.b[type]);
      for (let i = 0; i < missingBlack; i++) parsedCapturedBlack.push({ type, color: 'b' });
    });

    setCapturedWhite(parsedCapturedWhite);
    setCapturedBlack(parsedCapturedBlack);

    // Turn log
    const turnStr = chess.turn() === 'w' ? 'WHITE' : 'BLACK';

    // Game End Conditions
    if (chess.isGameOver()) {
      setIsClockRunning(false);
      let gameWinner: GameWinner = null;
      let reason = '';

      if (chess.isCheckmate()) {
        const losingTurn = chess.turn();
        gameWinner = losingTurn === 'w' ? 'black' : 'white';
        reason = `CHECKMATE! ${gameWinner.toUpperCase()} WINS THE MATCH.`;
        setStatus('checkmate');
        setWinner(gameWinner);
        retroAudio.playGameOver(gameWinner === playerColor);
      } else if (chess.isDraw()) {
        gameWinner = 'draw';
        setStatus('draw');
        setWinner('draw');
        retroAudio.playGameOver(false);
        if (chess.isStalemate()) reason = 'DRAW BY STALEMATE!';
        else if (chess.isThreefoldRepetition()) reason = 'DRAW BY THREEFOLD REPETITION.';
        else reason = 'DRAW ACHIEVED (INS_MATERIAL / 50_MOVES_RULE).';
      }

      addLog(`GAME CONCLUDED: ${reason}`, 'success');
    } else {
      // If the game continues, trigger the next turn
      if (chess.turn() !== playerColor) {
        triggerAIOpponent();
      }
    }
  };

  // Timer interval scheduler
  useEffect(() => {
    if (isClockRunning && status === 'playing') {
      clockIntervalRef.current = setInterval(() => {
        const currentTurn = chess.turn();
        if (currentTurn === 'w') {
          setWhiteTime(prev => {
            if (prev <= 1) {
              handleTimeOut('w');
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime(prev => {
            if (prev <= 1) {
              handleTimeOut('b');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    }

    return () => {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    };
  }, [isClockRunning, status, chess.turn()]);

  // Turn timeout handler
  const handleTimeOut = (losingColor: 'w' | 'b') => {
    setIsClockRunning(false);
    const victoriousColor = losingColor === 'w' ? 'black' : 'white';
    setStatus('checkmate');
    setWinner(victoriousColor as GameWinner);
    retroAudio.playGameOver(victoriousColor === playerColor);
    addLog(`MATCH CONCLUDED: ${losingColor === 'w' ? 'WHITE' : 'BLACK'} RAN OUT OF TIME!`, 'warning');
    addLog(`${victoriousColor.toUpperCase()} WINS BY FORFEIT.`, 'success');
  };

  // Initiating AI's Move Computation (with Spell Casting and Frozen piece stasis logic)
  const triggerAIOpponent = () => {
    setIsThinking(true);
    // Introduce 1-second delay for smooth realistic thinking effect
    setTimeout(async () => {
      const legalMoves = chess.moves({ verbose: true });
      if (legalMoves.length === 0) {
        setIsThinking(false);
        return;
      }

      const activeColor = chess.turn();

      // Filter out any moves originating from frozen squares for the AI!
      const legalMovesFiltered = legalMoves.filter(m => {
        const isFromFrozen = frozenSquares[m.from] && frozenSquares[m.from] > 0;
        return !isFromFrozen;
      });

      // Special check: if all pieces of active turn are frozen, AI must pass!
      if (legalMovesFiltered.length === 0) {
        addLog(`❄️ All AI pieces are locked in frost stasis! Turn passed to Player.`, 'warning');
        passTurn(chess);
        updateGameState();
        setIsThinking(false);
        return;
      }

      // 1. AI Spell Casting Check
      const aiMana = playerColor === 'w' ? blackMana : whiteMana;
      const opponentColor = playerColor;
      const aiColor = activeColor;
      
      const canCast = aiMana >= 3 && Math.random() < (settings.difficulty === 'hard' ? 0.40 : settings.difficulty === 'medium' ? 0.25 : 0.12);
      
      if (canCast) {
        // Find player pieces and AI half vacant squares
        const playerPieces: { square: string; type: string; value: number }[] = [];
        const aiEmptySquares: string[] = [];
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        for (let r = 1; r <= 8; r++) {
          for (const f of files) {
            const sq = `${f}${r}`;
            const p = chess.get(sq as Square);
            
            if (p) {
              if (p.color === opponentColor && p.type !== 'k') {
                const val = p.type === 'q' ? 9 : p.type === 'r' ? 5 : p.type === 'b' ? 3 : p.type === 'n' ? 3 : 1;
                playerPieces.push({ square: sq, type: p.type, value: val });
              }
            } else {
              // Empty squares on AI half of the board
              const isAiWhiteHalf = aiColor === 'w' ? (r === 1 || r === 2 || r === 3 || r === 4) : false;
              const isAiBlackHalf = aiColor === 'b' ? (r === 5 || r === 6 || r === 7 || r === 8) : false;
              if (isAiWhiteHalf || isAiBlackHalf) {
                aiEmptySquares.push(sq);
              }
            }
          }
        }
        
        // Sort pieces descending by value (Queen, Rook, Bishop, Knight, Pawn)
        playerPieces.sort((a, b) => b.value - a.value);
        
        // Let's decide which spell to cast:
        if (aiMana >= 7 && playerPieces.length > 0 && Math.random() < 0.7) {
          // FIREBALL PLAYER'S BEST PIECE!
          const target = playerPieces[0];
          chess.remove(target.square as Square);
          
          if (playerColor === 'w') {
            setBlackMana(prev => Math.max(0, prev - 7));
          } else {
            setWhiteMana(prev => Math.max(0, prev - 7));
          }
          
          retroAudio.playSpellFlame();
          addLog(`🤖 AI OPPOSE casts METEOR FIREBALL vaporizing your ${target.type.toUpperCase()} at ${target.square.toUpperCase()}!`, 'warning');
          
          passTurn(chess);
          updateGameState();
          setIsThinking(false);
          return;
        } 
        else if (aiMana >= 4 && playerPieces.filter(p => !frozenSquares[p.square]).length > 0) {
          // FREEZE PLAYER'S BEST ACTIVE PIECE!
          const activePieces = playerPieces.filter(p => !frozenSquares[p.square]);
          const target = activePieces[0];
          
          setFrozenSquares(prev => ({ ...prev, [target.square]: 2 }));
          
          if (playerColor === 'w') {
            setBlackMana(prev => Math.max(0, prev - 4));
          } else {
            setWhiteMana(prev => Math.max(0, prev - 4));
          }
          
          retroAudio.playSpellFreeze();
          addLog(`🤖 AI OPPOSE casts FROST STASIS, freezing your ${target.type.toUpperCase()} at ${target.square.toUpperCase()} for 2 turns!`, 'warning');
          
          passTurn(chess);
          updateGameState();
          setIsThinking(false);
          return;
        }
        else if (aiMana >= 3 && aiEmptySquares.length > 0) {
          // SUMMON PIECE!
          const targetSq = aiEmptySquares[Math.floor(Math.random() * aiEmptySquares.length)];
          chess.put({ type: 'p', color: aiColor }, targetSq as Square);
          
          if (playerColor === 'w') {
            setBlackMana(prev => Math.max(0, prev - 3));
          } else {
            setWhiteMana(prev => Math.max(0, prev - 3));
          }
          
          retroAudio.playSpellSummon();
          addLog(`🤖 AI OPPOSE casts SUMMON Golem, materializing a Pawn at ${targetSq.toUpperCase()}!`, 'warning');
          
          passTurn(chess);
          updateGameState();
          setIsThinking(false);
          return;
        }
      }

      addLog(`AI opponent computation started...`, 'ai-thought');

      if (settings.aiMode === 'local-minimax') {
        // Run positional local Minimax search
        try {
          const move = getMinimaxMove(chess, settings.difficulty);
          let matchedMove = findMoveInLegal(move, legalMovesFiltered);
          
          // Fallback if calculated move is barred due to frozen stasis
          if (!matchedMove && legalMovesFiltered.length > 0) {
            const captures = legalMovesFiltered.filter(m => m.captured);
            matchedMove = captures.length > 0
              ? captures[Math.floor(Math.random() * captures.length)]
              : legalMovesFiltered[Math.floor(Math.random() * legalMovesFiltered.length)];
          }

          if (matchedMove) {
            addLog(`Local Engine Selects Move: "${matchedMove.san}"`, 'ai-action');
            chess.move({ from: matchedMove.from, to: matchedMove.to, promotion: matchedMove.promotion || 'q' });
            
            if (matchedMove.captured) {
              retroAudio.playCapture();
            } else {
              retroAudio.playMove();
            }
            
            setSelectedSquare(null);
            setValidMoves([]);
            updateGameState();
          } else {
            addLog(`Local Engine predicted move "${move}" which was determined to be invalid. Routing to fallback target correction...`, 'warning');
            playFallbackMove(legalMovesFiltered);
          }
        } catch (err: any) {
          addLog(`Local Engine error: ${err.message}`, 'warning');
          playFallbackMove(legalMovesFiltered);
        } finally {
          setIsThinking(false);
        }
      } else {
        // LM Studio Gemma Integration (using legalMovesFiltered to make sure we don't expose frozen options to LLM!)
        addLog(`Querying LLM server endpoint at ${settings.lmStudioUrl}...`, 'system');
        const boardFen = chess.fen();
        const boardPgn = chess.pgn();
        const movesList = legalMovesFiltered.map(m => {
          const uci = `${m.from}${m.to}${m.promotion || ''}`;
          return `${uci} (or SAN: ${m.san})`;
        }).join(', ');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

        try {
          const response = await fetch(settings.lmStudioUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: settings.modelId,
              messages: [
                {
                  role: 'system',
                  content: `You are an elite chess engine. You compute illegal and legal options and return exactly one legal move. Response format must strictly be a raw JSON object like: {"move": "e2e4"}. Follow instructions exactly.`
                },
                {
                  role: 'user',
                  content: `ACTUAL GAME TELEMETRY:\nFEN: ${boardFen}\nPGN HISTORY: ${boardPgn || 'None yet'}\nLEGAL MOVES FOR YOU TO SELECT: ${movesList}\n\nAnalyze and select one move. Respond strictly using raw JSON layout: {"move": "YOUR_MOVE_HERE"}. Do not include markdown headers, thoughts, conversational remarks, or extra characters.`
                }
              ],
              temperature: 0.1,
              max_tokens: 64
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`LM Studio HTTP server error! Code: ${response.status}`);
          }

          const data = await response.json();
          const rawRep = data.choices?.[0]?.message?.content || '';
          addLog(`Gemma Raw Response: "${rawRep.replace(/[\n\r]/g, ' ')}"`, 'ai-thought');

          // Deep matching parser with strict validation
          const matchedMove = extractAndVerifyMove(rawRep, legalMovesFiltered);
          if (matchedMove) {
            addLog(`Gemma Selected Move: "${matchedMove.san}"`, 'ai-action');
            chess.move({ from: matchedMove.from, to: matchedMove.to, promotion: matchedMove.promotion || 'q' });
            
            if (matchedMove.captured) {
              retroAudio.playCapture();
            } else {
              retroAudio.playMove();
            }
            
            setSelectedSquare(null);
            setValidMoves([]);
            updateGameState();
          } else {
            addLog(`LM server outputted unparsable or illegal move. Activating move correction...`, 'warning');
            playFallbackMove(legalMovesFiltered);
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          const errorMsg = err.name === 'AbortError' 
            ? 'LM Studio Server timed out (over 12 seconds).' 
            : `LM Studio Offline/Failed to fetch: ${err.message}`;

          addLog(`Connection Error: ${errorMsg}`, 'warning');
          addLog(`Falling back to local minimax decision engine...`, 'warning');
          
          playFallbackMove(legalMovesFiltered);
        } finally {
          setIsThinking(false);
        }
      }
    }, 1000);
  };

  // Helper parser targeting various model response permutations
  const extractAndVerifyMove = (responseText: string, legalMoves: any[]): any | null => {
    let clean = responseText.trim();
    
    // Snip markdown wrap fences if model output gets codeblock wrappers
    if (clean.includes('```')) {
      const parts = clean.split('\n');
      const filtered = parts.filter(p => !p.includes('```') && !p.toLowerCase().includes('json'));
      clean = filtered.join('\n').trim();
    }

    // Try direct object parsing
    try {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed.move === 'string') {
        const parsedCode = parsed.move.trim();
        const match = findMoveInLegal(parsedCode, legalMoves);
        if (match) return match;
      }
    } catch (e) {
      // JSON parse failed, try Regex
    }

    // Regex match 1: searching for {"move": "..."}
    const jsonReg = /"move"\s*:\s*"([^"]+)"/i;
    const matchJson = clean.match(jsonReg);
    if (matchJson && matchJson[1]) {
      const match = findMoveInLegal(matchJson[1].trim(), legalMoves);
      if (match) return match;
    }

    // Regex match 2: searching for generic coordinate formats like e2e4 or e7e8q
    const uciReg = /\b([a-h][1-8][a-h][1-8][qrbn]?)\b/i;
    const matchUci = clean.match(uciReg);
    if (matchUci && matchUci[1]) {
      const match = findMoveInLegal(matchUci[1].toLowerCase(), legalMoves);
      if (match) return match;
    }

    // Regex match 3: split words/alphanumerics and cross-reference with legal SANs
    const words = clean.replace(/[.,:;{}()"[\]]/g, ' ').split(/\s+/);
    for (const w of words) {
      const match = findMoveInLegal(w, legalMoves);
      if (match) return match;
    }

    return null;
  };

  const findMoveInLegal = (targetStr: string, legalMoves: any[]): any | null => {
    const wordClean = targetStr.trim().toLowerCase();
    if (!wordClean) return null;

    return legalMoves.find(m => {
      const uci = `${m.from}${m.to}${m.promotion || ''}`.toLowerCase();
      const san = m.san.toLowerCase();
      const lan = (m.lan || '').toLowerCase();
      return wordClean === uci || wordClean === san || wordClean === lan;
    }) || null;
  };

  // Fallback engine caller with strict target verification from chess.js
  const playFallbackMove = (legalMoves: any[]) => {
    addLog(`Activating local fallback routine...`, 'system');
    
    try {
      const move = getMinimaxMove(chess, 'easy');
      const matchedMove = findMoveInLegal(move, legalMoves);
      
      if (matchedMove) {
        addLog(`Fallback Selects verified move: "${matchedMove.san}"`, 'ai-action');
        chess.move({ from: matchedMove.from, to: matchedMove.to, promotion: matchedMove.promotion || 'q' });
        
        if (matchedMove.captured) {
          retroAudio.playCapture();
        } else {
          retroAudio.playMove();
        }
        
        setSelectedSquare(null);
        setValidMoves([]);
        updateGameState();
      } else {
        throw new Error('Local fallback predicted move was not flagged as list-legal.');
      }
    } catch (e) {
      // Absolute safeties worst case fallback: first available literal legal move directly
      const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
      addLog(`Safety verification complete. Executing verified safe move: "${randomMove.san}"`, 'ai-action');
      chess.move({ from: randomMove.from, to: randomMove.to, promotion: randomMove.promotion || 'q' });
      
      if (randomMove.captured) {
        retroAudio.playCapture();
      } else {
        retroAudio.playMove();
      }
      
      setSelectedSquare(null);
      setValidMoves([]);
      updateGameState();
    }
  };

  // Human player square press coordinator
  const handleSquareClick = (squareCode: string) => {
    if (status !== 'playing' || isThinking) return;

    // A. Spell-casting overrides standard coordinate selection
    if (activeSpell) {
      const spellTargets = getSpellValidTargets();
      if (!spellTargets.includes(squareCode)) {
        // Cancel active spell mode if player taps outside target squares
        setActiveSpell(null);
        setSpellTargetStep(1);
        setSpellSelectedSquare(null);
        addLog(`Spell channel canceled.`, 'system');
        retroAudio.playClick();
        return;
      }

      // Execute spell casting branch based on active spell
      if (activeSpell === 'fireball') {
        chess.remove(squareCode as Square);
        if (playerColor === 'w') {
          setWhiteMana(prev => Math.max(0, prev - 7));
        } else {
          setBlackMana(prev => Math.max(0, prev - 7));
        }
        retroAudio.playSpellFlame();
        addLog(`🔥 Wizard cast METEOR FIREBALL vaporizing Enemy piece at ${squareCode.toUpperCase()}!`, 'player-action');
        
        setActiveSpell(null);
        setSpellTargetStep(1);
        setSpellSelectedSquare(null);
        setSelectedSquare(null);
        setValidMoves([]);
        passTurn(chess);
        updateGameState();
      } else if (activeSpell === 'freeze') {
        setFrozenSquares(prev => ({ ...prev, [squareCode]: 2 }));
        if (playerColor === 'w') {
          setWhiteMana(prev => Math.max(0, prev - 4));
        } else {
          setBlackMana(prev => Math.max(0, prev - 4));
        }
        retroAudio.playSpellFreeze();
        addLog(`❄️ Wizard cast FROST STASIS, freezing Enemy piece at ${squareCode.toUpperCase()} for 2 turns!`, 'player-action');
        
        setActiveSpell(null);
        setSpellTargetStep(1);
        setSpellSelectedSquare(null);
        setSelectedSquare(null);
        setValidMoves([]);
        passTurn(chess);
        updateGameState();
      } else if (activeSpell === 'teleport') {
        if (spellTargetStep === 1) {
          setSpellSelectedSquare(squareCode);
          setSpellTargetStep(2);
          retroAudio.playClick();
        } else {
          const origin = spellSelectedSquare!;
          const pieceObj = chess.get(origin as Square);
          if (pieceObj) {
            chess.remove(origin as Square);
            chess.put({ type: pieceObj.type, color: pieceObj.color }, squareCode as Square);
            
            // Transfer freeze
            if (frozenSquares[origin]) {
              setFrozenSquares(prev => {
                const copy = { ...prev };
                delete copy[origin];
                copy[squareCode] = prev[origin];
                return copy;
              });
            }
          }
          if (playerColor === 'w') {
            setWhiteMana(prev => Math.max(0, prev - 5));
          } else {
            setBlackMana(prev => Math.max(0, prev - 5));
          }
          retroAudio.playSpellTeleport();
          addLog(`🌀 Wizard cast PHASE SHIFT, teleporting piece from ${origin.toUpperCase()} to ${squareCode.toUpperCase()}!`, 'player-action');
          
          setActiveSpell(null);
          setSpellTargetStep(1);
          setSpellSelectedSquare(null);
          setSelectedSquare(null);
          setValidMoves([]);
          passTurn(chess);
          updateGameState({ from: origin, to: squareCode });
        }
      } else if (activeSpell === 'summon') {
        chess.put({ type: 'p', color: playerColor }, squareCode as Square);
        if (playerColor === 'w') {
          setWhiteMana(prev => Math.max(0, prev - 3));
        } else {
          setBlackMana(prev => Math.max(0, prev - 3));
        }
        retroAudio.playSpellSummon();
        addLog(`🌱 Wizard cast SUMMON SKELETON, materializing a Pawn at ${squareCode.toUpperCase()}!`, 'player-action');
        
        setActiveSpell(null);
        setSpellTargetStep(1);
        setSpellSelectedSquare(null);
        setSelectedSquare(null);
        setValidMoves([]);
        passTurn(chess);
        updateGameState();
      } else if (activeSpell === 'upgrade') {
        chess.remove(squareCode as Square);
        chess.put({ type: 'n', color: playerColor }, squareCode as Square);
        if (playerColor === 'w') {
          setWhiteMana(prev => Math.max(0, prev - 5));
        } else {
          setBlackMana(prev => Math.max(0, prev - 5));
        }
        retroAudio.playSpellSummon();
        addLog(`✨ Wizard cast ALCHEMIC TRANSMUTE, transforming Pawn at ${squareCode.toUpperCase()} into a Battle Knight!`, 'player-action');
        
        setActiveSpell(null);
        setSpellTargetStep(1);
        setSpellSelectedSquare(null);
        setSelectedSquare(null);
        setValidMoves([]);
        passTurn(chess);
        updateGameState();
      }
      return;
    }

    // B. Block movement for frozen pieces
    const isFrozen = !!(frozenSquares[squareCode] && frozenSquares[squareCode] > 0);
    if (isFrozen) {
      retroAudio.playCheck(); // alerts user
      addLog(`❄️ Blocked: Piece at ${squareCode.toUpperCase()} is frozen in stasis and cannot move.`, 'warning');
      return;
    }

    // Check if clicked square has a human piece
    const piece = chess.get(squareCode as Square);
    const isPlayerPiece = piece && piece.color === playerColor;

    // Clicked on standard valid target?
    if (validMoves.includes(squareCode)) {
      if (selectedSquare) {
        // Probe if it is pawn promotion trigger
        const isPromotionMove = (
          piece === null && 
          chess.get(selectedSquare as Square)?.type === 'p' && 
          ((playerColor === 'w' && squareCode[1] === '8') || (playerColor === 'b' && squareCode[1] === '1'))
        );

        if (isPromotionMove) {
          retroAudio.playClick();
          setPendingPromotion({ from: selectedSquare, to: squareCode });
        } else {
          // Play standard move
          try {
            const hasCapture = chess.get(squareCode as Square) !== null;
            chess.move({ from: selectedSquare, to: squareCode });
            
            if (hasCapture) {
              retroAudio.playCapture();
              addLog(`Player executed capture: ${selectedSquare} -> ${squareCode}`, 'player-action');
            } else {
              retroAudio.playMove();
              addLog(`Player moved: ${selectedSquare} -> ${squareCode}`, 'player-action');
            }

            setSelectedSquare(null);
            setValidMoves([]);
            updateGameState();
          } catch (err: any) {
            addLog(`Illegal move rejected: ${err.message}`, 'warning');
          }
        }
      }
    } else if (isPlayerPiece) {
      retroAudio.playClick();
      setSelectedSquare(squareCode);
      
      // Calculate valid moves for selected square
      const moves = chess.moves({ square: squareCode as Square, verbose: true });
      const targetSquares = moves.map(m => m.to);
      setValidMoves(targetSquares);
    } else {
      // Clear selection
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  // Launching the Retro Game
  const handleStartGame = () => {
    retroAudio.playMove();
    chess.reset();
    setSelectedSquare(null);
    setValidMoves([]);
    setIsThinking(false);

    // Reset Adventure Spell states
    setWhiteMana(3);
    setBlackMana(3);
    setFrozenSquares({});
    setActiveSpell(null);
    setSpellTargetStep(1);
    setSpellSelectedSquare(null);
    setLastMove(null);

    // Color Setup
    let chosenColor: 'w' | 'b' = 'w';
    if (settings.playerColor === 'black') {
      chosenColor = 'b';
    } else if (settings.playerColor === 'random') {
      chosenColor = Math.random() < 0.5 ? 'w' : 'b';
    }
    setPlayerColor(chosenColor);

    // Timers setup
    const initialSecs = settings.initTimeMinutes * 60;
    setWhiteTime(initialSecs);
    setBlackTime(initialSecs);
    
    // Status
    setStatus('playing');
    setWinner(null);
    setIsCheck(false);
    setKingSquare(null);
    setPendingPromotion(null);
    setIsClockRunning(true);

    addLog(`-- ENTRANCE TO CHESS DUNGEON INITIATED --`, 'success');
    addLog(`YOU ARE PLAYING AS ${chosenColor === 'w' ? 'WHITE' : 'BLACK'}.`, 'success');
    addLog(`AI SYSTEM CONFIGURED FOR: ${settings.aiMode.toUpperCase()} (${settings.difficulty})`, 'system');

    // Trigger update and potentially AI first turn
    setBoardState(chess.board());
    setCapturedWhite([]);
    setCapturedBlack([]);

    if (chosenColor === 'b') {
      // AI goes first!
      addLog(`WHITE TURN ACTIVE: AI Computing opening maneuver...`, 'system');
      triggerAIOpponent();
    }
  };

  // Promotion chooser finalizer
  const handlePromoSelect = (promotionPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    
    try {
      const { from, to } = pendingPromotion;
      const isCapturing = chess.get(to as Square) !== null;
      
      chess.move({ from, to, promotion: promotionPiece });
      
      if (isCapturing) {
        retroAudio.playCapture();
        addLog(`Pawn promoted to ${promotionPiece.toUpperCase()} with capture!`, 'player-action');
      } else {
        retroAudio.playMove();
        addLog(`Pawn promoted to ${promotionPiece.toUpperCase()}!`, 'player-action');
      }

      setPendingPromotion(null);
      setSelectedSquare(null);
      setValidMoves([]);
      updateGameState();
    } catch (err: any) {
      addLog(`Promotion failed: ${err.message}`, 'warning');
      setPendingPromotion(null);
    }
  };

  // Connection tester inside setting side drawer
  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    addLog(`TESTING CONNECTION TO LM STUDIO SERVER AT: ${settings.lmStudioUrl}...`, 'system');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds ping timeout

    try {
      // Query models list or completions root. Completions endpoint accepts POST.
      // We can make an lightweight pre-flight completion or list-models get request!
      // Let's do a fast completions test that fails quickly if offline.
      const urlRoot = settings.lmStudioUrl;
      const res = await fetch(urlRoot, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.modelId,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setConnectionStatus('success');
        addLog(`[OK] LM STUDIO RUNNING ON PORT 1234. SUCCESSFUL RESPONSE.`, 'success');
      } else {
        setConnectionStatus('failed');
        addLog(`[WARN] SERVER PRESENT BUT RETURNED ERROR STATUS ${res.status}. CHECK MODEL ID.`, 'warning');
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      setConnectionStatus('failed');
      addLog(`[WARN] LM STUDIO OFFLINE. SECURE INGRESS BLOCKED OR LM STUDIO NOT RUNNING LOCALLY.`, 'warning');
    }
  };

  // Format second timer to MM:SS
  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = timeInSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Back to start screen
  const quitToMenu = () => {
    retroAudio.playClick();
    setIsClockRunning(false);
    setStatus('menu');
    setWinner(null);
  };

  return (
    <div className="min-h-screen bg-immersive-radial text-zinc-100 font-sans flex flex-col items-center justify-center p-3 md:p-6 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* Immersive background ambient glowing nodes */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      {/* Main glass aesthetic floating engine dashboard console */}
      <div className="w-full max-w-5xl glass-panel border border-zinc-800 rounded-3xl shadow-2xl flex flex-col relative h-full overflow-hidden transition-all duration-305">
        
        {/* TOP COMPACT NAV HEADER */}
        <header className="bg-zinc-950/40 border-b border-zinc-800/60 py-4.5 px-6 md:px-8 flex items-center justify-between select-none relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-indigo-500 animate-pulse rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            <span className="font-sans text-xs md:text-sm tracking-widest text-zinc-300 font-bold uppercase">
              Chess Engine Arena
            </span>
          </div>
          
          <div className="flex items-center gap-2.5">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                retroAudio.playClick();
                setSoundEnabled(!soundEnabled);
              }}
              className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-2 text-zinc-400 hover:text-white active:scale-95 transition-all duration-200 cursor-pointer"
              title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 size={14} className="text-zinc-300" /> : <VolumeX size={14} className="text-zinc-450" />}
            </button>

            {/* Quick settings gear */}
            <button
              onClick={() => {
                retroAudio.playClick();
                setIsSettingsOpen(true);
              }}
              className="bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl p-2 text-zinc-400 hover:text-white active:scale-95 transition-all duration-200 cursor-pointer"
              title="Open settings"
            >
              <Settings size={14} className="text-zinc-300" />
            </button>
            
            {status !== 'menu' && (
              <button
                onClick={quitToMenu}
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:text-white text-zinc-300 px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all active:scale-95 uppercase cursor-pointer"
              >
                Exit Match
              </button>
            )}
          </div>
        </header>

        {/* ======================================================== */}
        {/* SCREEN MODULE STATE 1: MENU SCREEN (START SCREEN) */}
        {/* ======================================================== */}
        {status === 'menu' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 md:py-16 px-4">
            {/* Animated Title Card */}
            <div className="text-center mb-8 max-w-lg select-none">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2.5">
                Chess Arena
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 uppercase tracking-widest font-medium">
                Sleek Minimax Algorithm vs Gemini LLM Models
              </p>
            </div>

            {/* Main Menu Box */}
            <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 font-sans text-xs leading-relaxed space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* Option 1: Choose Side */}
              <div className="space-y-2 select-none">
                <span className="text-zinc-400 block uppercase font-bold text-[10px] tracking-wider">1. Choose Your Side:</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['white', 'black', 'random'] as const).map(color => (
                    <button
                      key={color}
                      onClick={() => {
                        retroAudio.playClick();
                        setSettings(prev => ({ ...prev, playerColor: color }));
                      }}
                      className={`py-2 px-1 rounded-xl border text-xs font-medium transition-all duration-200 capitalize flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        settings.playerColor === color
                          ? 'bg-zinc-800 border-zinc-705 border-zinc-650 text-white'
                          : 'bg-zinc-950/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 hover:border-zinc-700'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 2: Select Engine */}
              <div className="space-y-2 select-none">
                <span className="text-zinc-400 block uppercase font-bold text-[10px] tracking-wider">2. Select AI Opponent:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      retroAudio.playClick();
                      setSettings(prev => ({ ...prev, aiMode: 'local-minimax' }));
                    }}
                    className={`py-2 px-2 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1 cursor-pointer ${
                      settings.aiMode === 'local-minimax'
                        ? 'bg-zinc-800 border-zinc-650 text-white font-bold'
                        : 'bg-zinc-950/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <span>Local CPU</span>
                    <span className="text-[9px] tracking-wider font-normal text-zinc-400">(Offline Minimax)</span>
                  </button>

                  <button
                    onClick={() => {
                      retroAudio.playClick();
                      setSettings(prev => ({ ...prev, aiMode: 'lm-studio' }));
                    }}
                    className={`py-2 px-2 rounded-xl border transition-all duration-200 flex flex-col items-center gap-1 cursor-pointer ${
                      settings.aiMode === 'lm-studio'
                        ? 'bg-zinc-800 border-zinc-650 text-white font-bold'
                        : 'bg-zinc-950/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <span>Gemma Model</span>
                    <span className="text-[9px] tracking-wider font-normal text-zinc-400">(LM Studio API)</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Match duration */}
              <div className="space-y-2 select-none">
                <span className="text-zinc-400 block uppercase font-bold text-[10px] tracking-wider">3. Match Duration:</span>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  {([5, 10, 30, 60] as const).map(mins => (
                    <button
                      key={mins}
                      onClick={() => {
                        retroAudio.playClick();
                        setSettings(prev => ({ ...prev, initTimeMinutes: mins }));
                      }}
                      className={`py-2 rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                        settings.initTimeMinutes === mins
                          ? 'bg-zinc-800 border-zinc-650 text-white font-bold'
                          : 'bg-zinc-950/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 hover:border-zinc-700'
                      }`}
                    >
                      {mins} Min
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 4: Difficulty level */}
              <div className="space-y-2 select-none">
                <span className="text-zinc-400 block uppercase font-bold text-[10px] tracking-wider">4. AI Intelligence Level:</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => {
                        retroAudio.playClick();
                        setSettings(prev => ({ ...prev, difficulty: diff }));
                      }}
                      className={`py-2 rounded-xl border transition-all duration-200 uppercase cursor-pointer ${
                        settings.difficulty === diff
                          ? 'bg-zinc-800 border-zinc-650 text-white font-bold'
                          : 'bg-zinc-950/60 border-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 hover:border-zinc-700'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Trigger */}
              <button
                onClick={handleStartGame}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3.5 text-center font-bold tracking-wider transition-all duration-300 relative cursor-pointer active:scale-95 block select-none uppercase hover:scale-[1.01]"
              >
                Start Chess Match
              </button>
            </div>

            {/* Quick Helper Notes */}
            <div className="mt-6 text-center max-w-sm font-sans text-[10px] text-zinc-500 select-none">
              Ensure Gemma endpoint runs locally on <span className="text-zinc-450 font-semibold">1234</span> or switch opponent parameters to `Local CPU` for offline gameplay.
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN MODULE STATE 2: ACTIVE GAMEPLAY GRID */}
        {/* ======================================================== */}
        {status !== 'menu' && (
          <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-5 p-4 md:p-6 min-h-[500px] relative z-10">
            
            {/* COLUMN A (Lg: spans 3): STATS PANEL & HIGHLIGHTS */}
            <div className="lg:col-span-3 flex flex-col gap-4 font-sans text-xs">
              
              {/* Scoreboard block */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-3.5 shadow-lg hover:border-zinc-700/60 transition-all duration-300 uppercase">
                <div className="border-b border-zinc-800/60 pb-3 flex items-center justify-between text-zinc-350 font-bold select-none text-xs">
                  <span className="tracking-wide">Match Status</span>
                  <Trophy size={13} className="text-zinc-400" />
                </div>
                
                {/* Player details */}
                <div className="space-y-3 leading-relaxed">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <User size={13} className="text-zinc-400" />
                      Player 1:
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${playerColor === 'w' ? 'bg-white text-black' : 'bg-zinc-950 text-zinc-300 border border-zinc-800'}`}>
                      {playerColor === 'w' ? 'WHITE' : 'BLACK'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Monitor size={13} className="text-zinc-400" />
                      Computer (AI):
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${playerColor === 'w' ? 'bg-zinc-950 text-zinc-300 border border-zinc-800' : 'bg-white text-black'}`}>
                      {playerColor === 'w' ? 'BLACK' : 'WHITE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Captured piece inventory bars */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-4 shadow-lg hover:border-zinc-700/60 transition-all duration-300">
                <div className="border-b border-zinc-800/60 pb-3 text-zinc-350 font-bold uppercase select-none text-xs tracking-wide">
                  Captured Pieces
                </div>

                {/* White pieces captured by black */}
                <div className="space-y-1.5">
                  <span className="text-zinc-500 uppercase block select-none text-[9px] font-semibold tracking-wider">Captured by BLACK:</span>
                  <div className="flex flex-wrap gap-1 min-h-[36px] bg-zinc-950/60 border border-zinc-900/60 rounded-xl p-1.5 shadow-inner">
                    {capturedWhite.length === 0 ? (
                      <span className="text-zinc-600 tracking-wider text-[10px] italic select-none self-center mx-auto">No white pieces captured</span>
                    ) : (
                      capturedWhite.map((p, idx) => (
                        <div key={`cap-w-${idx}`} className="p-0.5 bg-zinc-905/70 rounded shadow-sm">
                          <RetroChessPiece type={p.type} color="w" size={15} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Black pieces captured by white */}
                <div className="space-y-1.5">
                  <span className="text-zinc-500 uppercase block select-none text-[9px] font-semibold tracking-wider">Captured by WHITE:</span>
                  <div className="flex flex-wrap gap-1 min-h-[36px] bg-zinc-950/60 border border-zinc-900/60 rounded-xl p-1.5 shadow-inner">
                    {capturedBlack.length === 0 ? (
                      <span className="text-zinc-600 tracking-wider text-[10px] italic select-none self-center mx-auto">No black pieces captured</span>
                    ) : (
                      capturedBlack.map((p, idx) => (
                        <div key={`cap-b-${idx}`} className="p-0.5 bg-zinc-905/70 rounded shadow-sm">
                          <RetroChessPiece type={p.type} color="b" size={15} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN B (Lg: spans 6): CENTRAL CHESSBOARD & LIVE STATUS BANNERS */}
            <div className="lg:col-span-6 flex flex-col items-center gap-4">
              
              {/* Gameplay warning banner / whose turn banner */}
              <div className="w-full text-center">
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl py-3 px-6 flex items-center justify-center gap-2 select-none shadow-md uppercase transition-all duration-300">
                  {status === 'playing' ? (
                    isThinking ? (
                      <span className="font-sans text-xs text-indigo-455 text-indigo-300 animate-pulse font-bold tracking-wider">
                        AI Opponent Calculating Moves...
                      </span>
                    ) : chess.turn() === playerColor ? (
                      <span className="font-sans text-xs text-emerald-400 animate-pulse font-bold tracking-widest">
                        Your Turn
                      </span>
                    ) : (
                      <span className="font-sans text-xs text-zinc-400 font-bold tracking-wider">
                        Waiting for AI Decision...
                      </span>
                    )
                  ) : (
                    <span className="font-sans text-xs text-rose-455 text-rose-300 font-bold animate-pulse uppercase tracking-wide">
                      Match Paused
                    </span>
                  )}
                </div>
              </div>

              {/* Custom chess board component wrapper */}
              <RetroBoard
                boardState={boardState}
                selectedSquare={selectedSquare}
                validMoves={validMoves}
                onSquareClick={handleSquareClick}
                isCheck={isCheck}
                kingSquare={kingSquare}
                playerColorFlip={playerColor === 'b'}
                isThinking={isThinking}
                lastMove={lastMove}
                frozenSquares={frozenSquares}
                activeSpell={activeSpell}
                spellValidTargets={getSpellValidTargets()}
              />

              {/* Wizard's Spellbook Dashboard */}
              <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 mt-2 shadow-lg space-y-3 relative overflow-hidden uppercase">
                {/* Glow behind */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                
                {/* Header row with Mana Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-zinc-850 border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 font-bold tracking-wider text-xs">🧪 Arcane Spellbook</span>
                    {activeSpell && (
                      <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md animate-pulse border border-indigo-500/30">
                        Channelling: {activeSpell.toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Mana indicators */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1">
                      <span className="text-zinc-500 text-[9px] font-bold">MANA:</span>
                      <div className="flex gap-0.5 select-none font-sans">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-3 rounded-[1px] ${
                              i < (playerColor === 'w' ? whiteMana : blackMana)
                                ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                                : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-cyan-300 font-mono font-bold text-xs pl-1">
                        {playerColor === 'w' ? whiteMana : blackMana}/10
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-400 normal-case italic select-none hidden md:inline">
                      (+2 Mana / Turn)
                    </div>
                  </div>
                </div>

                {/* Spell buttons list */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    {
                      id: 'summon' as const,
                      name: 'Summon Pawn',
                      cost: 3,
                      icon: '🌱',
                      desc: 'Summons Pawn on your half',
                      costColor: 'text-cyan-300'
                    },
                    {
                      id: 'freeze' as const,
                      name: 'Frost Stasis',
                      cost: 4,
                      icon: '❄️',
                      desc: 'Freezes piece for 2 turns',
                      costColor: 'text-sky-300'
                    },
                    {
                      id: 'upgrade' as const,
                      name: 'Golden Forge',
                      cost: 5,
                      icon: '✨',
                      desc: 'Upgrades Pawn to Knight',
                      costColor: 'text-amber-300'
                    },
                    {
                      id: 'teleport' as const,
                      name: 'Phase Shift',
                      cost: 5,
                      icon: '🌀',
                      desc: 'Blinks own piece to anywhere',
                      costColor: 'text-purple-300'
                    },
                    {
                      id: 'fireball' as const,
                      name: 'Meteor Fireball',
                      cost: 7,
                      icon: '🔥',
                      desc: 'Deletes any enemy piece',
                      costColor: 'text-rose-300'
                    }
                  ].map(spell => {
                    const currentMana = playerColor === 'w' ? whiteMana : blackMana;
                    const canAfford = currentMana >= spell.cost;
                    const isSpellSelected = activeSpell === spell.id;
                    const isYourTurn = chess.turn() === playerColor;

                    return (
                      <button
                        key={spell.id}
                        disabled={!canAfford || !isYourTurn || isThinking || status !== 'playing'}
                        onClick={() => {
                          retroAudio.playClick();
                          if (activeSpell === spell.id) {
                            setActiveSpell(null);
                            setSpellTargetStep(1);
                            setSpellSelectedSquare(null);
                          } else {
                            setActiveSpell(spell.id);
                            setSpellTargetStep(1);
                            setSpellSelectedSquare(null);
                            addLog(`Channelling ${spell.name.toUpperCase()} (Cost: ${spell.cost} Mana). Select target on chessboard!`, 'system');
                          }
                        }}
                        className={`group relative flex flex-col items-center justify-between p-2 rounded-xl border text-[10px] tracking-wide transition-all duration-300 select-none cursor-pointer ${
                          isSpellSelected
                            ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.25)] scale-102 font-bold'
                            : canAfford && isYourTurn && !isThinking && status === 'playing'
                            ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white hover:scale-102 active:scale-95'
                            : 'bg-zinc-950/40 border-zinc-900/60 text-zinc-500 opacity-40 cursor-not-allowed'
                        }`}
                        title={`${spell.name}: ${spell.desc}`}
                      >
                        {/* Spell cost indicator top-right corner */}
                        <span className={`absolute top-1 right-1 font-semibold text-[8px] tracking-wider ${canAfford ? spell.costColor : 'text-zinc-650'}`}>
                          {spell.cost}⚡
                        </span>

                        <span className="text-base mb-1 group-hover:scale-110 transition-transform duration-300">{spell.icon}</span>
                        <span className="font-bold text-[9px] text-center leading-none">{spell.name}</span>
                        <span className="text-[7.5px] text-zinc-550 text-zinc-400 leading-none mt-1 group-hover:text-zinc-300 transition-colors normal-case text-center">
                          {spell.id === 'teleport' && isSpellSelected && spellTargetStep === 2
                            ? 'Tgt empty cell'
                            : spell.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMN C (Lg: spans 3): TIMERS & HISTORIC PGN MOVEMENTS LIST */}
            <div className="lg:col-span-3 flex flex-col gap-4 font-sans text-xs">
              
              {/* Clocks boxes */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                
                {/* White timer */}
                <div className="bg-zinc-900/40 border border-zinc-800/85 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg select-none hover:border-zinc-700 transition-all duration-300">
                  <span className="text-zinc-500 text-[9px] tracking-wider uppercase mb-1.5 font-bold">White Clock</span>
                  <div className={`text-lg md:text-xl font-bold font-mono tracking-widest ${
                    chess.turn() === 'w' && status === 'playing' ? 'text-white animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-zinc-550 text-zinc-400'
                  }`}>
                    {formatTime(whiteTime)}
                  </div>
                </div>

                {/* Black timer */}
                <div className="bg-zinc-900/40 border border-zinc-800/85 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg select-none hover:border-zinc-700 transition-all duration-300">
                  <span className="text-zinc-500 text-[9px] tracking-wider uppercase mb-1.5 font-bold">Black Clock</span>
                  <div className={`text-lg md:text-xl font-bold font-mono tracking-widest ${
                    chess.turn() === 'b' && status === 'playing' ? 'text-white animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'text-zinc-550 text-zinc-400'
                  }`}>
                    {formatTime(blackTime)}
                  </div>
                </div>
              </div>

              {/* Move history list */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex-1 flex flex-col min-h-[160px] max-h-[300px] lg:max-h-none shadow-lg hover:border-zinc-700/60 transition-all duration-300">
                <div className="border-b border-zinc-800/60 pb-2.5 text-zinc-350 font-bold uppercase mb-3 select-none tracking-wider text-xs">
                  Match History
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] text-zinc-300">
                  {chess.history({ verbose: true }).length === 0 ? (
                    <div className="text-zinc-600 italic py-5 text-center select-none font-sans text-xs">No moves logged</div>
                  ) : (
                    // Group history in groups of two moves representing a single turn row
                    (() => {
                      const moves = chess.history({ verbose: true });
                      const paired = [];
                      for (let i = 0; i < moves.length; i += 2) {
                        paired.push({
                          index: Math.floor(i / 2) + 1,
                          white: moves[i],
                          black: moves[i + 1]
                        });
                      }
                      return paired.map(turn => (
                        <div key={turn.index} className="flex justify-between hover:bg-zinc-800/20 px-1.5 py-1 rounded transition-all border-b border-zinc-800/20 leading-5">
                          <span className="text-zinc-500 font-semibold">{turn.index}.</span>
                          <span className="text-indigo-400 w-16 text-right font-medium">{turn.white.san}</span>
                          <span className="text-emerald-450 text-emerald-3D0 hover:text-emerald-300 text-teal-300 w-16 text-right font-medium">
                            {turn.black ? turn.black.san : '--'}
                          </span>
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SECTION: MONITOR LOGGER SCROLL ON ALL MODES (NOT JUST MENU) */}
        {status !== 'menu' && (
          <footer className="p-4 border-t border-zinc-800/60 bg-zinc-950/20 backdrop-blur-md relative z-10">
            <TerminalLog
              logs={logs}
              onClearLogs={() => setLogs([])}
            />
          </footer>
        )}
      </div>

      {/* ======================================================== */}
      {/* COMPONENT 1: PROMOTION PICKER (INLINE OVERLAY) */}
      {/* ======================================================== */}
      <RetroDialog
        isOpen={pendingPromotion !== null}
        onClose={() => setPendingPromotion(null)}
        title="Pawn Promotion"
      >
        <div className="text-center space-y-4 py-2">
          <p className="font-sans text-xs text-zinc-300 leading-relaxed">
            Your pawn reached the end file limits. Select elite promotion unit:
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { type: 'q', name: 'Queen' },
              { type: 'r', name: 'Rook' },
              { type: 'b', name: 'Bishop' },
              { type: 'n', name: 'Knight' }
            ].map(p => (
              <button
                key={p.type}
                onClick={() => handlePromoSelect(p.type as 'q' | 'r' | 'b' | 'n')}
                className="bg-zinc-950/80 border border-zinc-800 rounded-xl py-4 hover:bg-zinc-800 hover:border-zinc-700 transition flex flex-col items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-md duration-205"
              >
                <RetroChessPiece type={p.type as any} color={playerColor} size={28} />
                <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </RetroDialog>

      {/* ======================================================== */}
      {/* COMPONENT 2: SETTINGS (SIDEBAR SHEET MECHANIC) */}
      {/* ======================================================== */}
      <RetroSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Engine Properties Parameters"
      >
        <div className="space-y-6 select-none leading-relaxed py-2 text-xs">
          
          {/* Section 1: Sound toggle */}
          <div className="space-y-3">
            <span className="text-zinc-400 block border-b border-zinc-800 pb-1 uppercase font-bold text-[10px] tracking-wider">
              Sound configuration parameters
            </span>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-medium font-sans">Synthesized Sound FX:</span>
              <button
                onClick={() => {
                  retroAudio.playClick();
                  setSoundEnabled(!soundEnabled);
                }}
                className={`py-1.5 px-3.5 rounded-xl border text-[10px] font-bold tracking-wider transition uppercase cursor-pointer ${
                  soundEnabled 
                    ? 'bg-zinc-800 border-zinc-700 text-white' 
                    : 'bg-zinc-950/60 border-zinc-850 text-zinc-450 hover:text-zinc-300'
                }`}
              >
                {soundEnabled ? 'ONLINE' : 'MUTED'}
              </button>
            </div>
          </div>

          {/* Section 2: AI parameter configure, active only on LM Studio */}
          <div className="space-y-4">
            <span className="text-zinc-400 block border-b border-zinc-800 pb-1 uppercase font-bold text-[10px] tracking-wider">
              LLM Model Server Configurations
            </span>
            
            {/* Base Endpoint URL */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 block text-[10px] uppercase font-bold tracking-wider">
                LM Studio Base completions URL:
              </label>
              <input
                type="text"
                value={settings.lmStudioUrl}
                onChange={e => setSettings(prev => ({ ...prev, lmStudioUrl: e.target.value }))}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 text-white font-mono focus:border-zinc-700 outline-none text-xs transition-colors"
                placeholder="http://localhost:1234/v1/chat/completions"
              />
            </div>

            {/* Model identifier block */}
            <div className="space-y-1.5">
              <label className="text-zinc-300 block text-[10px] uppercase font-bold tracking-wider">
                Model name identifier:
              </label>
              <input
                type="text"
                value={settings.modelId}
                onChange={e => setSettings(prev => ({ ...prev, modelId: e.target.value }))}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 text-white font-mono focus:border-zinc-700 outline-none text-xs transition-colors"
                placeholder="gemma"
              />
            </div>

            {/* Connection Status block with test button */}
            <div className="bg-zinc-950/70 p-4 border border-zinc-900 rounded-2xl space-y-3 shadow-inner">
              <div className="flex items-center justify-between font-sans text-[10px]">
                <span className="text-zinc-400 font-bold tracking-wider uppercase">ENDPOINT PING TEST:</span>
                <span className={`font-bold uppercase ${
                  connectionStatus === 'success' ? 'text-green-400' :
                  connectionStatus === 'failed' ? 'text-red-500' :
                  connectionStatus === 'testing' ? 'text-yellow-400 animate-pulse' : 'text-zinc-600'
                }`}>
                  {connectionStatus === 'idle' ? 'STANDBY' :
                   connectionStatus === 'testing' ? 'TESTING...' :
                   connectionStatus === 'success' ? 'PASS' : 'FAILED'}
                </span>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={connectionStatus === 'testing'}
                className="w-full bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-xl text-zinc-300 text-xs font-semibold py-2 transition cursor-pointer active:scale-95 disabled:opacity-40"
              >
                Test Connection / Ping
              </button>
            </div>
          </div>

          {/* Section 3: Reset parameters button */}
          <div className="space-y-2 pt-4 border-t border-zinc-800">
            <button
              onClick={() => {
                retroAudio.playClick();
                setSettings(DEFAULT_SETTINGS);
                addLog('AI configuration variables reset to defaults.', 'system');
              }}
              className="w-full bg-zinc-950/40 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-705 py-2.5 rounded-xl text-center text-[10px] font-semibold tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 leading-5"
            >
              <RotateCcw size={13} />
              Reset Engine Parameters
            </button>
          </div>
        </div>
      </RetroSheet>

      {/* ======================================================== */}
      {/* COMPONENT 3: GAME OVER OVERLAY SCREEN */}
      {/* ======================================================== */}
      <RetroDialog
        isOpen={status === 'checkmate' || status === 'draw'}
        onClose={() => {}}
        title="Match Concluded"
      >
        <div className="text-center space-y-5 py-4 select-none leading-relaxed">
          <div className="inline-block bg-zinc-955/80 border border-zinc-800 p-4 rounded-full shadow-lg mb-2">
            <Trophy size={42} className="text-zinc-300 animate-bounce mx-auto" />
          </div>

          <h3 className="font-sans text-sm font-bold text-rose-400 uppercase tracking-widest">
            {winner === 'draw' ? 'STALEMATE REGISTERED' : `${winner?.toUpperCase()} VICTORIOUS!`}
          </h3>

          <p className="font-sans text-zinc-400 text-xs text-center max-w-sm mx-auto leading-relaxed">
            {winner === 'draw' 
              ? ' Stalemate outcome occurred. Match resulted in equal territory partition.'
              : `The King was successfully neutralized. Victory registered successfully.`
            }
          </p>

          <div className="flex flex-col gap-2 pt-2 max-w-xs mx-auto">
            <button
              onClick={handleStartGame}
              className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 block select-none uppercase tracking-wider"
            >
              Play Again
            </button>
            
            <button
              onClick={quitToMenu}
              className="bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 text-zinc-450 hover:text-zinc-300 py-3 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 block select-none uppercase tracking-wider"
            >
              Back to Main Menu
            </button>
          </div>
        </div>
      </RetroDialog>
    </div>
  );
}
