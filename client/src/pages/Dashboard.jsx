import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const GAMES = [
  {
    id: "memory",
    name: "Memory Match",
    desc: "Flip cards and find matching pairs to train short-term memory.",
    icon: "🧠",
    route: "/game/memory",
    gradient: "from-violet-600 to-violet-900",
    glow: "shadow-violet-500/20",
    border: "border-violet-500/30",
    badge: "Most Popular",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    gameKey: "Memory Match",   // ← used to match backend game_name
    difficulty: "Medium",
  },
  {
    id: "word",
    name: "Word Scramble",
    desc: "Unscramble jumbled letters to form the correct word as fast as you can.",
    icon: "📝",
    route: "/game/word",
    gradient: "from-cyan-600 to-cyan-900",
    glow: "shadow-cyan-500/20",
    border: "border-cyan-500/30",
    badge: "New",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    gameKey: "Word Scramble",
    difficulty: "Easy",
  },
  {
    id: "crossword",
    name: "Crossword",
    desc: "Solve themed crossword puzzles crafted to challenge your vocabulary.",
    icon: "🔤",
    route: "/game/crossword",
    gradient: "from-fuchsia-600 to-fuchsia-900",
    glow: "shadow-fuchsia-500/20",
    border: "border-fuchsia-500/30",
    badge: "Hard",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
    gameKey: "Crossword",
    difficulty: "Hard",
  },
  {
    id: "sudoku",
    name: "Sudoku",
    desc: "Fill every row, column, and 3×3 box with digits 1–9. No repeats allowed.",
    icon: "🔢",
    route: "/game/sudoku",
    gradient: "from-indigo-600 to-indigo-900",
    glow: "shadow-indigo-500/20",
    border: "border-indigo-500/30",
    badge: "Logic",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    gameKey: "Sudoku",
    difficulty: "Medium",
  },
  {
    id: "number-puzzle",
    name: "Number Puzzle",
    desc: "Slide tiles 1–15 into order. Fewer moves and faster time wins.",
    icon: "🔢",
    route: "/game/number-puzzle",
    gradient: "from-violet-600 to-indigo-900",
    glow: "shadow-violet-500/20",
    border: "border-violet-500/30",
    badge: "Classic",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    gameKey: "Number Puzzle",
    difficulty: "Medium",
  },
  {
    id: "pattern",
    name: "Pattern Memory",
    desc: "Watch the tile sequence flash and repeat it perfectly. Each round adds one more.",
    icon: "🎯",
    route: "/game/pattern",
    gradient: "from-fuchsia-600 to-fuchsia-900",
    glow: "shadow-fuchsia-500/20",
    border: "border-fuchsia-500/30",
    badge: "Simon Says",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
    gameKey: "Pattern Memory",
    difficulty: "Medium",
  },
];
const AVATARS = ["🐉", "🦊", "🦁", "🐺", "🦅", "🐯"];

function getGreetings(user, stats) {
  const messages = [
    <>Every round sharpens the mind — <span className="text-violet-400 font-semibold">keep going</span>.</>,
    <>You've played <span className="text-violet-400 font-semibold">{stats.gamesPlayed || 0} games</span> so far. Nice consistency.</>,
    <>Your brain is warming up — <span className="text-violet-400 font-semibold">one more round?</span></>,
    <>Small daily wins add up to <span className="text-violet-400 font-semibold">big progress</span>.</>,
    user.current_level > 1
      ? <>You've climbed to <span className="text-violet-400 font-semibold">Level {user.current_level}</span> — solid work.</>
      : <>Play a game to start climbing the <span className="text-violet-400 font-semibold">levels</span>.</>,
    stats.highestScore > 0
      ? <>Your best score so far: <span className="text-violet-400 font-semibold">{stats.highestScore.toLocaleString()}</span>. Can you beat it?</>
      : <>Set your <span className="text-violet-400 font-semibold">first high score</span> today.</>,
    <>Consistency beats intensity — <span className="text-violet-400 font-semibold">a few minutes daily</span> is all it takes.</>,
    <>Ready to challenge your <span className="text-violet-400 font-semibold">memory and focus</span> today?</>,
  ];
  return messages;
}

