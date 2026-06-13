import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

// ── VERIFIED PUZZLE DATA ──────────────────────────────────────────────────────
//
// EASY 5×5:
//   B R A I N    across-1: BRAIN  (r0 c0-4)
//   O # # # E    down-1:   BOOKS  (c0 r0-4)  intersects: r0c0=B ✓  r4c0=S ✓
//   O # # # T    down-2:   NETS   (c4 r0-3)  intersects: r0c4=N ✓
//   K # # # S    across-3: STAR   (r4 c0-3)  intersects: r4c0=S ✓
//   S T A R #
//
// MEDIUM 7×7:
//   C O M E T S #    across-1: COMETS (r0 c0-5)   intersects: r0c0=C ✓  r0c5=S ✓
//   L # # # # U #    down-1:   CLOUDS (c0 r0-5)   intersects: r0c0=C ✓
//   O # # # # N #    down-2:   SUN    (c5 r0-2)   intersects: r0c5=S ✓
//   U # P L U T O    across-3: PLUTO  (r3 c2-6)   intersects: r3c2=P ✓
//   D # L # # # #    down-3:   PLAN   (c2 r3-6)   intersects: r3c2=P ✓
//   S # A # # # #
//   # # N # # # #
//
// HARD 7×7:
//   M Y S T E R Y    across-1: MYSTERY (r0 c0-6)  intersects: r0c3=T ✓
//   # # # Y # # #    down-2:   TYPHOID (c3 r0-6)  intersects: r0c3=T ✓  r6c3=D ✓
//   # # # P # # #    across-3: SHADOW  (r6 c0-5)  intersects: r6c3=D ✓
//   # # # H # # #
//   # # # O # # #
//   # # # I # # #
//   S H A D O W #
//
// ─────────────────────────────────────────────────────────────────────────────

