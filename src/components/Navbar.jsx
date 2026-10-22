
import { Gamepad2, House, Users } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-icon">
          <Gamepad2 size={24} />
        </span>
        <span>PartyVerse</span>
      </Link>

      <nav className="nav-links">
        <NavLink to="/" end>
          <House size={17} />
          Home
        </NavLink>
        <a href="#games">
          <Gamepad2 size={17} />
          Games
        </a>
        <a href="#about">
          <Users size={17} />
          About
        </a>
      </nav>

      <a className="nav-cta" href="#games">
        Play now <span>→</span>
      </a>
    </header>
  );
}
