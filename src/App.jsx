
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import RoomSetup from "./pages/RoomSetup.jsx";
import ImposterGame from "./games/imposter/ImposterGame.jsx";
import MafiaGame from "./games/mafia/MafiaGame.jsx";
import MafiaNight from "./games/mafia/MafiaNight.jsx";
import MafiaDay from "./games/mafia/MafiaDay.jsx";
import UndercoverGame from "./games/undercover/UndercoverGame.jsx";
import QuizGame from "./games/quiz/QuizGame.jsx";
import CharadesGame from "./games/charades/CharadesGame.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<RoomSetup />} />
        <Route path="/play/imposter" element={<ImposterGame />} />
        <Route path="/play/mafia/night" element={<MafiaNight />} />
        <Route path="/play/mafia/day" element={<MafiaDay />} />
        <Route path="/play/mafia" element={<MafiaGame />} />
        <Route path="/play/undercover" element={<UndercoverGame />} />
        <Route path="/play/quiz" element={<QuizGame />} />
        <Route path="/play/charades" element={<CharadesGame />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