const FINAL_PUZZLES = {
  easy: {
    size: 5,
    solution: [
      ["B","R","A","I","N"],
      ["O","#","#","#","E"],
      ["O","#","#","#","T"],
      ["K","#","#","#","S"],
      ["S","T","A","R","#"],
    ],
    // Cell numbering: scan top-left → bottom-right; assign next number when a
    // cell starts a new across word OR a new down word.
    // 1 = r0c0 (BRAIN-across starts, BOOKS-down starts)
    // 2 = r0c4 (NETS-down starts)
    // 3 = r4c0 (STAR-across starts)
    numbers: [
      [1, 0, 0, 0, 2],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [3, 0, 0, 0, 0],
    ],
    clues: {
      across: [
        { number: 1, clue: "The organ of thought and intelligence", answer: "BRAIN" },
        { number: 3, clue: "Celestial body — astronomers study it at night", answer: "STAR" },
      ],
      down: [
        { number: 1, clue: "Titles found in a library — you read them (plural)", answer: "BOOKS" },
        { number: 2, clue: "Mesh traps used to catch fish (plural)", answer: "NETS" },
      ],
    },
  },

  medium: {
    size: 7,
    solution: [
      ["C","O","M","E","T","S","#"],
      ["L","#","#","#","#","U","#"],
      ["O","#","#","#","#","N","#"],
      ["U","#","P","L","U","T","O"],
      ["D","#","L","#","#","#","#"],
      ["S","#","A","#","#","#","#"],
      ["#","#","N","#","#","#","#"],
    ],
    // 1 = r0c0 (COMETS-across, CLOUDS-down)
    // 2 = r0c5 (SUN-down)
    // 3 = r3c2 (PLUTO-across, PLAN-down)
    numbers: [
      [1, 0, 0, 0, 0, 2, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 3, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ],
    clues: {
      across: [
        { number: 1, clue: "Icy space rocks with a glowing tail (plural)", answer: "COMETS" },
        { number: 3, clue: "The outermost dwarf planet in our solar system", answer: "PLUTO" },
      ],
      down: [
        { number: 1, clue: "Fluffy white formations floating in the sky (plural)", answer: "CLOUDS" },
        { number: 2, clue: "The closest star to Earth", answer: "SUN" },
        { number: 3, clue: "A diagram or scheme drawn out in advance", answer: "PLAN" },
      ],
    },
  },

  hard: {
    size: 7,
    solution: [
      ["M","Y","S","T","E","R","Y"],
      ["#","#","#","Y","#","#","#"],
      ["#","#","#","P","#","#","#"],
      ["#","#","#","H","#","#","#"],
      ["#","#","#","O","#","#","#"],
      ["#","#","#","I","#","#","#"],
      ["S","H","A","D","O","W","#"],
    ],
    // 1 = r0c0 (MYSTERY-across)
    // 2 = r0c3 (TYPHOID-down)
    // 3 = r6c0 (SHADOW-across)
    numbers: [
      [1, 0, 0, 2, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [3, 0, 0, 0, 0, 0, 0],
    ],
    clues: {
      across: [
        { number: 1, clue: "Something unexplained or puzzling — an enigma", answer: "MYSTERY" },
        { number: 3, clue: "A dark silhouette cast when light is blocked", answer: "SHADOW" },
      ],
      down: [
        { number: 2, clue: "A serious bacterial disease spread by contaminated water", answer: "TYPHOID" },
      ],
    },
  },
};

// ── Helper: build word-cells map ──────────────────────────────────────────────
function buildWordMap(puzzle) {
  const map = {};
  const { solution, numbers, clues, size } = puzzle;

  clues.across.forEach(({ number }) => {
    let startR = -1, startC = -1;
    outer: for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (numbers[r][c] === number) { startR = r; startC = c; break outer; }
    if (startR === -1) return;
    const cells = [];
    let c = startC;
    while (c < size && solution[startR][c] !== "#") {
      cells.push({ row: startR, col: c });
      c++;
    }
    map[`across-${number}`] = cells;
  });

  clues.down.forEach(({ number }) => {
    let startR = -1, startC = -1;
    outer: for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (numbers[r][c] === number) { startR = r; startC = c; break outer; }
    if (startR === -1) return;
    const cells = [];
    let r = startR;
    while (r < size && solution[r][startC] !== "#") {
      cells.push({ row: r, col: startC });
      r++;
    }
    map[`down-${number}`] = cells;
  });

  return map;
}

function getWordForCell(row, col, direction, wordMap) {
  for (const [key, cells] of Object.entries(wordMap)) {
    if (!key.startsWith(direction)) continue;
    if (cells.some(c => c.row === row && c.col === col)) return key;
  }
  return null;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Cell component ────────────────────────────────────────────────────────────
function Cell({ row, col, puzzle, userGrid, activeCell, activeWord, wordMap, onClick, onKeyDown, cellRefs }) {
  const sol = puzzle.solution;
  const num = puzzle.numbers[row][col];
  const isBlack   = sol[row][col] === "#";
  const isActive  = activeCell?.row === row && activeCell?.col === col;
  const inWord    = activeWord ? (wordMap[activeWord] || []).some(c => c.row === row && c.col === col) : false;
  const userVal   = userGrid[row][col];
  const isCorrect = userVal && userVal === sol[row][col];

  if (isBlack) return <div className="aspect-square bg-[#111018] rounded-sm border border-[#111018]" />;

  return (
    <div
      onClick={() => onClick(row, col)}
      className={`aspect-square relative rounded-sm border cursor-pointer transition-all duration-150 flex items-center justify-center
        ${isActive  ? "bg-violet-500/40 border-violet-400 shadow-md shadow-violet-500/30 z-10"
        : inWord    ? "bg-violet-500/15 border-violet-500/40"
        : isCorrect ? "bg-emerald-500/10 border-emerald-500/25"
        :             "bg-white/[0.06] border-white/15 hover:bg-white/[0.1]"}`}
    >
      {num > 0 && (
        <span className="absolute top-0.5 left-0.5 text-[7px] sm:text-[9px] leading-none text-gray-400 font-semibold select-none">
          {num}
        </span>
      )}

      {isActive && (
        <input
          ref={el => { if (cellRefs.current) cellRefs.current[`${row}-${col}`] = el; }}
          type="text"
          maxLength={1}
          value=""
          onChange={() => {}}
          onKeyDown={e => onKeyDown(e, row, col)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          autoFocus
          autoComplete="off"
          inputMode="text"
        />
      )}

      {userVal && (
        <span className={`font-black text-sm sm:text-base select-none leading-none
          ${isCorrect ? "text-emerald-400" : "text-white"}`}>
          {userVal}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Crossword() {
  const [phase, setPhase]         = useState("select");
  const [difficulty, setDifficulty] = useState("easy");
  const [puzzle, setPuzzle]       = useState(null);
  const [wordMap, setWordMap]     = useState({});
  const [userGrid, setUserGrid]   = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [direction, setDirection] = useState("across");
  const [activeWord, setActiveWord] = useState(null);
  const [score, setScore]         = useState(0);
  const [seconds, setSeconds]     = useState(0);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintPenalty, setHintPenalty] = useState(0);
  const [filledCells, setFilledCells] = useState(0);
  const [finalScore, setFinalScore]   = useState(0);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [completedWords, setCompletedWords] = useState(new Set());

  const timerRef  = useRef(null);
  const cellRefs  = useRef({});

  // timer
  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const totalWhiteCells = puzzle ? puzzle.solution.flat().filter(c => c !== "#").length : 1;
  const completionPct   = Math.round((filledCells / totalWhiteCells) * 100);
  const totalWords      = Object.keys(wordMap).length;

  // ── start ──────────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const p  = FINAL_PUZZLES[difficulty];
    const wm = buildWordMap(p);
    setPuzzle(p);
    setWordMap(wm);
    setUserGrid(p.solution.map(row => row.map(c => c === "#" ? "#" : "")));
    setActiveCell(null);
    setActiveWord(null);
    setDirection("across");
    setScore(0);
    setSeconds(0);
    setHintsLeft(3);
    setHintPenalty(0);
    setFilledCells(0);
    setFinalScore(0);
    setSaveError("");
    setCompletedWords(new Set());
    setPhase("playing");
  }, [difficulty]);

  // ── save score ─────────────────────────────────────────────────────────────
  const saveScore = useCallback(async (fs, filled) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3001/api/game/save-score",
        { game_name: "Crossword", score: score, level: 1, moves_taken: filled, time_taken: seconds },
        { headers: { Authorization: token } }
      );
    } catch (err) {
      setSaveError(err.response?.data?.message || "Score could not be saved.");
    } finally {
      setSaving(false);
    }
  }, [difficulty, seconds]);

  // ── check completed words ──────────────────────────────────────────────────
  const checkWords = useCallback((grid, wm, puz) => {
    const newDone = new Set();
    let pts = 0;
    Object.entries(wm).forEach(([key, cells]) => {
      const formed = cells.map(({ row, col }) => grid[row][col]).join("");
      const dir    = key.startsWith("across") ? "across" : "down";
      const num    = parseInt(key.split("-")[1]);
      const clueObj = puz.clues[dir].find(c => c.number === num);
      if (clueObj && formed === clueObj.answer) { newDone.add(key); pts += 150; }
    });
    setCompletedWords(newDone);
    setScore(pts);
    return { newDone, pts };
  }, []);

  // ── check full win ─────────────────────────────────────────────────────────
  const checkWin = useCallback((grid, puz) =>
    puz.solution.every((row, r) => row.every((cell, c) => cell === "#" || grid[r][c] === cell))
  , []);

  // ── cell click ─────────────────────────────────────────────────────────────
  const handleCellClick = useCallback((row, col) => {
    if (!puzzle || puzzle.solution[row][col] === "#") return;
    let newDir = direction;
    if (activeCell?.row === row && activeCell?.col === col) {
      newDir = direction === "across" ? "down" : "across";
      setDirection(newDir);
    }
    setActiveCell({ row, col });
    const word = getWordForCell(row, col, newDir, wordMap)
      || getWordForCell(row, col, newDir === "across" ? "down" : "across", wordMap);
    setActiveWord(word);
    setTimeout(() => cellRefs.current[`${row}-${col}`]?.focus(), 30);
  }, [activeCell, direction, puzzle, wordMap]);

  // ── key down ───────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e, row, col) => {
    if (!puzzle) return;
    const { size, solution } = puzzle;

    if (e.key === "Tab") { e.preventDefault(); return; }

    if (e.key === "Backspace") {
      e.preventDefault();
      const ng = userGrid.map(r => [...r]);
      if (ng[row][col] !== "") {
        ng[row][col] = "";
        setUserGrid(ng);
        const filled = ng.flat().filter(c => c !== "#" && c !== "").length;
        setFilledCells(filled);
        checkWords(ng, wordMap, puzzle);
      } else {
        if (direction === "across" && col > 0 && solution[row][col-1] !== "#") {
          setActiveCell({ row, col: col-1 });
          setActiveWord(getWordForCell(row, col-1, "across", wordMap));
          setTimeout(() => cellRefs.current[`${row}-${col-1}`]?.focus(), 30);
        } else if (direction === "down" && row > 0 && solution[row-1][col] !== "#") {
          setActiveCell({ row: row-1, col });
          setActiveWord(getWordForCell(row-1, col, "down", wordMap));
          setTimeout(() => cellRefs.current[`${row-1}-${col}`]?.focus(), 30);
        }
      }
      return;
    }

    if (e.key.match(/^Arrow/)) {
      e.preventDefault();
      let nr = row, nc = col, nd = direction;
      if (e.key === "ArrowRight") { nc = Math.min(size-1, col+1); nd = "across"; }
      if (e.key === "ArrowLeft")  { nc = Math.max(0, col-1);      nd = "across"; }
      if (e.key === "ArrowDown")  { nr = Math.min(size-1, row+1); nd = "down";   }
      if (e.key === "ArrowUp")    { nr = Math.max(0, row-1);      nd = "down";   }
      if (solution[nr][nc] !== "#") {
        setDirection(nd);
        setActiveCell({ row: nr, col: nc });
        setActiveWord(getWordForCell(nr, nc, nd, wordMap));
        setTimeout(() => cellRefs.current[`${nr}-${nc}`]?.focus(), 30);
      }
      return;
    }

    const letter = e.key.toUpperCase();
    if (!letter.match(/^[A-Z]$/)) return;
    e.preventDefault();

    const ng = userGrid.map(r => [...r]);
    ng[row][col] = letter;
    setUserGrid(ng);
    const filled = ng.flat().filter(c => c !== "#" && c !== "").length;
    setFilledCells(filled);
    const { pts } = checkWords(ng, wordMap, puzzle);

    if (checkWin(ng, puzzle)) {
      clearInterval(timerRef.current);
      const timeBonus = Math.max(0, 500 - seconds * 2);
      const fs = Math.max(0, pts + timeBonus - hintPenalty);
      setFinalScore(fs);
      setPhase("finished");
      saveScore(fs, filled);
      return;
    }

    // advance cursor
    if (direction === "across") {
      let nc = col + 1;
      while (nc < size && solution[row][nc] === "#") nc++;
      if (nc < size) {
        setActiveCell({ row, col: nc });
        setActiveWord(getWordForCell(row, nc, "across", wordMap));
        setTimeout(() => cellRefs.current[`${row}-${nc}`]?.focus(), 30);
      }
    } else {
      let nr = row + 1;
      while (nr < size && solution[nr][col] === "#") nr++;
      if (nr < size) {
        setActiveCell({ row: nr, col });
        setActiveWord(getWordForCell(nr, col, "down", wordMap));
        setTimeout(() => cellRefs.current[`${nr}-${col}`]?.focus(), 30);
      }
    }
  }, [puzzle, userGrid, direction, wordMap, seconds, hintPenalty, checkWords, checkWin, saveScore]);

  // ── hint ───────────────────────────────────────────────────────────────────
  const handleHint = useCallback(() => {
    if (hintsLeft <= 0 || !activeWord || !puzzle) return;
    const cells = wordMap[activeWord] || [];
    const empty = cells.filter(({ row, col }) => userGrid[row][col] !== puzzle.solution[row][col]);
    if (empty.length === 0) return;
    const { row, col } = empty[Math.floor(Math.random() * empty.length)];
    const ng = userGrid.map(r => [...r]);
    ng[row][col] = puzzle.solution[row][col];
    setUserGrid(ng);
    const filled = ng.flat().filter(c => c !== "#" && c !== "").length;
    setFilledCells(filled);
    setHintsLeft(h => h - 1);
    setHintPenalty(p => p + 50);
    checkWords(ng, wordMap, puzzle);
  }, [hintsLeft, activeWord, puzzle, wordMap, userGrid, checkWords]);

  const starCount = completedWords.size >= totalWords ? 3 : completedWords.size >= totalWords * 0.6 ? 2 : 1;

  const diffMeta = {
    easy:   { label: "Easy",   bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", btn: "from-emerald-600 to-teal-600",    shadow: "shadow-emerald-500/25", ring: "ring-emerald-500/40" },
    medium: { label: "Medium", bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/30",    btn: "from-cyan-600 to-blue-600",       shadow: "shadow-cyan-500/25",    ring: "ring-cyan-500/40"    },
    hard:   { label: "Hard",   bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "border-fuchsia-500/30", btn: "from-fuchsia-600 to-violet-600",  shadow: "shadow-fuchsia-500/25", ring: "ring-fuchsia-500/40" },
  };
  const dm = diffMeta[difficulty];

  const activeClue = activeWord ? (() => {
    const dir = activeWord.startsWith("across") ? "across" : "down";
    const num = parseInt(activeWord.split("-")[1]);
    return puzzle?.clues[dir].find(c => c.number === num) || null;
  })() : null;

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: SELECT
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === "select") return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-fuchsia-600/8 blur-3xl rounded-full pointer-events-none" />

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Dashboard
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white text-sm font-semibold">Crossword</span>
        </div>
      </header>

      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 border border-fuchsia-500/30 text-4xl mb-2">🔤</div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Cross<span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">word</span>
            </h1>
            <p className="text-gray-400 text-base">Fill the grid using across and down clues. Every letter must match exactly.</p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">How to play</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "🖱️", text: "Click a cell to select it" },
                { icon: "↔️", text: "Click again to toggle direction" },
                { icon: "⌨️", text: "Type to fill — auto-advances" },
                { icon: "💡", text: "3 hints available (−50 pts each)" },
              ].map(s => (
                <div key={s.text} className="flex items-start gap-2.5">
                  <span className="text-lg shrink-0">{s.icon}</span>
                  <p className="text-xs text-gray-400 leading-snug">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Select difficulty</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(diffMeta).map(([key, val]) => (
                <button key={key} onClick={() => setDifficulty(key)}
                  className={`rounded-xl border p-4 text-center transition-all duration-200 ${
                    difficulty === key ? `${val.bg} ${val.border} ring-2 ${val.ring}` : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07]"
                  }`}>
                  <p className={`font-bold text-sm ${difficulty === key ? val.text : "text-gray-300"}`}>{val.label}</p>
                  <p className="text-gray-500 text-xs mt-1">{key === "easy" ? "5×5 grid" : "7×7 grid"}</p>
                </button>
              ))}
            </div>
          </div>

          <button onClick={startGame}
            className={`w-full py-4 rounded-xl bg-gradient-to-r ${dm.btn} text-white font-bold text-base tracking-wide shadow-lg ${dm.shadow} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}>
            Start Puzzle →
          </button>
        </div>
      </main>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: PLAYING
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === "playing" && puzzle) return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/dashboard" className="text-gray-500 hover:text-white transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </Link>
          <span className="text-white font-bold text-sm shrink-0">Crossword</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dm.bg} ${dm.text} border ${dm.border} shrink-0`}>{dm.label}</span>
          <div className="flex-1" />
          <button onClick={handleHint} disabled={hintsLeft === 0 || !activeWord}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold hover:bg-yellow-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
            💡 Hint ({hintsLeft})
          </button>
          <button onClick={startGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-sm transition-all shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Restart
          </button>
        </div>
      </header>

      <main className="relative flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Score",    value: score,                color: "text-violet-400"  },
            { label: "Time",     value: formatTime(seconds),  color: "text-fuchsia-400" },
            { label: "Hints",    value: hintsLeft,            color: "text-yellow-400"  },
            { label: "Done",     value: `${completionPct}%`,  color: "text-emerald-400" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-center">
              <p className={`text-xl font-black tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Left: grid + active clue */}
          <div className="flex flex-col items-center gap-4 flex-1">
            {/* Active clue banner */}
            <div className={`w-full rounded-xl border px-4 py-3 min-h-[52px] flex items-center gap-3 transition-all ${
              activeWord ? "bg-violet-500/10 border-violet-500/25" : "bg-white/[0.03] border-white/[0.06]"
            }`}>
              {activeWord && activeClue ? (
                <>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
                    activeWord.startsWith("across") ? "bg-cyan-500/20 text-cyan-400" : "bg-fuchsia-500/20 text-fuchsia-400"
                  }`}>
                    {activeClue.number} {activeWord.startsWith("across") ? "Across" : "Down"}
                  </span>
                  <span className="text-white text-sm">{activeClue.clue}</span>
                </>
              ) : (
                <span className="text-gray-600 text-sm italic">Click a cell to see the clue</span>
              )}
            </div>

            {/* Grid */}
            <div
              className="rounded-xl border border-white/10 bg-[#0d0c16] p-2.5 sm:p-3 shadow-2xl shadow-black/50"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
                gap: "3px",
                width: `min(100%, ${puzzle.size === 5 ? "300px" : "380px"})`,
              }}
            >
              {Array.from({ length: puzzle.size }, (_, r) =>
                Array.from({ length: puzzle.size }, (_, c) => (
                  <Cell
                    key={`${r}-${c}`}
                    row={r} col={c}
                    puzzle={puzzle}
                    userGrid={userGrid}
                    activeCell={activeCell}
                    activeWord={activeWord}
                    wordMap={wordMap}
                    onClick={handleCellClick}
                    onKeyDown={handleKeyDown}
                    cellRefs={cellRefs}
                  />
                ))
              )}
            </div>

            {/* Direction toggle */}
            <div className="flex gap-2">
              {["across","down"].map(d => (
                <button key={d}
                  onClick={() => {
                    setDirection(d);
                    if (activeCell) {
                      const w = getWordForCell(activeCell.row, activeCell.col, d, wordMap);
                      setActiveWord(w);
                      setTimeout(() => cellRefs.current[`${activeCell.row}-${activeCell.col}`]?.focus(), 30);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    direction === d
                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                      : "bg-white/[0.04] border border-white/[0.08] text-gray-500 hover:text-white"
                  }`}>
                  {d === "across" ? "→ Across" : "↓ Down"}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Clue lists */}
          <div className="lg:w-60 xl:w-68 flex flex-col gap-4">
            {/* Across clues */}
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-2">
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">→ Across</p>
              {puzzle.clues.across.map(({ number, clue }) => {
                const key  = `across-${number}`;
                const done = completedWords.has(key);
                const isAct = activeWord === key;
                return (
                  <button key={number} onClick={() => {
                    const cells = wordMap[key] || [];
                    if (cells.length) {
                      const { row, col } = cells[0];
                      setActiveCell({ row, col });
                      setDirection("across");
                      setActiveWord(key);
                      setTimeout(() => cellRefs.current[`${row}-${col}`]?.focus(), 30);
                    }
                  }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-all ${
                    isAct ? "bg-cyan-500/15 border border-cyan-500/30 text-white"
                    : done ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/70"
                    :        "bg-white/[0.03] border border-transparent hover:bg-white/[0.07] text-gray-300"
                  }`}>
                    <span className="font-bold text-cyan-400 mr-1.5">{number}.</span>
                    <span className={done ? "line-through opacity-60" : ""}>{clue}</span>
                  </button>
                );
              })}
            </div>

            {/* Down clues */}
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 space-y-2">
              <p className="text-xs font-bold text-fuchsia-400 uppercase tracking-widest">↓ Down</p>
              {puzzle.clues.down.map(({ number, clue }) => {
                const key  = `down-${number}`;
                const done = completedWords.has(key);
                const isAct = activeWord === key;
                return (
                  <button key={number} onClick={() => {
                    const cells = wordMap[key] || [];
                    if (cells.length) {
                      const { row, col } = cells[0];
                      setActiveCell({ row, col });
                      setDirection("down");
                      setActiveWord(key);
                      setTimeout(() => cellRefs.current[`${row}-${col}`]?.focus(), 30);
                    }
                  }}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-all ${
                    isAct ? "bg-fuchsia-500/15 border border-fuchsia-500/30 text-white"
                    : done ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/70"
                    :        "bg-white/[0.03] border border-transparent hover:bg-white/[0.07] text-gray-300"
                  }`}>
                    <span className="font-bold text-fuchsia-400 mr-1.5">{number}.</span>
                    <span className={done ? "line-through opacity-60" : ""}>{clue}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // RENDER: FINISHED
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === "finished") {
    const timeBonus = Math.max(0, 500 - seconds * 2);
    return (
      <div className="min-h-screen bg-[#0a0a0f] font-sans flex items-center justify-center px-4 py-12">
        <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-fuchsia-600/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative w-full max-w-md">
          <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500" />
          <div className="rounded-b-2xl bg-[#12111a] border border-white/[0.08] border-t-0 p-8 space-y-6 shadow-2xl shadow-black/50">

            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center text-4xl shadow-xl">🏆</div>
              <h2 className="text-2xl font-black text-white">Puzzle Complete!</h2>
              <p className="text-gray-400 text-sm">{completedWords.size} of {totalWords} words solved · {dm.label}</p>
            </div>

            <div className="flex justify-center gap-3">
              {[1,2,3].map(s => (
                <svg key={s} className={`w-9 h-9 transition-all ${s <= starCount ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" : "text-white/10"}`}
                  fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>

            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3 text-sm">
              {[
                { label: "Words Solved",  value: `${completedWords.size} / ${totalWords}`, color: "text-emerald-400" },
                { label: "Cells Filled",  value: filledCells,                              color: "text-violet-400"  },
                { label: "Hint Penalty",  value: `-${hintPenalty}`,                        color: "text-red-400"     },
                { label: "Match Score",   value: score.toLocaleString(),                   color: "text-violet-400"  },
                { label: "Time Bonus",    value: `+${timeBonus.toLocaleString()}`,          color: "text-cyan-400"    },
                { label: "Time Taken",    value: formatTime(seconds),                       color: "text-gray-300"    },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-gray-400">{row.label}</span>
                  <span className={`font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white font-bold">Final Score</span>
                <span className="text-yellow-400 font-black text-2xl">{finalScore.toLocaleString()}</span>
              </div>
            </div>

            {saving && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving score…
              </div>
            )}
            {!saving && !saveError && (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
                Score saved successfully
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {saveError}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={startGame}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white font-bold text-sm shadow-lg shadow-fuchsia-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Play Again
              </button>
              <Link to="/dashboard"
                className="flex-1 flex items-center justify-center py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
                Dashboard
              </Link>
            </div>

            <div className="flex justify-center gap-2">
              {Object.entries(diffMeta).map(([key, val]) => (
                <button key={key} onClick={() => { setDifficulty(key); setPhase("select"); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    difficulty === key ? `${val.bg} ${val.text} ${val.border}` : "bg-white/[0.03] text-gray-500 border-white/[0.07] hover:text-white"
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
