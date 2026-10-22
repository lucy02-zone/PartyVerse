
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";

function ComingSoon() {
  return (
    <main className="coming-soon">
      <span className="coming-emoji">🎮</span>
      <h1>Game setup is coming soon!</h1>
      <p>We're getting this game ready for your next party.</p>
      <Link to="/" className="primary-button">
        Back to home
      </Link>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<ComingSoon />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
