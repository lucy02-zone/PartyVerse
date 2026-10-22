
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import RoomSetup from "./pages/RoomSetup.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<RoomSetup />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
