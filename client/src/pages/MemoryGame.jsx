import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

// ── Card emoji sets per level ──────────────────────────────────────────────
const CARD_SETS = {
  1: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊"],        // 6 pairs → 12 cards
  2: ["🍎", "🍊", "🍋", "🍇", "🍓", "🍒", "🥝", "🍑"], // 8 pairs → 16 cards
  3: ["⚡", "🔥", "💧", "🌿", "❄️", "🌙", "☀️", "⭐", "🌈", "🎯"], // 10 pairs → 20 cards
};

function buildDeck(level) {
  const emojis = CARD_SETS[level] || CARD_SETS[1];
  const pairs = [...emojis, ...emojis];
  return pairs
    .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Card Component ─────────────────────────────────────────────────────────
function MemoryCard({ card, onClick, disabled }) {
  const isVisible = card.flipped || card.matched;
  return (
    <button
      onClick={() => !disabled && !isVisible && onClick(card.id)}
      className={`relative aspect-square w-full cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-xl transition-transform duration-200 ${
        disabled || isVisible ? "cursor-default" : "hover:scale-105 active:scale-95"
      }`}
      style={{ perspective: "600px" }}
      aria-label={isVisible ? card.emoji : "Hidden card"}
    >
      {/* Inner flip container */}
      <div
        className="relative w-full h-full transition-all duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isVisible ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Back face */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-900/80 to-violet-800/60 border border-violet-500/30 shadow-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>

        {/* Front face */}
        <div
          className={`absolute inset-0 rounded-xl flex items-center justify-center border shadow-lg transition-all ${
            card.matched
              ? "bg-gradient-to-br from-emerald-900/60 to-emerald-800/40 border-emerald-500/40 shadow-emerald-500/20"
              : "bg-gradient-to-br from-violet-600/40 to-fuchsia-700/30 border-violet-400/40 shadow-violet-500/20"
          }`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {card.matched && (
            <div className="absolute inset-0 rounded-xl bg-emerald-500/10 animate-pulse pointer-events-none" />
          )}
          <span className="text-3xl sm:text-4xl drop-shadow-lg select-none">{card.emoji}</span>
        </div>
      </div>
    </button>
  );
}

// ── Main MemoryGame Component ──────────────────────────────────────────────
export default function MemoryGame() {
  const [level, setLevel] = useState(1);
  const [deck, setDeck] = useState(() => buildDeck(1));
  const [flippedIds, setFlippedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [checking, setChecking] = useState(false);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (running && !gameOver) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [running, gameOver]);

  // Check win
  useEffect(() => {
    if (deck.length > 0 && deck.every((c) => c.matched)) {
      setRunning(false);
      setGameOver(true);
    }
  }, [deck]);

  useEffect(() => {
    if (gameOver) {
      saveScore();
    }
  }, [gameOver]);

  const restart = useCallback((newLevel = level) => {
    clearInterval(timerRef.current);
    setLevel(newLevel);
    setDeck(buildDeck(newLevel));
    setFlippedIds([]);
    setMoves(0);
    setScore(0);
    setSeconds(0);
    setRunning(false);
    setGameOver(false);
    setChecking(false);
    setCombo(0);
    setShowCombo(false);
  }, [level]);

  const handleCardClick = useCallback((id) => {
    if (!running) setRunning(true);
    if (checking || flippedIds.length === 2) return;

    const next = [...flippedIds, id];
    setDeck((d) => d.map((c) => (c.id === id ? { ...c, flipped: true } : c)));
    setFlippedIds(next);

    if (next.length === 2) {
      setChecking(true);
      setMoves((m) => m + 1);

      const [a, b] = next.map((fid) => deck.find((c) => c.id === fid));
      if (a.emoji === b.emoji) {
        // Match!
        const newCombo = combo + 1;
        setCombo(newCombo);
        const points = 100 + (newCombo > 1 ? (newCombo - 1) * 25 : 0);
        setScore((s) => s + points);
        if (newCombo >= 2) {
          setShowCombo(true);
          setTimeout(() => setShowCombo(false), 1200);
        }
        setDeck((d) =>
          d.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true, flipped: true } : c))
        );
        setFlippedIds([]);
        setChecking(false);
      } else {
        setCombo(0);
        setTimeout(() => {
          setDeck((d) =>
            d.map((c) =>
              c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c
            )
          );
          setFlippedIds([]);
          setChecking(false);
        }, 900);
      }
    }
  }, [running, checking, flippedIds, deck, combo]);

  const totalPairs = deck.length / 2;
  const matchedPairs = deck.filter((c) => c.matched).length / 2;
  const progress = totalPairs > 0 ? (matchedPairs / totalPairs) * 100 : 0;

  const gridCols =
    deck.length <= 12 ? "grid-cols-4 sm:grid-cols-4" :
    deck.length <= 16 ? "grid-cols-4 sm:grid-cols-4" :
    "grid-cols-4 sm:grid-cols-5";

const timeBonus = Math.max(0, 300 - seconds) * 2;
const finalScore = score + (gameOver ? timeBonus : 0);

