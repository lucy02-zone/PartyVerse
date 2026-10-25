
import { useState } from "react";
import { Gamepad2, House, Menu, Users, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="navbar">
      <Link to="/" className="brand" onClick={closeMenu}>
        <span className="brand-icon">
          <Gamepad2 size={24} />
        </span>
        <span>PartyVerse</span>
      </Link>

      <nav id="partyverse-navigation" className={`nav-links${menuOpen ? " is-open" : ""}`} aria-label="Main navigation">
        <NavLink to="/" end onClick={closeMenu}><House size={17} />Home</NavLink>
        <Link to="/#games" onClick={closeMenu}><Gamepad2 size={17} />Games</Link>
        <Link to="/#how-it-works" onClick={closeMenu}><Users size={17} />How it works</Link>
      </nav>

      <Link className="nav-cta" to="/#games" onClick={closeMenu}>Play now <span aria-hidden="true">→</span></Link>
      <button className="nav-menu-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="partyverse-navigation" onClick={() => setMenuOpen((open) => !open)}>
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
    </header>
  );
}
