import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MemoryGame from "./pages/MemoryGame";
import WordScramble from "./pages/WordScramble";
import Crossword from "./pages/Crossword";
import SudokuGame from "./pages/SudokuGame";
import NumberPuzzleGame from "./pages/NumberPuzzleGame";
import PatternMemoryGame from "./pages/PatternMemoryGame";

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
        <Route path="/game/sudoku" element={<SudokuGame />}></Route>
        <Route path="/game/number-puzzle" element={<NumberPuzzleGame />}></Route>
        <Route path="/game/pattern" element={<PatternMemoryGame />}></Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;