export default function Dashboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    highestScore: 0,
    avgScore: 0,
    globalRank: "-"
  });
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "",
    current_level: 1,
    total_score: 0,
    xp: 0,
    nextXp: 5000
  });
  const [avatarIdx] = useState(2);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [greetingIdx, setGreetingIdx] = useState(0);
  const [gameCounts, setGameCounts] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setCurrentUserId(JSON.parse(stored).id); } catch { }
    }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          "http://localhost:3001/api/user/profile",
          {
            headers: {
              Authorization: token
            }
          }
        );

        setUser(res.data);
      } catch (error) {
        console.log(error);
      }
    };

    const token = localStorage.getItem("token");

    axios.get(
      "http://localhost:3001/api/user/stats",
      {
        headers: {
          Authorization: token
        }
      }
    )
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        console.log(err);
      });

    axios
      .get("http://localhost:3001/api/user/leaderboard")
      .then((res) => {
        setLeaderboard(res.data);
      })
      .catch((err) => {
        console.log(err);
      });

    axios.get(
      "http://localhost:3001/api/user/achievements",
      { headers: { Authorization: token } }
    )
      .then((res) => {
        setAchievements(res.data.achievements);
      })
      .catch((err) => {
        console.log(err);
      });

    axios.get(
      "http://localhost:3001/api/user/game-counts",
      { headers: { Authorization: token } }
    )
      .then((res) => {
        const counts = {};
        res.data.forEach((g) => {
          counts[g.game_name] = g.playCount;
        });
        setGameCounts(counts);
      })
      .catch((err) => {
        console.log(err);
      });

    fetchProfile();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIdx((i) => i + 1);
    }, 6000); // rotates every 6 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const nextXp = user.current_level * 1000;

  const xpPercent = Math.min(
    100,
    Math.round((user.xp / nextXp) * 100)
  );

  const greetings = getGreetings(user, stats);
  const currentGreeting = greetings[greetingIdx % greetings.length];

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans">
      {/* Grid bg */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(139,92,246,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-white text-sm font-black">B</span>
            </div>
            <span className="text-white font-bold tracking-tight">
              Brain<span className="text-violet-400">Boost</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-400">
            <span className="text-white font-medium cursor-default">Dashboard</span>
            <span className="hover:text-white transition-colors cursor-pointer">Games</span>
            <span className="hover:text-white transition-colors cursor-pointer">Leaderboard</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
              <span className="text-violet-400 text-xs font-bold">LVL {user.current_level}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm cursor-pointer"
              title={user.name}>
              {AVATARS[avatarIdx]}
            </div>
            <button onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
              title="Logout">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Hero: User Profile ── */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-900/40 via-violet-800/20 to-transparent border border-violet-500/20 p-6 sm:p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-4xl shadow-xl shadow-violet-500/30">
                {AVATARS[avatarIdx]}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-7 h-7 rounded-lg bg-violet-600 border-2 border-[#0a0a0f] text-white text-xs font-black shadow">
                {user.current_level}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-sm font-medium">Welcome back,</p>
              <h1 className="text-3xl font-black text-white mt-0.5">{user.name} 👋</h1>
              <p
                key={greetingIdx}
                className="text-gray-400 text-sm mt-1 min-h-[20px] animate-fadeIn"
              >
                {currentGreeting}
              </p>
              {/* XP bar */}
              <div className="mt-4 max-w-xs">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>{(user.xp || 0).toLocaleString()} XP</span>
                  <span>{nextXp.toLocaleString()} XP to Level {user.current_level + 1}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-1000"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stat pills */}
            <div className="flex sm:flex-col gap-3 shrink-0">
              <div className="rounded-xl bg-white/[0.05] border border-white/10 px-5 py-3 text-center min-w-[100px]">
                <p className="text-2xl font-black text-white">{user.total_score?.toLocaleString()}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Total Score</p>
              </div>
              <div className="rounded-xl bg-white/[0.05] border border-white/10 px-5 py-3 text-center min-w-[100px]">
                <p className="text-2xl font-black text-white">#{stats.globalRank}</p>                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Global Rank</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            {
              label: "Games Played",
              value: stats.gamesPlayed,
              icon: "🎮",
              color: "text-violet-400"
            },
            {
              label: "Highest Score",
              value: stats.highestScore,
              icon: "🔥",
              color: "text-orange-400"
            },
            {
              label: "Avg Score",
              value: stats.avgScore,
              icon: "📊",
              color: "text-cyan-400"
            },
            {
              label: "Level",
              value: user.current_level,
              icon: "🏆",
              color: "text-yellow-400"
            }
          ].map((stat) => (
            <div key={stat.label}
              className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 hover:bg-white/[0.07] transition-colors">
              <span className="text-2xl">{stat.icon}</span>
              <p className={`text-2xl font-black mt-2 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Games Section ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white">Play a Game</h2>
            <span className="text-xs text-gray-500">6 games available</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {GAMES.map((game) => (
              <div key={game.id}
                className={`group rounded-2xl bg-gradient-to-br ${game.gradient} border ${game.border} p-6 flex flex-col gap-4 shadow-xl ${game.glow} hover:scale-[1.02] hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden`}>
                {/* Glow blob */}
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between">
                  <span className="text-4xl">{game.icon}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${game.badgeColor}`}>
                    {game.badge}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">{game.name}</h3>
                  <p className="text-white/60 text-sm mt-1.5 leading-relaxed">{game.desc}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{(gameCounts[game.gameKey] || 0).toLocaleString()} plays</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10">{game.difficulty}</span>
                </div>

                <Link to={game.route}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-sm transition-all duration-200 group-hover:bg-white/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Play Now
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Achievements + Leaderboard Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Achievements */}
          <div className="lg:col-span-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Achievements</h2>
              <span className="text-xs text-violet-400 font-semibold">
                {achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked
              </span>
            </div>
            <div className="space-y-3">
              {achievements.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />
                  ))}
                </div>
              ) : (
                achievements.map((a) => {
                  const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
                  return (
                    <div key={a.id}
                      className={`rounded-xl px-4 py-3 border transition-colors ${a.unlocked
                        ? "bg-violet-500/10 border-violet-500/25 hover:bg-violet-500/15"
                        : "bg-white/[0.02] border-white/[0.05]"
                        }`}>
                      <div className="flex items-center gap-4">
                        <span className={`text-2xl ${!a.unlocked && "opacity-40 grayscale"}`}>{a.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${a.unlocked ? "text-white" : "text-gray-400"}`}>
                            {a.title}
                          </p>
                          <p className="text-gray-500 text-xs truncate">{a.desc}</p>
                        </div>
                        {a.unlocked ? (
                          <span className="text-emerald-400 shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs shrink-0 font-medium tabular-nums">
                            {a.progress}/{a.target}
                          </span>
                        )}
                      </div>
                      {!a.unlocked && (
                        <div className="mt-2.5 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Leaderboard</h2>
              <span className="text-xs text-gray-500 hover:text-violet-400 cursor-pointer transition-colors">View All →</span>
            </div>
            <div className="space-y-2">
              {leaderboard.map((p, index) => (
                <div key={index + 1}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${p.isUser
                    ? "bg-violet-500/15 border-violet-500/30"
                    : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                    }`}>
                  {/* Rank */}
                  <span className={`w-6 text-center font-black text-sm ${index === 0 ? "text-yellow-400" :
                    index === 1 ? "text-gray-300" :
                      index === 2 ? "text-amber-600" :
                        "text-gray-500"
                    }`}>
                    {index === 0 ? "🥇" :
                      index === 1 ? "🥈" :
                        index === 2 ? "🥉" :
                          `#${index + 1}`}
                  </span>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${p.id === currentUserId ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" : "bg-white/10"
                    }`}>
                    {AVATARS[index % AVATARS.length]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${p.id === currentUserId ? "text-violet-300" : "text-white"}`}>
                      {p.name}
                      {p.id === currentUserId && (
                        <span className="text-xs font-normal text-violet-400 ml-1">(you)</span>
                      )}
                    </p>
                  </div>
                  <span className="text-white font-bold text-sm shrink-0">
                    {p.total_score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Footer spacer */}
      <div className="h-12" />
    </div>
  );
}

