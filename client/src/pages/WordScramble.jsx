import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// ── Word Banks ────────────────────────────────────────────────────────────────
const WORD_BANKS = {
  easy: [
    { word: "CAT", hint: "A common household pet" },
    { word: "DOG", hint: "Man's best friend" },
    { word: "SUN", hint: "The star at the center of our solar system" },
    { word: "MAP", hint: "Used for navigation" },
    { word: "CUP", hint: "You drink from it" },
    { word: "BED", hint: "You sleep on it" },
    { word: "FAN", hint: "Keeps you cool" },
    { word: "JAR", hint: "Glass container with a lid" },
    { word: "NET", hint: "Used in fishing or sports" },
    { word: "PEN", hint: "You write with it" },
    { word: "BOX", hint: "A square container" },
    { word: "KEY", hint: "Opens a lock" },
  ],
  medium: [
    { word: "BRAIN", hint: "The organ of thought" },
    { word: "FLAME", hint: "Hot and glowing" },
    { word: "GRAPE", hint: "A small purple or green fruit" },
    { word: "SHARK", hint: "Apex ocean predator" },
    { word: "PLANT", hint: "A living, rooted organism" },
    { word: "CLOUD", hint: "Floats in the sky" },
    { word: "STORM", hint: "Intense weather event" },
    { word: "SWORD", hint: "A bladed weapon" },
    { word: "CHESS", hint: "A strategy board game" },
    { word: "DREAM", hint: "Images while you sleep" },
    { word: "CROWN", hint: "Worn by royalty" },
    { word: "GLOBE", hint: "A model of the Earth" },
  ],
  hard: [
    { word: "PUZZLE", hint: "A problem designed to test ingenuity" },
    { word: "SPHINX", hint: "Mythical creature with a riddle" },
    { word: "QUARTZ", hint: "A common crystalline mineral" },
    { word: "KNIGHT", hint: "A chess piece that moves in an L shape" },
    { word: "JUNGLE", hint: "Dense tropical forest" },
    { word: "BLAZER", hint: "A type of jacket" },
    { word: "FLICKER", hint: "A brief unsteady light" },
    { word: "PHANTOM", hint: "A ghost or apparition" },
    { word: "CRIMSON", hint: "A deep red color" },
    { word: "ECLIPSE", hint: "When one celestial body blocks another" },
    { word: "SERPENT", hint: "Another word for snake" },
    { word: "TRIUMPH", hint: "A great victory or achievement" },
  ],
};

const WORDS_PER_GAME = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────
function scrambleWord(word) {
  const arr = word.split("");
  let scrambled;
  let attempts = 0;
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    scrambled = arr.join("");
    attempts++;
  } while (scrambled === word && attempts < 20);
  return scrambled;
}

