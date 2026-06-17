import axios from "axios";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";


// ── PUZZLE ENGINE ─────────────────────────────────────────────────────────────

const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]; // 0 = empty tile

function isSolvable(tiles) {
    // Count inversions
    const arr = tiles.filter(n => n !== 0);
    let inversions = 0;
    for (let i = 0; i < arr.length; i++)
        for (let j = i + 1; j < arr.length; j++)
            if (arr[i] > arr[j]) inversions++;

    // Find row of blank from bottom (1-indexed)
    const blankIdx = tiles.indexOf(0);
    const blankRowFromBottom = 4 - Math.floor(blankIdx / 4);

    if (blankRowFromBottom % 2 === 0) return inversions % 2 !== 0;
    return inversions % 2 === 0;
}

function shuffle(tiles) {
    let arr = [...tiles];
    do {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    } while (!isSolvable(arr) || isSolved(arr));
    return arr;
}

function isSolved(tiles) {
    return tiles.every((v, i) => v === GOAL[i]);
}

function getNeighbors(idx) {
    const neighbors = [];
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    if (row > 0) neighbors.push(idx - 4); // up
    if (row < 3) neighbors.push(idx + 4); // down
    if (col > 0) neighbors.push(idx - 1); // left
    if (col < 3) neighbors.push(idx + 1); // right
    return neighbors;
}

function calcScore(moves, seconds) {
    const moveScore = Math.max(0, 5000 - moves * 20);
    const timeScore = Math.max(0, 3000 - seconds * 5);
    return Math.max(200, moveScore + timeScore);
}

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

