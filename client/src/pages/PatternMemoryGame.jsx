import axios from "axios";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const TILE_COLORS = [
    {
        id: 0,
        name: "Violet",
        base: "bg-violet-600/30 border-violet-500/40",
        lit: "bg-violet-400 border-violet-300 shadow-violet-400/80",
        ring: "ring-violet-400/60",
        dot: "bg-violet-400",
        text: "text-violet-400",
    },
    {
        id: 1,
        name: "Cyan",
        base: "bg-cyan-600/30 border-cyan-500/40",
        lit: "bg-cyan-400 border-cyan-300 shadow-cyan-400/80",
        ring: "ring-cyan-400/60",
        dot: "bg-cyan-400",
        text: "text-cyan-400",
    },
    {
        id: 2,
        name: "Fuchsia",
        base: "bg-fuchsia-600/30 border-fuchsia-500/40",
        lit: "bg-fuchsia-400 border-fuchsia-300 shadow-fuchsia-400/80",
        ring: "ring-fuchsia-400/60",
        dot: "bg-fuchsia-400",
        text: "text-fuchsia-400",
    },
    {
        id: 3,
        name: "Emerald",
        base: "bg-emerald-600/30 border-emerald-500/40",
        lit: "bg-emerald-400 border-emerald-300 shadow-emerald-400/80",
        ring: "ring-emerald-400/60",
        dot: "bg-emerald-400",
        text: "text-emerald-400",
    },
    {
        id: 4,
        name: "Orange",
        base: "bg-orange-600/30 border-orange-500/40",
        lit: "bg-orange-400 border-orange-300 shadow-orange-400/80",
        ring: "ring-orange-400/60",
        dot: "bg-orange-400",
        text: "text-orange-400",
    },
    {
        id: 5,
        name: "Rose",
        base: "bg-rose-600/30 border-rose-500/40",
        lit: "bg-rose-400 border-rose-300 shadow-rose-400/80",
        ring: "ring-rose-400/60",
        dot: "bg-rose-400",
        text: "text-rose-400",
    },
];

const DIFFICULTY = {
    easy: {
        label: "Easy",
        tiles: 4,          // 2×2 grid
        flashMs: 800,        // how long each tile lights up
        gapMs: 300,        // gap between flashes
        startLen: 2,          // initial sequence length
        scoreBase: 100,
        comboBonus: 25,
    },
    medium: {
        label: "Medium",
        tiles: 6,          // 2×3 grid (show 6 tiles)
        flashMs: 600,
        gapMs: 200,
        startLen: 3,
        scoreBase: 150,
        comboBonus: 40,
    },
    hard: {
        label: "Hard",
        tiles: 6,
        flashMs: 400,
        gapMs: 150,
        startLen: 4,
        scoreBase: 200,
        comboBonus: 60,
    },
};

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function randomTile(numTiles) {
    return Math.floor(Math.random() * numTiles);
}