function pickWords(difficulty) {
  const bank = [...WORD_BANKS[difficulty]];
  const picked = [];
  while (picked.length < WORDS_PER_GAME && bank.length > 0) {
    const idx = Math.floor(Math.random() * bank.length);
    picked.push(bank.splice(idx, 1)[0]);
  }
  return picked.map((w) => ({ ...w, scrambled: scrambleWord(w.word) }));
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const DIFFICULTY_META = {
  easy:   { label: "Easy",   color: "emerald", points: 100, timeBonus: 5  },
  medium: { label: "Medium", color: "cyan",    points: 150, timeBonus: 8  },
  hard:   { label: "Hard",   color: "fuchsia", points: 200, timeBonus: 12 },
};

// ── Letter Tile ───────────────────────────────────────────────────────────────
function LetterTile({ letter, index, animate }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-12 sm:w-12 sm:h-14 rounded-xl font-black text-lg sm:text-xl text-white border transition-all duration-300 select-none
        ${animate
          ? "bg-gradient-to-b from-violet-500/30 to-violet-700/20 border-violet-400/50 shadow-lg shadow-violet-500/20 scale-105"
          : "bg-white/[0.06] border-white/10"
        }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {letter}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WordScramble() {
  const navigate = useNavigate();

  // ── Phase: "select" | "playing" | "finished"
  const [phase, setPhase] = useState("select");
  const [difficulty, setDifficulty] = useState("medium");

  // ── Game state
  const [words, setWords] = useState([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [solved, setSolved] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [feedback, setFeedback] = useState(null); // "correct" | "wrong" | null
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [finalScore, setFinalScore] = useState(0);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const currentWord = words[wordIndex] || null;
  const meta = DIFFICULTY_META[difficulty];

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "playing") {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Focus input when word changes ─────────────────────────────────────────
  useEffect(() => {
    if (phase === "playing") {
      setTimeout(() => inputRef.current?.focus(), 100);
      setInput("");
      setShowHint(false);
      setHintUsed(false);
      setFeedback(null);
    }
  }, [wordIndex, phase]);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const picked = pickWords(difficulty);
    setWords(picked);
    setWordIndex(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSolved(0);
    setSeconds(0);
    setSkipped(0);
    setFeedback(null);
    setSaveError("");
    setFinalScore(0);
    setPhase("playing");
  }, [difficulty]);

  // ── Save score to backend ─────────────────────────────────────────────────
  const saveScore = async (computedScore) => {
  console.log("SAVE SCORE FUNCTION CALLED");

  const token = localStorage.getItem("token");
  console.log("TOKEN:", token);

  try {
    const res = await axios.post(
      "http://localhost:3001/api/game/save-score",
      {
        game_name: "Word Scramble",
        score: computedScore,
        level: 1,
        moves_taken: solved,
        time_taken: seconds,
      },
      {
        headers: {
          Authorization: token,
        },
      }
    );

    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR:", err.response?.data || err.message);
  }
};

  // ── End game ──────────────────────────────────────────────────────────────
  const endGame = useCallback((currentScore, currentSolved) => {
    clearInterval(timerRef.current);
    const timeBonus = Math.max(0, (180 - seconds) * meta.timeBonus);
    const total = currentScore + timeBonus;
    setFinalScore(total);
    setPhase("finished");
    saveScore(total);
  }, [seconds, meta.timeBonus, saveScore]);

  // ── Handle submit ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (!input.trim() || feedback) return;

    const guess = input.trim().toUpperCase();
    const correct = currentWord.word;

    if (guess === correct) {
      const newStreak = streak + 1;
      const streakBonus = newStreak >= 3 ? Math.floor(newStreak * 15) : 0;
      const hintPenalty = hintUsed ? Math.floor(meta.points * 0.3) : 0;
      const points = meta.points + streakBonus - hintPenalty;
      const newScore = score + points;
      const newSolved = solved + 1;

      setScore(newScore);
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
      setSolved(newSolved);
      setFeedback("correct");

      setTimeout(() => {
        if (wordIndex + 1 >= WORDS_PER_GAME) {
          endGame(newScore, newSolved);
        } else {
          setWordIndex((i) => i + 1);
        }
      }, 900);
    } else {
      setStreak(0);
      setFeedback("wrong");
      setTimeout(() => {
        setFeedback(null);
        setInput("");
      }, 700);
    }
  }, [input, feedback, currentWord, streak, hintUsed, meta.points, score, solved, wordIndex, endGame]);

  // ── Skip word ─────────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (feedback) return;
    setStreak(0);
    setSkipped((s) => s + 1);
    setFeedback("wrong");
    setTimeout(() => {
      if (wordIndex + 1 >= WORDS_PER_GAME) {
        endGame(score, solved);
      } else {
        setWordIndex((i) => i + 1);
      }
    }, 600);
  }, [feedback, wordIndex, endGame, score, solved]);

  // ── Stars rating ──────────────────────────────────────────────────────────
  const starCount = solved >= 9 ? 3 : solved >= 6 ? 2 : 1;
  const timeBonus = Math.max(0, (180 - seconds) * meta.timeBonus);

  // ── Difficulty color map ──────────────────────────────────────────────────
  const diffColor = {
    easy:   { ring: "ring-emerald-500/50", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", btn: "from-emerald-600 to-emerald-700 shadow-emerald-500/25" },
    medium: { ring: "ring-cyan-500/50",    bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/30",    btn: "from-cyan-600 to-cyan-700 shadow-cyan-500/25" },
    hard:   { ring: "ring-fuchsia-500/50", bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "border-fuchsia-500/30", btn: "from-fuchsia-600 to-fuchsia-700 shadow-fuchsia-500/25" },
  };
  const dc = diffColor[difficulty];

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: DIFFICULTY SELECT
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "select") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
        <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-cyan-500/8 blur-3xl rounded-full pointer-events-none" />

        {/* Navbar */}
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Dashboard
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-white text-sm font-semibold">Word Scramble</span>
          </div>
        </header>

        <main className="relative flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg space-y-8">
            {/* Hero */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-4xl mb-2">
                📝
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight">
                Word <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Scramble</span>
              </h1>
              <p className="text-gray-400 text-base">Unscramble 10 words as fast as you can. Streaks earn bonus points.</p>
            </div>

            {/* How to play */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">How to play</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: "🔀", label: "See scrambled word" },
                  { icon: "⌨️", label: "Type correct answer" },
                  { icon: "🔥", label: "Build your streak" },
                ].map((s) => (
                  <div key={s.label} className="space-y-2">
                    <span className="text-2xl">{s.icon}</span>
                    <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty select */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Select difficulty</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(DIFFICULTY_META).map(([key, val]) => {
                  const c = diffColor[key];
                  const active = difficulty === key;
                  return (
                    <button key={key} onClick={() => setDifficulty(key)}
                      className={`rounded-xl border p-4 text-center transition-all duration-200 ${
                        active
                          ? `${c.bg} ${c.border} ${c.ring} ring-2`
                          : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07]"
                      }`}>
                      <p className={`font-bold text-sm ${active ? c.text : "text-gray-300"}`}>{val.label}</p>
                      <p className="text-gray-500 text-xs mt-1">{val.points} pts/word</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start button */}
            <button onClick={startGame}
              className={`w-full py-4 rounded-xl bg-gradient-to-r ${dc.btn} text-white font-bold text-base tracking-wide shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}>
              Start Game →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: PLAYING
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "playing" && currentWord) {
    const progress = (wordIndex / WORDS_PER_GAME) * 100;

    return (
      <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col">
        <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-500 hover:text-white transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-white font-bold text-sm">Word Scramble</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dc.bg} ${dc.text} border ${dc.border}`}>
                {meta.label}
              </span>
            </div>

            <div className="flex-1 mx-2">
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>

            <span className="text-gray-400 text-xs shrink-0 tabular-nums">{wordIndex}/{WORDS_PER_GAME}</span>
          </div>
        </header>

        <main className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">

          {/* Stats row */}
          <div className="w-full max-w-2xl grid grid-cols-4 gap-3">
            {[
              { label: "Score", value: score.toLocaleString(), icon: "⭐", color: "text-violet-400" },
              { label: "Solved", value: `${solved}/${WORDS_PER_GAME}`, icon: "✅", color: "text-emerald-400" },
              { label: "Time", value: formatTime(seconds), icon: "⏱", color: "text-fuchsia-400" },
              { label: "Streak", value: `🔥 ${streak}`, icon: "", color: "text-orange-400" },
            ].map((s) => (
              <div key={s.label}
                className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-center">
                <p className={`text-xl font-black ${s.color} tabular-nums`}>{s.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Word card */}
          <div className={`w-full max-w-2xl rounded-2xl border bg-white/[0.04] backdrop-blur-sm p-8 flex flex-col items-center gap-6 transition-all duration-300 ${
            feedback === "correct" ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10" :
            feedback === "wrong"   ? "border-red-500/40 shadow-lg shadow-red-500/10" :
            "border-white/[0.08]"
          }`}>

            {/* Word number */}
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              Word {wordIndex + 1} of {WORDS_PER_GAME}
            </p>

            {/* Scrambled letters */}
            <div className="flex flex-wrap justify-center gap-2">
              {currentWord.scrambled.split("").map((letter, i) => (
                <LetterTile key={i} letter={letter} index={i} animate={feedback === "correct"} />
              ))}
            </div>

            {/* Feedback overlay */}
            {feedback && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${
                feedback === "correct"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {feedback === "correct" ? (
                  <><span>✓</span> Correct! +{hintUsed ? Math.floor(meta.points * 0.7) : meta.points}{streak >= 3 ? ` +${Math.floor(streak * 15)} streak` : ""}</>
                ) : (
                  <><span>✗</span> Not quite — try again</>
                )}
              </div>
            )}

            {/* Hint */}
            {showHint && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                <span>💡</span> {currentWord.hint}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-4">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                disabled={!!feedback}
                placeholder="Type your answer…"
                maxLength={currentWord.word.length + 2}
                className={`w-full max-w-sm text-center text-xl font-bold tracking-[0.2em] bg-white/[0.06] border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-all ${
                  feedback === "correct" ? "border-emerald-500/50 focus:ring-0" :
                  feedback === "wrong"   ? "border-red-500/50 focus:ring-0" :
                  "border-white/10 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
                }`}
              />

              <div className="flex gap-3 w-full max-w-sm">
                <button type="submit" disabled={!input.trim() || !!feedback}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed">
                  Submit
                </button>
                <button type="button"
                  onClick={() => { setShowHint(true); setHintUsed(true); }}
                  disabled={showHint || !!feedback}
                  className="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-yellow-400 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Show hint (−30% points)">
                  💡 Hint
                </button>
                <button type="button" onClick={handleSkip} disabled={!!feedback}
                  className="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  Skip
                </button>
              </div>
            </form>
          </div>

          {/* Streak indicator */}
          {streak >= 2 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400 text-sm font-bold animate-pulse">
              🔥 {streak} word streak! +{Math.floor(streak * 15)} bonus per correct answer
            </div>
          )}

        </main>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER: FINISHED
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "finished") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] font-sans flex flex-col items-center justify-center px-4 py-12">
        <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-72 bg-violet-600/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative w-full max-w-md">
          {/* Top gradient strip */}
          <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-violet-500 via-cyan-500 to-fuchsia-500" />

          <div className="rounded-b-2xl bg-[#12111a] border border-white/[0.08] border-t-0 p-8 space-y-6 shadow-2xl shadow-black/50">

            {/* Trophy */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 flex items-center justify-center text-4xl shadow-xl">
                🏆
              </div>
              <h2 className="text-2xl font-black text-white">Game Complete!</h2>
              <p className="text-gray-400 text-sm">{solved} of {WORDS_PER_GAME} words solved · {meta.label} difficulty</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-3">
              {[1, 2, 3].map((s) => (
                <svg key={s}
                  className={`w-9 h-9 transition-all duration-500 ${
                    s <= starCount
                      ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                      : "text-white/10"
                  }`}
                  fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Score breakdown */}
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3 text-sm">
              {[
                { label: "Words Solved",  value: `${solved} / ${WORDS_PER_GAME}`,       color: "text-emerald-400" },
                { label: "Words Skipped", value: skipped,                                color: "text-red-400" },
                { label: "Best Streak",   value: `🔥 ${bestStreak}`,                    color: "text-orange-400" },
                { label: "Match Score",   value: score.toLocaleString(),                 color: "text-violet-400" },
                { label: "Time Bonus",    value: `+${timeBonus.toLocaleString()}`,       color: "text-cyan-400" },
                { label: "Time Taken",    value: formatTime(seconds),                    color: "text-gray-300" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-gray-400">{row.label}</span>
                  <span className={`font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <span className="text-white font-bold">Final Score</span>
                <span className="text-yellow-400 font-black text-2xl">{finalScore.toLocaleString()}</span>
              </div>
            </div>

            {/* Save status */}
            {saving && (
              <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving score…
              </div>
            )}
            {!saving && !saveError && (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Score saved successfully
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {saveError}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={startGame}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Play Again
              </button>
              <Link to="/dashboard"
                className="flex-1 flex items-center justify-center py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all">
                Dashboard
              </Link>
            </div>

            {/* Difficulty change */}
            <div className="flex justify-center gap-2">
              {Object.entries(DIFFICULTY_META).map(([key, val]) => {
                const c = diffColor[key];
                return (
                  <button key={key}
                    onClick={() => { setDifficulty(key); setPhase("select"); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      difficulty === key
                        ? `${c.bg} ${c.text} ${c.border}`
                        : "bg-white/[0.03] text-gray-500 border-white/[0.07] hover:text-white"
                    }`}>
                    {val.label}
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    );
  }

  return null;
}
