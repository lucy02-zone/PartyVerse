
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import RoomSetup from "./pages/RoomSetup.jsx";
import ImposterGame from "./games/imposter/ImposterGame.jsx";
import MafiaGame from "./games/mafia/MafiaGame.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<RoomSetup />} />
        <Route path="/play/imposter" element={<ImposterGame />} />
        <Route path="/play/mafia" element={<MafiaGame />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