// ── TILE COMPONENT ────────────────────────────────────────────────────────────
function MemoryTile({ colorId, isLit, isUserLit, onClick, disabled, size }) {
    const color = TILE_COLORS[colorId];
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        rounded-2xl border-2 transition-all duration-150 select-none relative overflow-hidden
        ${size}
        ${isLit || isUserLit
                    ? `${color.lit} shadow-2xl scale-105 ring-4 ${color.ring}`
                    : `${color.base} hover:brightness-125 hover:scale-[1.03]`
                }
        ${disabled && !isLit ? "cursor-default" : "cursor-pointer"}
        active:scale-95
      `}
            style={{ willChange: "transform, box-shadow" }}
        >
            {/* Shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl pointer-events-none" />
            {/* Pulse ring when lit */}
            {(isLit || isUserLit) && (
                <div className="absolute inset-0 rounded-2xl animate-ping opacity-30"
                    style={{ background: "inherit" }} />
            )}
        </button>
    );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
    return (
        <div className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] px-2 py-3 text-center min-w-0">
            <p className={`text-xl sm:text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5 truncate">{label}</p>
        </div>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PatternMemoryGame() {
    const [phase, setPhase] = useState("select"); // select|watching|input|correct|wrong|gameover|won
    const [difficulty, setDifficulty] = useState("medium");

    // Sequence state
    const [sequence, setSequence] = useState([]);       // full sequence
    const [userSeq, setUserSeq] = useState([]);       // user's input so far
    const [flashIdx, setFlashIdx] = useState(-1);       // which step is currently lit
    const [litTile, setLitTile] = useState(-1);       // tile currently flashing
    const [userLitTile, setUserLitTile] = useState(-1);   // tile user just pressed

    // Stats
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [combo, setCombo] = useState(0);
    const [showCombo, setShowCombo] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [levelReached, setLevelReached] = useState(1);

    const timerRef = useRef(null);
    const flashRef = useRef(null);
    const phaseRef = useRef(phase);
    phaseRef.current = phase;

    const cfg = DIFFICULTY[difficulty];
    const numTiles = cfg.tiles;
    const activeTiles = TILE_COLORS.slice(0, numTiles);

    // grid layout
    const gridCols = numTiles === 4 ? "grid-cols-2" : "grid-cols-3";
    const tileSize = numTiles === 4
        ? "w-28 h-28 sm:w-36 sm:h-36"
        : "w-24 h-24 sm:w-32 sm:h-32";

    // ── Timer ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const playing = ["watching", "input", "correct"].includes(phase);
        if (playing) {
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [phase]);

    // ── Flash sequence ─────────────────────────────────────────────────────────
    const playSequence = useCallback((seq) => {
        setPhase("watching");
        setLitTile(-1);
        setFlashIdx(-1);

        let i = 0;
        const total = seq.length;

        function flashNext() {
            if (i >= total) {
                setLitTile(-1);
                setFlashIdx(-1);
                setTimeout(() => {
                    if (phaseRef.current === "watching") setPhase("input");
                }, 400);
                return;
            }
            setFlashIdx(i);
            setLitTile(seq[i]);
            setTimeout(() => {
                setLitTile(-1);
                i++;
                setTimeout(flashNext, cfg.gapMs);
            }, cfg.flashMs);
        }

        setTimeout(flashNext, 600);
    }, [cfg.flashMs, cfg.gapMs]);

    // ── Start game ─────────────────────────────────────────────────────────────
    const startGame = useCallback((diff = difficulty) => {
        setDifficulty(diff);
        clearInterval(timerRef.current);
        clearTimeout(flashRef.current);

        const cfgD = DIFFICULTY[diff];
        const initialSeq = Array.from({ length: cfgD.startLen }, () => randomTile(cfgD.tiles));

        setSequence(initialSeq);
        setUserSeq([]);
        setLevel(1);
        setScore(0);
        setStreak(0);
        setBestStreak(0);
        setSeconds(0);
        setCombo(0);
        setFlashIdx(-1);
        setLitTile(-1);
        setUserLitTile(-1);
        setShowCombo(false);
        setFinalScore(0);
        setLevelReached(1);

        setTimeout(() => playSequence(initialSeq), 300);
    }, [difficulty, playSequence]);

    // ── Handle user tile press ─────────────────────────────────────────────────
    const handleTilePress = useCallback((tileId) => {
        if (phase !== "input") return;

        // Flash the pressed tile briefly
        setUserLitTile(tileId);
        setTimeout(() => setUserLitTile(-1), 200);

        const newUserSeq = [...userSeq, tileId];
        const stepIdx = newUserSeq.length - 1;

        // Wrong tile
        if (tileId !== sequence[stepIdx]) {
            setPhase("wrong");
            clearInterval(timerRef.current);
            const fs = score;
            setFinalScore(fs);
            setLevelReached(level);
            const levelMap = { easy: 1, medium: 2, hard: 3 };
            const token = localStorage.getItem("token");
            if (token) {
                axios.post("http://localhost:3001/api/game/save-score",
                    { game_name: "Pattern Memory", score, level: levelMap[difficulty] || 1, moves_taken: sequence.length, time_taken: seconds },
                    { headers: { Authorization: token } }
                ).catch(err => console.error("Save failed:", err.message));
            }
            setTimeout(() => setPhase("gameover"), 800);
            return;
        }

        setUserSeq(newUserSeq);

        // Completed sequence
        if (newUserSeq.length === sequence.length) {
            const newCombo = combo + 1;
            const comboBonus = newCombo >= 2 ? (newCombo - 1) * cfg.comboBonus : 0;
            const points = cfg.scoreBase + comboBonus;
            const newScore = score + points;
            const newStreak = streak + 1;
            const newBest = Math.max(bestStreak, newStreak);

            setCombo(newCombo);
            setScore(newScore);
            setStreak(newStreak);
            setBestStreak(newBest);
            setPhase("correct");

            if (newCombo >= 2) {
                setShowCombo(true);
                setTimeout(() => setShowCombo(false), 1200);
            }

            // Advance to next level
            setTimeout(() => {
                const newLevel = level + 1;
                setLevel(newLevel);
                setUserSeq([]);

                // Add one more step to sequence
                const newSeq = [...sequence, randomTile(numTiles)];
                setSequence(newSeq);
                playSequence(newSeq);
            }, 900);

        } else {
            // Correct so far, keep going
            setUserSeq(newUserSeq);
        }
    }, [phase, userSeq, sequence, combo, score, streak, bestStreak, level, numTiles, cfg, playSequence]);

    // ── Restart (replay same sequence from beginning) ─────────────────────────
    const restartGame = useCallback(() => {
        clearInterval(timerRef.current);
        const cfgD = DIFFICULTY[difficulty];
        const initialSeq = Array.from({ length: cfgD.startLen }, () => randomTile(cfgD.tiles));
        setSequence(initialSeq);
        setUserSeq([]);
        setLevel(1);
        setScore(0);
        setStreak(0);
        setSeconds(0);
        setCombo(0);
        setFlashIdx(-1);
        setLitTile(-1);
        setUserLitTile(-1);
        setShowCombo(false);
        setTimeout(() => playSequence(initialSeq), 300);
    }, [difficulty, playSequence]);

    // Progress through current sequence
    const progress = sequence.length > 0
        ? Math.round((userSeq.length / sequence.length) * 100)
        : 0;

    const diffColors = {
        easy: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", btn: "from-emerald-600 to-teal-600", ring: "ring-emerald-500/40" },
        medium: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30", btn: "from-violet-600 to-fuchsia-600", ring: "ring-violet-500/40" },
        hard: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "border-fuchsia-500/30", btn: "from-fuchsia-600 to-rose-600", ring: "ring-fuchsia-500/40" },
    };
    const dc = diffColors[difficulty];

    const phaseLabel = {
        watching: { text: "👀 Watch the pattern…", color: "text-cyan-400" },
        input: { text: "👆 Your turn — repeat it!", color: "text-violet-400" },
        correct: { text: "✅ Correct! Next round…", color: "text-emerald-400" },
        wrong: { text: "❌ Wrong tile!", color: "text-red-400" },
        gameover: { text: "💀 Game Over", color: "text-red-400" },
    };

    const starCount = level >= 20 ? 3 : level >= 10 ? 2 : 1;

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER: SELECT
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "select") return (
        <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
            <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-fuchsia-600/8 blur-3xl rounded-full pointer-events-none" />

            <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Dashboard
                    </Link>
                    <span className="text-white/20">/</span>
                    <span className="text-white text-sm font-semibold">Pattern Memory</span>
                </div>
            </header>

            <main className="relative flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-lg space-y-8">

                    {/* Hero */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center gap-1.5 mb-2">
                            {[0, 2, 1, 3].map(id => (
                                <div key={id} className={`w-6 h-6 rounded-lg ${TILE_COLORS[id].dot} opacity-80 shadow-lg`}
                                    style={{ boxShadow: `0 0 12px 2px ${["rgba(167,139,250,0.5)", "rgba(232,121,249,0.5)", "rgba(34,211,238,0.5)", "rgba(52,211,153,0.5)"][id]}` }} />
                            ))}
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Pattern <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">Memory</span>
                        </h1>
                        <p className="text-gray-400 text-base">Watch the sequence of flashing tiles, then repeat it exactly. Each round adds one more step.</p>
                    </div>

                    {/* Animated preview tiles */}
                    <div className="flex justify-center">
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                            {TILE_COLORS.slice(0, 6).map((c, i) => (
                                <div key={i}
                                    className={`w-14 h-14 rounded-xl border-2 ${c.base} transition-all duration-300`}
                                    style={{
                                        animation: `pulse 2s ease-in-out ${i * 0.3}s infinite`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* How to play */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">How to play</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: "👀", text: "Watch tiles flash in a sequence" },
                                { icon: "🧠", text: "Memorize the exact order" },
                                { icon: "👆", text: "Tap tiles in the same order" },
                                { icon: "🔥", text: "Each round adds one more tile" },
                            ].map(s => (
                                <div key={s.text} className="flex items-start gap-2.5">
                                    <span className="text-lg shrink-0">{s.icon}</span>
                                    <p className="text-xs text-gray-400 leading-snug">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Select difficulty</p>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(DIFFICULTY).map(([key, val]) => (
                                <button key={key} onClick={() => setDifficulty(key)}
                                    className={`rounded-xl border p-4 text-center transition-all duration-200 ${difficulty === key
                                            ? `${diffColors[key].bg} ${diffColors[key].border} ring-2 ${diffColors[key].ring}`
                                            : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07]"
                                        }`}>
                                    <p className={`font-bold text-sm ${difficulty === key ? diffColors[key].text : "text-gray-300"}`}>{val.label}</p>
                                    <p className="text-gray-500 text-xs mt-1">{val.tiles} tiles</p>
                                    <p className="text-gray-600 text-xs mt-0.5">{val.flashMs}ms flash</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => startGame(difficulty)}
                        className={`w-full py-4 rounded-xl bg-gradient-to-r ${dc.btn} text-white font-bold text-base tracking-wide shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}>
                        Start Game →
                    </button>
                </div>
            </main>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER: PLAYING (watching | input | correct | wrong)
    // ══════════════════════════════════════════════════════════════════════════
    const isPlaying = ["watching", "input", "correct", "wrong"].includes(phase);
    if (isPlaying) return (
        <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
            <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/85 backdrop-blur-xl">
                <div className="max-w-xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
                    <Link to="/dashboard" className="text-gray-500 hover:text-white transition-colors shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <span className="text-white font-bold text-sm">Pattern Memory</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dc.bg} ${dc.text} border ${dc.border}`}>
                        {DIFFICULTY[difficulty].label}
                    </span>
                    <div className="flex-1" />
                    <button onClick={restartGame}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white text-xs transition-all">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Restart
                    </button>
                    <button onClick={() => { clearInterval(timerRef.current); setPhase("select"); }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white text-xs transition-all">
                        Menu
                    </button>
                </div>
            </header>

            <main className="relative flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 items-center">

                {/* Stats */}
                <div className="flex gap-2 sm:gap-3 w-full">
                    <StatCard label="Score" value={score.toLocaleString()} color="text-violet-400" />
                    <StatCard label="Level" value={level} color="text-fuchsia-400" />
                    <StatCard label="Streak" value={`🔥${streak}`} color="text-orange-400" />
                    <StatCard label="Time" value={formatTime(seconds)} color="text-cyan-400" />
                </div>

                {/* Phase label */}
                <div className={`w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-all duration-300 ${phase === "input" ? "bg-violet-500/10 border-violet-500/25" :
                        phase === "correct" ? "bg-emerald-500/10 border-emerald-500/25" :
                            phase === "wrong" ? "bg-red-500/10 border-red-500/25" :
                                "bg-cyan-500/10 border-cyan-500/25"
                    }`}>
                    <span className={`font-bold text-sm ${phaseLabel[phase]?.color || "text-white"}`}>
                        {phaseLabel[phase]?.text || ""}
                    </span>
                </div>

                {/* Sequence progress bar (only during input) */}
                {phase === "input" && (
                    <div className="w-full space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Step {userSeq.length} of {sequence.length}</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Sequence steps dots */}
                <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
                    {sequence.map((tileId, i) => (
                        <div key={i}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${i < userSeq.length
                                    ? TILE_COLORS[tileId].dot
                                    : i === flashIdx && phase === "watching"
                                        ? TILE_COLORS[tileId].dot + " scale-125 shadow-lg"
                                        : "bg-white/10"
                                }`}
                        />
                    ))}
                </div>

                {/* Tile Grid */}
                <div className={`grid ${gridCols} gap-3 sm:gap-4`}>
                    {activeTiles.map((color) => (
                        <MemoryTile
                            key={color.id}
                            colorId={color.id}
                            isLit={litTile === color.id}
                            isUserLit={userLitTile === color.id}
                            onClick={() => handleTilePress(color.id)}
                            disabled={phase !== "input"}
                            size={tileSize}
                        />
                    ))}
                </div>

                {/* Combo toast */}
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${showCombo ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 -translate-y-2"
                    }`}>
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-xl shadow-orange-500/30 text-white font-black text-sm">
                        🔥 COMBO ×{combo}! +{(combo - 1) * cfg.comboBonus} bonus
                    </div>
                </div>

                {/* Color legend */}
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {activeTiles.map(c => (
                        <div key={c.id} className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-sm ${c.dot}`} />
                            <span className={`text-[10px] ${c.text} opacity-60`}>{c.name}</span>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER: GAME OVER
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "gameover") {
        // finalScore, levelReached, seconds are available for backend
        const starCount = levelReached >= 15 ? 3 : levelReached >= 7 ? 2 : 1;

        return (
            <div className="min-h-screen bg-[#0a0a0f] font-sans flex items-center justify-center px-4 py-12">
                <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-red-600/8 blur-3xl rounded-full pointer-events-none" />

                <div className="relative w-full max-w-md">
                    <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-red-500 via-fuchsia-500 to-violet-500" />
                    <div className="rounded-b-2xl bg-[#12111a] border border-white/[0.08] border-t-0 p-8 space-y-6 shadow-2xl shadow-black/60">

                        <div className="flex flex-col items-center gap-3">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center text-4xl shadow-xl">
                                💀
                            </div>
                            <h2 className="text-2xl font-black text-white">Game Over!</h2>
                            <p className="text-gray-400 text-sm">You reached Level {levelReached} · {DIFFICULTY[difficulty].label}</p>
                        </div>

                        {/* Stars */}
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3].map(s => (
                                <svg key={s} className={`w-9 h-9 ${s <= starCount ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-white/10"}`}
                                    fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>

                        {/* Score breakdown */}
                        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3 text-sm">
                            {[
                                { label: "Level Reached", value: levelReached, color: "text-fuchsia-400" },
                                { label: "Final Score", value: finalScore.toLocaleString(), color: "text-violet-400" },
                                { label: "Best Streak", value: `🔥 ${bestStreak}`, color: "text-orange-400" },
                                { label: "Time Played", value: formatTime(seconds), color: "text-cyan-400" },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between">
                                    <span className="text-gray-400">{row.label}</span>
                                    <span className={`font-bold ${row.color}`}>{row.value}</span>
                                </div>
                            ))}
                            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                                <span className="text-white font-bold">Score</span>
                                <span className="text-yellow-400 font-black text-2xl">{finalScore.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={restartGame}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                Try Again
                            </button>
                            <Link to="/dashboard"
                                className="flex-1 flex items-center justify-center py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
                                Dashboard
                            </Link>
                        </div>

                        <div className="flex justify-center gap-2">
                            {Object.keys(DIFFICULTY).map(key => (
                                <button key={key} onClick={() => startGame(key)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${difficulty === key
                                            ? `${diffColors[key].bg} ${diffColors[key].text} ${diffColors[key].border}`
                                            : "bg-white/[0.03] text-gray-500 border-white/[0.07] hover:text-white"
                                        }`}>
                                    {DIFFICULTY[key].label}
                                </button>
                            ))}
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    return null;
}