// ── TILE COMPONENT ────────────────────────────────────────────────────────────
function Tile({ value, index, emptyIndex, onClick, isMovable, justMoved }) {
    if (value === 0) {
        return (
            <div className="aspect-square rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-dashed border-white/10" />
            </div>
        );
    }

    // Determine if this tile is in correct position
    const isCorrect = value === index + 1;

    return (
        <button
            onClick={() => isMovable && onClick(index)}
            className={`
        aspect-square rounded-xl border font-black text-xl sm:text-2xl
        transition-all duration-200 select-none relative overflow-hidden
        ${isMovable
                    ? "cursor-pointer hover:scale-105 active:scale-95 hover:shadow-lg"
                    : "cursor-default"
                }
        ${isCorrect
                    ? "bg-gradient-to-br from-emerald-600/30 to-emerald-700/20 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10"
                    : isMovable
                        ? "bg-gradient-to-br from-violet-600/40 to-violet-700/30 border-violet-400/50 text-white shadow-violet-500/20 hover:from-violet-500/50 hover:border-violet-300/60"
                        : "bg-gradient-to-br from-white/[0.07] to-white/[0.04] border-white/15 text-gray-300"
                }
        ${justMoved ? "shadow-xl shadow-violet-500/30 scale-105" : ""}
      `}
            style={{ willChange: "transform" }}
        >
            {/* Shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl pointer-events-none" />
            <span className="relative z-10">{value}</span>
        </button>
    );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
    return (
        <div className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-3 text-center min-w-0">
            <p className={`text-xl sm:text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mt-0.5">{label}</p>
            {sub && <p className="text-gray-600 text-[9px] mt-0.5">{sub}</p>}
        </div>
    );
}

// ── PROGRESS ROW ──────────────────────────────────────────────────────────────
function ProgressRow({ tiles }) {
    const correct = tiles.filter((v, i) => v !== 0 && v === i + 1).length;
    const pct = Math.round((correct / 15) * 100);
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
                <span>{correct} / 15 tiles in place</span>
                <span>{pct}% complete</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

async function saveScoreToBackend(difficulty, finalScore, moves, seconds) {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const levelMap = { easy: 1, medium: 2, hard: 3 };
        await axios.post(
            "http://localhost:3001/api/game/save-score",
            {
                game_name: "Number Puzzle",
                score: finalScore,
                level: levelMap[difficulty] || 1,
                moves_taken: moves,
                time_taken: seconds,
            },
            { headers: { Authorization: token } }
        );
        console.log("✅ Score saved:", finalScore);
    } catch (err) {
        console.error("❌ Score save failed:", err.message);
    }
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function NumberPuzzleGame() {
    const [phase, setPhase] = useState("select"); // select | playing | won
    const [tiles, setTiles] = useState(GOAL);
    const [moves, setMoves] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [running, setRunning] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [lastMoved, setLastMoved] = useState(null);
    const [difficulty, setDifficulty] = useState("medium");

    const timerRef = useRef(null);

    const DIFF_META = {
        easy: { label: "Easy", scoreMulti: 0.8, desc: "Standard 15-puzzle" },
        medium: { label: "Medium", scoreMulti: 1.0, desc: "Timed scoring" },
        hard: { label: "Hard", scoreMulti: 1.5, desc: "Max score multiplier" },
    };

    // ── Timer ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (running) {
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [running]);

    // ── Keyboard support ───────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== "playing") return;
        const handleKey = (e) => {
            const emptyIdx = tiles.indexOf(0);
            const row = Math.floor(emptyIdx / 4);
            const col = emptyIdx % 4;
            let tileToMove = -1;

            // Arrow key moves the TILE into the empty space
            // e.g. ArrowLeft = move tile from RIGHT of empty leftward
            if (e.key === "ArrowLeft" && col < 3) tileToMove = emptyIdx + 1;
            if (e.key === "ArrowRight" && col > 0) tileToMove = emptyIdx - 1;
            if (e.key === "ArrowUp" && row < 3) tileToMove = emptyIdx + 4;
            if (e.key === "ArrowDown" && row > 0) tileToMove = emptyIdx - 4;

            if (tileToMove !== -1) {
                e.preventDefault();
                moveTile(tileToMove);
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [phase, tiles]);

    // ── Start / new game ───────────────────────────────────────────────────────
    const startGame = useCallback((diff = difficulty) => {
        setDifficulty(diff);
        const shuffled = shuffle([...GOAL]);
        setTiles(shuffled);
        setMoves(0);
        setSeconds(0);
        setFinalScore(0);
        setLastMoved(null);
        setRunning(false);
        setPhase("playing");
    }, [difficulty]);

    // ── Restart same layout ────────────────────────────────────────────────────
    const restartGame = useCallback(() => {
        setMoves(0);
        setSeconds(0);
        setFinalScore(0);
        setLastMoved(null);
        setRunning(false);
        const shuffled = shuffle([...GOAL]);
        setTiles(shuffled);
    }, []);

    // ── Move tile ──────────────────────────────────────────────────────────────
    const moveTile = useCallback((tileIdx) => {
        const emptyIdx = tiles.indexOf(0);
        const neighbors = getNeighbors(emptyIdx);
        if (!neighbors.includes(tileIdx)) return;

        if (!running) setRunning(true);

        const newTiles = [...tiles];
        [newTiles[emptyIdx], newTiles[tileIdx]] = [newTiles[tileIdx], newTiles[emptyIdx]];
        const newMoves = moves + 1;

        setTiles(newTiles);
        setMoves(newMoves);
        setLastMoved(tileIdx);
        setTimeout(() => setLastMoved(null), 200);

        if (isSolved(newTiles)) {
            clearInterval(timerRef.current);
            setRunning(false);
            const multi = DIFF_META[difficulty].scoreMulti;
            const fs = Math.round(calcScore(newMoves, seconds) * multi);
            setFinalScore(fs);
            saveScoreToBackend(difficulty, fs, newMoves, seconds); // ← ADD
            setTimeout(() => setPhase("won"), 300);
        }
    }, [tiles, moves, seconds, running, difficulty]);

    const emptyIdx = tiles.indexOf(0);
    const movableTiles = getNeighbors(emptyIdx);
    const liveScore = calcScore(moves, seconds);
    const dm = DIFF_META[difficulty];

    const diffColors = {
        easy: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", btn: "from-emerald-600 to-teal-600", ring: "ring-emerald-500/40" },
        medium: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30", btn: "from-violet-600 to-fuchsia-600", ring: "ring-violet-500/40" },
        hard: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "border-fuchsia-500/30", btn: "from-fuchsia-600 to-rose-600", ring: "ring-fuchsia-500/40" },
    };
    const dc = diffColors[difficulty];

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER: SELECT
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "select") return (
        <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
            <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-violet-600/8 blur-3xl rounded-full pointer-events-none" />

            <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Dashboard
                    </Link>
                    <span className="text-white/20">/</span>
                    <span className="text-white text-sm font-semibold">Number Puzzle</span>
                </div>
            </header>

            <main className="relative flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-lg space-y-8">

                    {/* Hero */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 mb-2">
                            <span className="text-2xl font-black text-violet-300 tracking-tighter">15</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Number <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Puzzle</span>
                        </h1>
                        <p className="text-gray-400 text-base">Slide tiles into order 1–15. Fewer moves and faster time = higher score.</p>
                    </div>

                    {/* Preview mini grid */}
                    <div className="flex justify-center">
                        <div className="grid grid-cols-4 gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0].map((n, i) => (
                                <div key={i}
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black
                    ${n === 0 ? "bg-white/[0.02] border border-dashed border-white/10"
                                            : "bg-gradient-to-br from-violet-600/30 to-violet-700/20 border border-violet-500/30 text-violet-300"}`}>
                                    {n || ""}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How to play */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">How to play</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: "👆", text: "Click a tile next to the empty space to slide it" },
                                { icon: "⌨️", text: "Use arrow keys to slide tiles in any direction" },
                                { icon: "🎯", text: "Arrange tiles 1–15 in order left to right, top to bottom" },
                                { icon: "⚡", text: "Fewer moves + faster time = higher score" },
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
                            {Object.entries(diffColors).map(([key, val]) => (
                                <button key={key} onClick={() => setDifficulty(key)}
                                    className={`rounded-xl border p-4 text-center transition-all duration-200 ${difficulty === key ? `${val.bg} ${val.border} ring-2 ${val.ring}` : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07]"
                                        }`}>
                                    <p className={`font-bold text-sm ${difficulty === key ? val.text : "text-gray-300"}`}>
                                        {DIFF_META[key].label}
                                    </p>
                                    <p className="text-gray-500 text-xs mt-1">{DIFF_META[key].desc}</p>
                                    <p className={`text-xs font-bold mt-1 ${difficulty === key ? val.text : "text-gray-600"}`}>
                                        ×{DIFF_META[key].scoreMulti} score
                                    </p>
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
    // RENDER: PLAYING
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "playing") return (
        <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
            <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-56 bg-violet-600/8 blur-3xl rounded-full pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/85 backdrop-blur-xl">
                <div className="max-w-xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
                    <Link to="/dashboard" className="text-gray-500 hover:text-white transition-colors shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <span className="text-white font-bold text-sm">Number Puzzle</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dc.bg} ${dc.text} border ${dc.border}`}>
                        {dm.label}
                    </span>
                    <div className="flex-1" />

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button onClick={restartGame}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white text-xs transition-all">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Shuffle
                        </button>
                        <button onClick={() => startGame(difficulty)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs hover:bg-violet-500/20 transition-all">
                            New
                        </button>
                        <button onClick={() => setPhase("select")}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white text-xs transition-all">
                            Menu
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">

                {/* Stats */}
                <div className="flex gap-2 sm:gap-3">
                    <StatCard label="Score" value={liveScore.toLocaleString()} color="text-violet-400" />
                    <StatCard label="Moves" value={moves} color="text-fuchsia-400" />
                    <StatCard label="Time" value={formatTime(seconds)} color="text-cyan-400" />
                </div>

                {/* Progress */}
                <ProgressRow tiles={tiles} />

                {/* Grid */}
                <div className="flex justify-center">
                    <div
                        className="rounded-2xl border-2 border-violet-500/20 bg-[#0d0c16] p-2 sm:p-3 shadow-2xl shadow-violet-500/10"
                        style={{ width: "min(100%, 360px)" }}
                    >
                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                            {tiles.map((value, index) => (
                                <Tile
                                    key={`tile-${value === 0 ? "empty" : value}`}
                                    value={value}
                                    index={index}
                                    emptyIndex={emptyIdx}
                                    onClick={moveTile}
                                    isMovable={movableTiles.includes(index)}
                                    justMoved={lastMoved === index}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Number reference */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-gray-500">
                        <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/40 inline-block" />
                        <span>Correct position</span>
                        <span className="ml-3 w-3 h-3 rounded bg-violet-500/30 border border-violet-400/40 inline-block" />
                        <span>Movable tile</span>
                    </div>
                </div>

                {/* Keyboard hint */}
                <p className="text-center text-gray-600 text-xs">
                    Use <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-gray-400 font-mono text-[10px]">↑ ↓ ← →</kbd> arrow keys to move tiles
                </p>

            </main>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER: WON
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "won") {
        const starCount = moves <= 60 ? 3 : moves <= 100 ? 2 : 1;
        const multi = DIFF_META[difficulty].scoreMulti;

        // ── Data ready for backend integration ──────────────────────────────────
        // finalScore  → score
        // seconds     → time_taken
        // moves       → moves_taken
        // difficulty  → level
        // game_name   → "Number Puzzle"

        return (
            <div className="min-h-screen bg-[#0a0a0f] font-sans flex items-center justify-center px-4 py-12">
                <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-violet-600/10 blur-3xl rounded-full pointer-events-none" />

                <div className="relative w-full max-w-md">
                    <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />
                    <div className="rounded-b-2xl bg-[#12111a] border border-white/[0.08] border-t-0 p-8 space-y-6 shadow-2xl shadow-black/60">

                        {/* Trophy */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center text-4xl shadow-xl shadow-yellow-500/10">
                                🏆
                            </div>
                            <h2 className="text-2xl font-black text-white">Puzzle Solved!</h2>
                            <p className="text-gray-400 text-sm">{dm.label} · {moves} moves · {formatTime(seconds)}</p>
                        </div>

                        {/* Stars */}
                        <div className="flex justify-center gap-3">
                            {[1, 2, 3].map(s => (
                                <svg key={s} className={`w-9 h-9 transition-all ${s <= starCount ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" : "text-white/10"}`}
                                    fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>

                        {/* Score breakdown */}
                        <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3 text-sm">
                            {[
                                { label: "Move Score", value: Math.max(0, 5000 - moves * 20).toLocaleString(), color: "text-violet-400" },
                                { label: "Time Score", value: Math.max(0, 3000 - seconds * 5).toLocaleString(), color: "text-cyan-400" },
                                { label: "Difficulty ×", value: `×${multi}`, color: "text-fuchsia-400" },
                                { label: "Total Moves", value: moves, color: "text-gray-300" },
                                { label: "Time Taken", value: formatTime(seconds), color: "text-gray-300" },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between">
                                    <span className="text-gray-400">{row.label}</span>
                                    <span className={`font-bold ${row.color}`}>{row.value}</span>
                                </div>
                            ))}
                            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                                <span className="text-white font-bold">Final Score</span>
                                <span className="text-yellow-400 font-black text-2xl">{finalScore.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button onClick={() => startGame(difficulty)}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                New Game
                            </button>
                            <Link to="/dashboard"
                                className="flex-1 flex items-center justify-center py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
                                Dashboard
                            </Link>
                        </div>

                        {/* Difficulty switcher */}
                        <div className="flex justify-center gap-2">
                            {Object.entries(diffColors).map(([key, val]) => (
                                <button key={key} onClick={() => startGame(key)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${difficulty === key ? `${val.bg} ${val.text} ${val.border}` : "bg-white/[0.03] text-gray-500 border-white/[0.07] hover:text-white"
                                        }`}>
                                    {DIFF_META[key].label}
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
