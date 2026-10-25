
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
const RoomSetup = lazy(() => import("./pages/RoomSetup.jsx"));
const ImposterGame = lazy(() => import("./games/imposter/ImposterGame.jsx"));
const MafiaGame = lazy(() => import("./games/mafia/MafiaGame.jsx"));
const MafiaNight = lazy(() => import("./games/mafia/MafiaNight.jsx"));
const MafiaDay = lazy(() => import("./games/mafia/MafiaDay.jsx"));
const OnlineMafia = lazy(() => import("./games/mafia/OnlineMafia.jsx"));
const UndercoverGame = lazy(() => import("./games/undercover/UndercoverGame.jsx"));
const QuizGame = lazy(() => import("./games/quiz/QuizGame.jsx"));
const CharadesGame = lazy(() => import("./games/charades/CharadesGame.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<main className="route-loading" role="status" aria-live="polite">Getting the game ready…</main>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<RoomSetup />} />
        <Route path="/play/imposter" element={<ImposterGame />} />
        <Route path="/play/mafia/night" element={<MafiaNight />} />
        <Route path="/play/mafia/day" element={<MafiaDay />} />
        <Route path="/play/mafia/online" element={<OnlineMafia />} />
        <Route path="/play/mafia" element={<MafiaGame />} />
        <Route path="/play/undercover" element={<UndercoverGame />} />
        <Route path="/play/quiz" element={<QuizGame />} />
        <Route path="/play/charades" element={<CharadesGame />} />
        <Route path="*" element={<Home />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
