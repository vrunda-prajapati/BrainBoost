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
    stats: "1,240 plays",
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
    stats: "892 plays",
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
    stats: "534 plays",
    difficulty: "Hard",
  },
];

const ACHIEVEMENTS = [
  { icon: "🔥", title: "7-Day Streak", desc: "Login 7 days in a row", unlocked: true },
  { icon: "⚡", title: "Speed Demon", desc: "Complete Memory Match in under 60s", unlocked: true },
  { icon: "🎯", title: "Sharpshooter", desc: "Score 100% on Word Scramble", unlocked: false },
  { icon: "🏅", title: "Top 10", desc: "Reach global top 10", unlocked: false },
];

const LEADERBOARD = [
  { rank: 1, name: "NeuralNinja", score: 98420, level: 42, avatar: "N" },
  { rank: 2, name: "MindMaster", score: 91050, level: 38, avatar: "M" },
  { rank: 3, name: "CortexKing", score: 87300, level: 35, avatar: "C" },
  { rank: 4, name: "BrainWave99", score: 82100, level: 31, avatar: "B" },
  { rank: 5, name: "You", score: 74500, level: 8, avatar: "Y", isUser: true },
];

const AVATARS = ["🐉", "🦊", "🦁", "🐺", "🦅", "🐯"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "Alex", level: 8, score: 74500, xp: 3200, nextXp: 5000 });
  const [avatarIdx] = useState(2);

  useEffect(() => {
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        "http://localhost:3001/api/user/profile",
        {
          headers: {
            Authorization: token,
          },
        }
      );

      setUser({
        name: res.data.name,
        level: res.data.current_level,
        score: res.data.total_score,
        xp: 3200,
        nextXp: 5000,
      });

    } catch (error) {
      console.log(error);
    }
  };

  fetchProfile();
}, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const xpPercent = Math.round((user.xp / user.nextXp) * 100);

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
              <span className="text-violet-400 text-xs font-bold">LVL {user.level}</span>
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
                {user.level}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-gray-400 text-sm font-medium">Welcome back,</p>
              <h1 className="text-3xl font-black text-white mt-0.5">{user.name} 👋</h1>
              <p className="text-gray-400 text-sm mt-1">Keep up the momentum — you're in the <span className="text-violet-400 font-semibold">top 15%</span> this week.</p>

              {/* XP bar */}
              <div className="mt-4 max-w-xs">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>{user.xp.toLocaleString()} XP</span>
                  <span>{user.nextXp.toLocaleString()} XP to Level {user.level + 1}</span>
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
                <p className="text-2xl font-black text-white">{user.score.toLocaleString()}</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Total Score</p>
              </div>
              <div className="rounded-xl bg-white/[0.05] border border-white/10 px-5 py-3 text-center min-w-[100px]">
                <p className="text-2xl font-black text-white">#5</p>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">Global Rank</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Games Played", value: "247", icon: "🎮", color: "text-violet-400" },
            { label: "Best Streak", value: "14 days", icon: "🔥", color: "text-orange-400" },
            { label: "Avg Score", value: "6,840", icon: "📊", color: "text-cyan-400" },
            { label: "Badges Earned", value: "12 / 30", icon: "🏆", color: "text-yellow-400" },
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
            <span className="text-xs text-gray-500">3 games available</span>
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
                  <span>{game.stats}</span>
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
              <span className="text-xs text-violet-400 font-semibold">2 / 4 Unlocked</span>
            </div>
            <div className="space-y-3">
              {ACHIEVEMENTS.map((a) => (
                <div key={a.title}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${
                    a.unlocked
                      ? "bg-violet-500/10 border-violet-500/25 hover:bg-violet-500/15"
                      : "bg-white/[0.02] border-white/[0.05] opacity-50"
                  }`}>
                  <span className="text-2xl">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{a.title}</p>
                    <p className="text-gray-500 text-xs truncate">{a.desc}</p>
                  </div>
                  {a.unlocked ? (
                    <span className="text-emerald-400 shrink-0">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  ) : (
                    <span className="text-gray-600 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Leaderboard</h2>
              <span className="text-xs text-gray-500 hover:text-violet-400 cursor-pointer transition-colors">View All →</span>
            </div>
            <div className="space-y-2">
              {LEADERBOARD.map((p) => (
                <div key={p.rank}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${
                    p.isUser
                      ? "bg-violet-500/15 border-violet-500/30"
                      : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                  }`}>
                  {/* Rank */}
                  <span className={`w-6 text-center font-black text-sm ${
                    p.rank === 1 ? "text-yellow-400" :
                    p.rank === 2 ? "text-gray-300" :
                    p.rank === 3 ? "text-amber-600" : "text-gray-500"
                  }`}>
                    {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : `#${p.rank}`}
                  </span>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    p.isUser ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" : "bg-white/10"
                  }`}>
                    {p.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${p.isUser ? "text-violet-300" : "text-white"}`}>
                      {p.name} {p.isUser && <span className="text-xs font-normal text-violet-400">(you)</span>}
                    </p>
                    <p className="text-gray-500 text-xs">Level {p.level}</p>
                  </div>

                  <span className="text-white font-bold text-sm shrink-0">
                    {p.score.toLocaleString()}
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

