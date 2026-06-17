import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

// ── SUDOKU ENGINE ─────────────────────────────────────────────────────────────

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function isValid(grid, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (grid[row][i] === num) return false;
        if (grid[i][col] === num) return false;
    }
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
        for (let c = bc; c < bc + 3; c++)
            if (grid[r][c] === num) return false;
    return true;
}

function fillGrid(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
                    if (isValid(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (fillGrid(grid)) return true;
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function countSolutions(grid, limit = 2) {
    let count = 0;
    function solve(g) {
        if (count >= limit) return;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (g[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (isValid(g, row, col, num)) {
                            g[row][col] = num;
                            solve(g);
                            g[row][col] = 0;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }
    solve(grid.map(r => [...r]));
    return count;
}

function generatePuzzle(clues) {
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillGrid(solution);
    const puzzle = solution.map(r => [...r]);
    const cells = shuffle([...Array(81).keys()]);
    let removed = 0;
    const target = 81 - clues;
    for (const idx of cells) {
        if (removed >= target) break;
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        const backup = puzzle[row][col];
        puzzle[row][col] = 0;
        if (countSolutions(puzzle) !== 1) puzzle[row][col] = backup;
        else removed++;
    }
    return { puzzle, solution };
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const DIFFICULTY = {
    easy: { label: "Easy", clues: 38, hintsAllowed: 5, mistakeLimit: 10, scoreBase: 3000 },
    medium: { label: "Medium", clues: 30, hintsAllowed: 3, mistakeLimit: 7, scoreBase: 5000 },
    hard: { label: "Hard", clues: 24, hintsAllowed: 1, mistakeLimit: 5, scoreBase: 8000 },
};

function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function calcScore(difficulty, seconds, mistakes, hintsUsed) {
    const base = DIFFICULTY[difficulty].scoreBase;

    // Time scoring: full points under 3 min, gentle decay after
    const timePen = seconds <= 180
        ? 0
        : Math.floor((seconds - 180) / 30) * 80;   // lose 80pts per 30s OVER 3 minutes

    const mistakePen = mistakes * 80;             // 80pts per mistake
    const hintPen = hintsUsed * 100;           // 100pts per hint

    return Math.max(500, base - timePen - mistakePen - hintPen);
}

async function saveScoreToBackend(difficulty, finalScore, moves, seconds) {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const levelMap = { easy: 1, medium: 2, hard: 3 };
        await axios.post(
            "http://localhost:3001/api/game/save-score",
            {
                game_name: "Sudoku",
                score: finalScore,
                level: levelMap[difficulty],
                moves_taken: moves,
                time_taken: seconds,
            },
            { headers: { Authorization: token } }
        );
        console.log("✅ Sudoku score saved:", finalScore);
    } catch (err) {
        console.error("❌ Failed to save score:", err.message);
    }
}

// ── NUMBER PAD BUTTON ─────────────────────────────────────────────────────────
function NumButton({ num, onClick, disabled, count }) {
    return (
        <button
            onClick={() => onClick(num)}
            disabled={disabled || count >= 9}
            className={`relative flex flex-col items-center justify-center rounded-xl border font-black text-xl sm:text-2xl transition-all duration-150 h-12 w-12 sm:h-14 sm:w-14
        ${disabled || count >= 9
                    ? "bg-white/[0.02] border-white/[0.05] text-gray-700 cursor-not-allowed"
                    : "bg-white/[0.06] border-white/10 text-white hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-violet-300 active:scale-95 cursor-pointer"
                }`}
        >
            {num}
            {count > 0 && count < 9 && (
                <span className="absolute bottom-0.5 text-[8px] font-normal text-gray-500 leading-none">
                    {9 - count} left
                </span>
            )}
        </button>
    );
}

// ── SUDOKU CELL ───────────────────────────────────────────────────────────────
function SudokuCell({ row, col, value, isGiven, isSelected, isHighlighted, isBoxHighlighted, isSameNumber, isError, onClick }) {
    const borderR = col === 2 || col === 5 ? "border-r-2 border-r-violet-500/40" : "border-r border-r-white/[0.08]";
    const borderB = row === 2 || row === 5 ? "border-b-2 border-b-violet-500/40" : "border-b border-b-white/[0.08]";

    let bg = "bg-[#0f0e18]";
    if (isSelected) bg = "bg-violet-500/35";
    else if (isSameNumber && value) bg = "bg-violet-500/20";
    else if (isHighlighted) bg = "bg-violet-500/10";
    else if (isBoxHighlighted) bg = "bg-violet-500/[0.07]";

    let textColor = "text-white";
    if (isGiven) textColor = "text-gray-200";
    if (!isGiven && value) textColor = isError ? "text-red-400" : "text-violet-300";

    return (
        <button
            onClick={() => onClick(row, col)}
            className={`aspect-square flex items-center justify-center text-base sm:text-lg font-bold
        transition-all duration-100 cursor-pointer select-none relative
        ${borderR} ${borderB} ${bg} ${textColor}
        ${isSelected ? "z-10" : ""}
        ${isError ? "animate-[shake_0.3s_ease-in-out]" : ""}
      `}
        >
            {value !== 0 ? value : ""}
            {isSelected && !value && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-0.5 h-4 bg-violet-400 animate-pulse rounded-full" />
                </span>
            )}
        </button>
    );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
    return (
        <div className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-3 text-center min-w-0">
            <p className={`text-xl sm:text-2xl font-black tabular-nums ${color}`}>{value}</p>
            <p className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-widest mt-0.5 truncate">{label}</p>
        </div>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function SudokuGame() {
    // Phase: "select" | "playing" | "won"
    const [phase, setPhase] = useState("select");
    const [difficulty, setDifficulty] = useState("medium");

    // Puzzle state
    const [puzzle, setPuzzle] = useState(null);   // original clues (0 = empty)
    const [solution, setSolution] = useState(null);   // full solution
    const [board, setBoard] = useState(null);   // user's working board
    const [given, setGiven] = useState(null);   // boolean grid: true = pre-filled

    // Interaction
    const [selected, setSelected] = useState(null);   // {row, col}
    const [errors, setErrors] = useState(new Set()); // "r-c" keys
    const [notes, setNotes] = useState(null);   // 9x9 array of Set<number>
    const [noteMode, setNoteMode] = useState(false);

    // Stats
    const [mistakes, setMistakes] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [moves, setMoves] = useState(0);
    const [finalScore, setFinalScore] = useState(0);

    const timerRef = useRef(null);

    // ── Timer ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (phase === "playing") {
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [phase]);

    // ── Keyboard input ───────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== "playing") return;
        const handleKey = (e) => {
            if (!selected) return;
            const { row, col } = selected;

            if (e.key >= "1" && e.key <= "9") {
                e.preventDefault();
                handleInput(parseInt(e.key));
                return;
            }
            if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
                e.preventDefault();
                handleInput(0);
                return;
            }
            if (e.key === "n" || e.key === "N") { setNoteMode(m => !m); return; }

            const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
            if (moves[e.key]) {
                e.preventDefault();
                const [dr, dc] = moves[e.key];
                setSelected({ row: Math.max(0, Math.min(8, row + dr)), col: Math.max(0, Math.min(8, col + dc)) });
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [phase, selected, board, noteMode]);

    // ── Start game ───────────────────────────────────────────────────────────
    const startGame = useCallback((diff = difficulty) => {
        setDifficulty(diff);
        const { puzzle: p, solution: s } = generatePuzzle(DIFFICULTY[diff].clues);
        setPuzzle(p);
        setSolution(s);
        setBoard(p.map(r => [...r]));
        setGiven(p.map(r => r.map(v => v !== 0)));
        setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())));
        setSelected(null);
        setErrors(new Set());
        setMistakes(0);
        setHintsUsed(0);
        setSeconds(0);
        setMoves(0);
        setFinalScore(0);
        setNoteMode(false);
        setPhase("playing");
    }, [difficulty]);

    // ── Restart (same puzzle) ────────────────────────────────────────────────
    const restartGame = useCallback(() => {
        if (!puzzle) return;
        setBoard(puzzle.map(r => [...r]));
        setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set())));
        setSelected(null);
        setErrors(new Set());
        setMistakes(0);
        setHintsUsed(0);
        setSeconds(0);
        setMoves(0);
        setNoteMode(false);
        setPhase("playing");
    }, [puzzle]);

    // ── Check win ────────────────────────────────────────────────────────────
    const checkWin = useCallback((b) => {
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                if (b[r][c] !== solution[r][c]) return false;
        return true;
    }, [solution]);

    // ── Handle number input ──────────────────────────────────────────────────
    const handleInput = useCallback((num) => {
        if (!selected || !board || !solution) return;
        const { row, col } = selected;
        if (given[row][col]) return;

        if (noteMode && num !== 0) {
            const newNotes = notes.map(r => r.map(s => new Set(s)));
            const cell = newNotes[row][col];
            if (cell.has(num)) cell.delete(num);
            else cell.add(num);
            setNotes(newNotes);
            return;
        }

        const nb = board.map(r => [...r]);
        const newErrors = new Set(errors);
        const key = `${row}-${col}`;

        nb[row][col] = num;
        setMoves(m => m + 1);

        if (num !== 0 && num !== solution[row][col]) {
            newErrors.add(key);
            setMistakes(m => m + 1);
        } else {
            newErrors.delete(key);
        }

        // Clear notes for this cell
        if (num !== 0) {
            const newNotes = notes.map(r => r.map(s => new Set(s)));
            newNotes[row][col] = new Set();
            // Remove this number from notes in same row/col/box
            for (let i = 0; i < 9; i++) {
                newNotes[row][i].delete(num);
                newNotes[i][col].delete(num);
            }
            const br = Math.floor(row / 3) * 3;
            const bc = Math.floor(col / 3) * 3;
            for (let r = br; r < br + 3; r++)
                for (let c = bc; c < bc + 3; c++)
                    newNotes[r][c].delete(num);
            setNotes(newNotes);
        }

        setBoard(nb);
        setErrors(newErrors);

        if (num !== 0 && checkWin(nb)) {
            clearInterval(timerRef.current);
            const currentMistakes = mistakes + (num !== solution[row][col] ? 1 : 0);
            const fs = calcScore(difficulty, seconds, currentMistakes, hintsUsed);
            setFinalScore(fs);
            saveScoreToBackend(difficulty, fs, moves, seconds);  // ← ADD
            setTimeout(() => setPhase("won"), 100);
        }
    }, [selected, board, solution, given, noteMode, notes, errors, difficulty, seconds, mistakes, hintsUsed, checkWin]);

    // ── Hint ─────────────────────────────────────────────────────────────────
    const handleHint = useCallback(() => {
        if (!selected || !board || !solution) return;
        const { row, col } = selected;
        if (given[row][col] || board[row][col] === solution[row][col]) return;
        if (hintsUsed >= DIFFICULTY[difficulty].hintsAllowed) return;

        const nb = board.map(r => [...r]);
        nb[row][col] = solution[row][col];
        const newErrors = new Set(errors);
        newErrors.delete(`${row}-${col}`);
        setBoard(nb);
        setErrors(newErrors);
        setHintsUsed(h => h + 1);

        if (checkWin(nb)) {
            clearInterval(timerRef.current);
            const fs = calcScore(difficulty, seconds, mistakes, hintsUsed + 1);
            setFinalScore(fs);
            saveScoreToBackend(difficulty, fs, moves, seconds);  // ← ADD
            setTimeout(() => setPhase("won"), 100);
        }
    }, [selected, board, solution, given, errors, hintsUsed, difficulty, seconds, mistakes, checkWin]);

    // ── Highlight logic ──────────────────────────────────────────────────────
    const getHighlight = useCallback((row, col) => {
        if (!selected) return { isHighlighted: false, isBoxHighlighted: false, isSameNumber: false };
        const { row: sr, col: sc } = selected;
        const sameBox = Math.floor(row / 3) === Math.floor(sr / 3) && Math.floor(col / 3) === Math.floor(sc / 3);
        const isHighlighted = row === sr || col === sc;
        const isBoxHighlighted = sameBox && !isHighlighted;
        const selVal = board?.[sr]?.[sc];
        const isSameNumber = selVal && selVal === board?.[row]?.[col];
        return { isHighlighted, isBoxHighlighted, isSameNumber };
    }, [selected, board]);

    // ── Number counts ─────────────────────────────────────────────────────────
    const numCounts = useCallback(() => {
        const counts = Array(10).fill(0);
        if (board) board.flat().forEach(n => { if (n) counts[n]++; });
        return counts;
    }, [board]);
    const counts = numCounts();

    const hintsLeft = DIFFICULTY[difficulty].hintsAllowed - hintsUsed;
    const mistakeLimit = DIFFICULTY[difficulty].mistakeLimit;
    const liveScore = calcScore(difficulty, seconds, mistakes, hintsUsed);

    const diffMeta = {
        easy: { label: "Easy", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", btn: "from-emerald-600 to-teal-600", ring: "ring-emerald-500/40" },
        medium: { label: "Medium", bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", btn: "from-cyan-600 to-blue-700", ring: "ring-cyan-500/40" },
        hard: { label: "Hard", bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "border-fuchsia-500/30", btn: "from-fuchsia-600 to-violet-700", ring: "ring-fuchsia-500/40" },
    };
    const dm = diffMeta[difficulty];

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER: SELECT SCREEN
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "select") return (
        <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
            <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-violet-600/8 blur-3xl rounded-full pointer-events-none" />

            <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Dashboard
                    </Link>
                    <span className="text-white/20">/</span>
                    <span className="text-white text-sm font-semibold">Sudoku</span>
                </div>
            </header>

            <main className="relative flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-lg space-y-8">
                    {/* Hero */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 mb-2">
                            <span className="text-3xl font-black text-violet-300 tracking-tighter">9×9</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Su<span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">doku</span>
                        </h1>
                        <p className="text-gray-400 text-base">Fill every row, column, and 3×3 box with digits 1–9. No repeats.</p>
                    </div>

                    {/* Rules */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">How to play</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: "🖱️", text: "Click a cell to select it" },
                                { icon: "⌨️", text: "Type 1–9 to fill, 0 or ← to clear" },
                                { icon: "✏️", text: "Press N to toggle note mode" },
                                { icon: "💡", text: "Use hints wisely — they cost points" },
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
                            {Object.entries(diffMeta).map(([key, val]) => (
                                <button key={key} onClick={() => setDifficulty(key)}
                                    className={`rounded-xl border p-4 text-center transition-all duration-200 ${difficulty === key ? `${val.bg} ${val.border} ring-2 ${val.ring}` : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07]"
                                        }`}>
                                    <p className={`font-bold text-sm ${difficulty === key ? val.text : "text-gray-300"}`}>{val.label}</p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        {key === "easy" ? "38 clues" : key === "medium" ? "30 clues" : "24 clues"}
                                    </p>
                                    <p className="text-gray-600 text-xs mt-0.5">
                                        {DIFFICULTY[key].hintsAllowed} hints · {DIFFICULTY[key].mistakeLimit} max mistakes
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => startGame(difficulty)}
                        className={`w-full py-4 rounded-xl bg-gradient-to-r ${dm.btn} text-white font-bold text-base tracking-wide shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}>
                        Start Game →
                    </button>
                </div>
            </main>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER: PLAYING
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "playing" && board) return (
        <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
            <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/85 backdrop-blur-xl">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
                    <Link to="/dashboard" className="text-gray-500 hover:text-white transition-colors shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <span className="text-white font-bold text-sm">Sudoku</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dm.bg} ${dm.text} border ${dm.border}`}>
                        {dm.label}
                    </span>
                    <div className="flex-1" />

                    {/* Controls */}
                    <button onClick={handleHint}
                        disabled={hintsLeft <= 0 || !selected || (selected && given?.[selected.row]?.[selected.col])}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold hover:bg-yellow-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        💡 {hintsLeft}
                    </button>
                    <button onClick={restartGame}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white text-xs transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Restart
                    </button>
                    <button onClick={() => startGame(difficulty)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs hover:bg-violet-500/20 transition-all">
                        New
                    </button>
                </div>
            </header>

            <main className="relative flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">

                {/* Stats row */}
                <div className="flex gap-2 sm:gap-3">
                    <StatCard label="Score" value={liveScore.toLocaleString()} color="text-violet-400" />
                    <StatCard label="Time" value={formatTime(seconds)} color="text-fuchsia-400" />
                    <StatCard label="Mistakes" value={`${mistakes}/${mistakeLimit}`} color={mistakes >= mistakeLimit - 1 ? "text-red-400" : "text-orange-400"} />
                    <StatCard label="Moves" value={moves} color="text-cyan-400" />
                </div>

                {/* Mistake warning */}
                {mistakes >= mistakeLimit - 2 && mistakes < mistakeLimit && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <span>⚠️</span>
                        <span>Only {mistakeLimit - mistakes} mistake{mistakeLimit - mistakes !== 1 ? "s" : ""} remaining!</span>
                    </div>
                )}

                {/* Grid */}
                <div className="flex justify-center">
                    <div
                        className="rounded-xl overflow-hidden border-2 border-violet-500/30 shadow-2xl shadow-violet-500/10"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(9, 1fr)",
                            width: "min(100%, 430px)",
                            aspectRatio: "1",
                        }}
                    >
                        {Array.from({ length: 9 }, (_, r) =>
                            Array.from({ length: 9 }, (_, c) => {
                                const { isHighlighted, isBoxHighlighted, isSameNumber } = getHighlight(r, c);
                                const isSelected = selected?.row === r && selected?.col === c;
                                const isError = errors.has(`${r}-${c}`);
                                const cellNotes = notes?.[r]?.[c];

                                return (
                                    <div key={`${r}-${c}`}
                                        onClick={() => setSelected({ row: r, col: c })}
                                        className={`aspect-square relative flex items-center justify-center cursor-pointer select-none transition-all duration-100
                      ${r === 2 || r === 5 ? "border-b-2 border-b-violet-500/40" : "border-b border-b-white/[0.08]"}
                      ${c === 2 || c === 5 ? "border-r-2 border-r-violet-500/40" : "border-r border-r-white/[0.08]"}
                      ${isSelected ? "bg-violet-500/35 z-10"
                                                : isSameNumber && board[r][c] ? "bg-violet-500/20"
                                                    : isHighlighted ? "bg-violet-500/10"
                                                        : isBoxHighlighted ? "bg-violet-500/[0.06]"
                                                            : "bg-[#0d0c16] hover:bg-white/[0.05]"}
                    `}
                                    >
                                        {board[r][c] !== 0 ? (
                                            <span className={`font-black text-sm sm:text-base leading-none
                        ${given[r][c] ? "text-gray-200"
                                                    : isError ? "text-red-400"
                                                        : "text-violet-300"}`}>
                                                {board[r][c]}
                                            </span>
                                        ) : cellNotes && cellNotes.size > 0 ? (
                                            <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                                    <span key={n} className={`flex items-center justify-center text-[7px] sm:text-[8px] font-bold leading-none
                            ${cellNotes.has(n) ? "text-cyan-400/80" : "text-transparent"}`}>
                                                        {n}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : isSelected ? (
                                            <span className="w-0.5 h-3 sm:h-4 bg-violet-400 animate-pulse rounded-full" />
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Note mode toggle */}
                <div className="flex justify-center gap-3">
                    <button onClick={() => setNoteMode(m => !m)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${noteMode
                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                            : "bg-white/[0.04] border-white/10 text-gray-500 hover:text-white"
                            }`}>
                        ✏️ Notes {noteMode ? "ON" : "OFF"}
                        <span className="text-[10px] opacity-60">(N)</span>
                    </button>
                </div>

                {/* Number pad */}
                <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <NumButton key={n} num={n} onClick={handleInput} count={counts[n]}
                            disabled={!selected || (selected && given?.[selected.row]?.[selected.col])} />
                    ))}
                    <button onClick={() => handleInput(0)}
                        disabled={!selected || (selected && given?.[selected.row]?.[selected.col])}
                        className="flex items-center justify-center rounded-xl border font-bold text-sm transition-all h-12 w-12 sm:h-14 sm:w-14 bg-white/[0.04] border-white/10 text-gray-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed">
                        ⌫
                    </button>
                </div>

            </main>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER: WON
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "won") {
        const starCount = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        const timeBonus = Math.max(0, DIFFICULTY[difficulty].scoreBase - seconds * 2);

        // These values are available for backend integration:
        // finalScore, seconds (timeTaken), moves (movesTaken), difficulty
        return (
            <div className="min-h-screen bg-[#0a0a0f] font-sans flex items-center justify-center px-4 py-12">
                <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-violet-600/12 blur-3xl rounded-full pointer-events-none" />

                <div className="relative w-full max-w-md">
                    <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500" />
                    <div className="rounded-b-2xl bg-[#12111a] border border-white/[0.08] border-t-0 p-8 space-y-6 shadow-2xl shadow-black/60">

                        {/* Trophy */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center text-4xl shadow-xl shadow-yellow-500/10">
                                🏆
                            </div>
                            <h2 className="text-2xl font-black text-white">Puzzle Solved!</h2>
                            <p className="text-gray-400 text-sm">{dm.label} difficulty · {formatTime(seconds)}</p>
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
                                { label: "Base Score", value: DIFFICULTY[difficulty].scoreBase.toLocaleString(), color: "text-gray-300" },
                                { label: "Time Penalty", value: seconds <= 180 ? "−0 (under 3 min ✓)" : `-${(Math.floor((seconds - 180) / 30) * 80).toLocaleString()}`, color: seconds <= 180 ? "text-emerald-400" : "text-orange-400" },
                                { label: "Mistake Penalty", value: mistakes === 0 ? "−0 (perfect ✓)" : `-${(mistakes * 80).toLocaleString()}`, color: mistakes === 0 ? "text-emerald-400" : "text-red-400" },
                                { label: "Hint Penalty", value: hintsUsed === 0 ? "−0 (no hints ✓)" : `-${(hintsUsed * 100).toLocaleString()}`, color: hintsUsed === 0 ? "text-emerald-400" : "text-yellow-500" },
                                { label: "Mistakes Made", value: mistakes, color: "text-orange-300" },
                                { label: "Time Taken", value: formatTime(seconds), color: "text-cyan-400" },
                                { label: "Total Moves", value: moves, color: "text-gray-300" },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between">
                                    <span className="text-gray-400">{row.label}</span>
                                    <span className={`font-bold ${row.color}`}>{row.value}</span>
                                </div>
                            ))}
                            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                                <span className="text-white font-bold">Final Score</span>
                                <span className="text-yellow-400 font-black text-2xl">
                                    {finalScore > 0 ? finalScore.toLocaleString() : calcScore(difficulty, seconds, mistakes, hintsUsed).toLocaleString()}
                                </span>
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
                            {Object.entries(diffMeta).map(([key, val]) => (
                                <button key={key} onClick={() => startGame(key)}
                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${difficulty === key ? `${val.bg} ${val.text} ${val.border}` : "bg-white/[0.03] text-gray-500 border-white/[0.07] hover:text-white"
                                        }`}>
                                    {val.label}
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
