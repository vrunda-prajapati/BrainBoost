import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MemoryGame from "./pages/MemoryGame";
import WordScramble from "./pages/WordScramble";
import Crossword from "./pages/Crossword";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/game/memory" element={<MemoryGame />} />
        <Route path="/game/word" element={<WordScramble />} />
        <Route path="/game/crossword" element={<Crossword/>}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;