const saveScore = async () => {
  try {
    const token = localStorage.getItem("token");

    await axios.post(
      "http://localhost:3001/api/game/save-score",
      {
        game_name: "Memory Match",
        score: finalScore,
        level: level,
        moves_taken: moves,
        time_taken: seconds,
      },
      {
        headers: {
          Authorization: token,
        },
      }
    );

    console.log("Score Saved");
  } catch (error) {
    console.log(error);
  }
};

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
      {/* Grid bg */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-violet-600/10 blur-3xl rounded-full pointer-events-none" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Back */}
          <Link to="/dashboard"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          {/* Title */}
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
              <span className="text-xs font-black text-white">B</span>
            </div>
            <div>
              <span className="text-white font-bold text-sm">Memory Match</span>
              <span className="ml-2 px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-400 text-xs font-semibold border border-violet-500/25">
                Level {level}
              </span>
            </div>
          </div>

          {/* Level select */}
          <div className="hidden sm:flex items-center gap-1.5">
            {[1, 2, 3].map((l) => (
              <button key={l}
                onClick={() => restart(l)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  level === l
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                    : "bg-white/[0.05] text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* Restart */}
          <button onClick={() => restart(level)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-sm font-medium transition-all shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restart
          </button>
        </div>
      </header>

      <main className="relative flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              label: "Score",
              value: score.toLocaleString(),
              icon: (
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              ),
              color: "text-violet-400",
            },
            {
              label: "Moves",
              value: moves,
              icon: (
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              ),
              color: "text-cyan-400",
            },
            {
              label: "Time",
              value: formatTime(seconds),
              icon: (
                <svg className="w-4 h-4 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              color: "text-fuchsia-400",
            },
            {
              label: "Pairs",
              value: `${matchedPairs}/${totalPairs}`,
              icon: (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              color: "text-emerald-400",
            },
          ].map((s) => (
            <div key={s.label}
              className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 sm:p-4 flex flex-col items-center gap-1.5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              <span>{s.icon}</span>
              <span className={`text-xl sm:text-2xl font-black ${s.color} tabular-nums`}>{s.value}</span>
              <span className="text-gray-500 text-xs uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Progress Bar ── */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{matchedPairs} of {totalPairs} pairs found</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all duration-500 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
            </div>
          </div>
        </div>

        {/* ── Combo Banner ── */}
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
          showCombo ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 -translate-y-2"
        }`}>
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-xl shadow-orange-500/30 text-white font-black text-sm">
            <span>🔥</span> COMBO x{combo}! +{(combo - 1) * 25} bonus
          </div>
        </div>

        {/* ── Card Grid ── */}
        <div className={`grid ${gridCols} gap-2.5 sm:gap-3`}>
          {deck.map((card) => (
            <MemoryCard
              key={card.id}
              card={card}
              onClick={handleCardClick}
              disabled={checking || gameOver}
            />
          ))}
        </div>

        {/* ── Idle hint ── */}
        {!running && !gameOver && (
          <div className="text-center">
            <p className="text-gray-500 text-sm animate-pulse">
              Click any card to start the game
            </p>
          </div>
        )}

        {/* ── Mobile level select ── */}
        <div className="sm:hidden flex items-center justify-center gap-2">
          <span className="text-gray-500 text-xs">Level:</span>
          {[1, 2, 3].map((l) => (
            <button key={l}
              onClick={() => restart(l)}
              className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                level === l
                  ? "bg-violet-600 text-white shadow-md"
                  : "bg-white/[0.05] text-gray-400 border border-white/10"
              }`}>
              {l}
            </button>
          ))}
        </div>

      </main>

      {/* ── Game Over Modal ── */}
      {gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => {}} />
          <div className="relative w-full max-w-sm rounded-2xl bg-[#12111a] border border-violet-500/30 shadow-2xl shadow-violet-500/20 overflow-hidden">
            {/* Top gradient strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />

            <div className="p-8 text-center space-y-6">
              {/* Trophy */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center shadow-xl">
                  <span className="text-4xl">🏆</span>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">You Won!</h2>
                <p className="text-gray-400 text-sm mt-1">All {totalPairs} pairs matched</p>
              </div>

              {/* Score breakdown */}
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-3 text-sm">
                {[
                  { label: "Match Score", value: score, color: "text-violet-400" },
                  { label: "Time Bonus", value: `+${timeBonus}`, color: "text-cyan-400" },
                  { label: "Moves Made", value: moves, color: "text-fuchsia-400" },
                  { label: "Time Taken", value: formatTime(seconds), color: "text-gray-300" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-gray-400">{row.label}</span>
                    <span className={`font-bold ${row.color}`}>{typeof row.value === "number" ? row.value.toLocaleString() : row.value}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-bold">Final Score</span>
                  <span className="text-yellow-400 font-black text-lg">{finalScore.toLocaleString()}</span>
                </div>
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3].map((star) => (
                  <svg key={star}
                    className={`w-8 h-8 transition-all duration-500 ${
                      (moves <= totalPairs * 1.5 && star <= 3) ||
                      (moves <= totalPairs * 2.5 && star <= 2) ||
                      star <= 1
                        ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                        : "text-gray-700"
                    }`}
                    fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button onClick={() => restart(level)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Play Again
                </button>
                {level < 3 && (
                  <button onClick={() => restart(level + 1)}
                    className="flex-1 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
                    Next Level →
                  </button>
                )}
              </div>

              <Link to="/dashboard"
                className="block text-sm text-gray-500 hover:text-violet-400 transition-colors">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
