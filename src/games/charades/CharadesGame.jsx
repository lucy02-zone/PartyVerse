import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Trophy,
  Users,
} from "lucide-react";
import {
  buildCharadesGame,
  buildScoreboard,
  getTurnDetails,
  getWinningTeams,
} from "./logic.js";
import { getPromptDeck } from "./prompts.js";

export default function CharadesGame() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialConfig = location.state || {};
  const [game, setGame] = useState(() => {
    try {
      return buildCharadesGame({
        players: initialConfig.players || [],
        category: initialConfig.category || "Mixed",
        roundCount: initialConfig.roundCount || 3,
        turnDuration: initialConfig.turnDuration || 60,
        teamMode: initialConfig.teamMode || "individual",
        teamCount: initialConfig.teamCount || 2,
      });
    } catch {
      return null;
    }
  });

  const [teamScores, setTeamScores] = useState(() =>
    game ? buildScoreboard(game.teams) : []
  );
  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState("preparation");
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [privatePromptVisible, setPrivatePromptVisible] = useState(false);
  const [turnResolved, setTurnResolved] = useState(false);
  const [promptDeck, setPromptDeck] = useState(() =>
    game ? [...game.deck] : []
  );
  const [usedPrompts, setUsedPrompts] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState(null);

  const totalTurns = useMemo(() => {
    if (!game || !game.teams?.length) return 0;
    return game.teams.length * game.roundCount;
  }, [game]);

  const currentTurn = useMemo(() => {
    if (!game) return null;
    return getTurnDetails(game, turnIndex);
  }, [game, turnIndex]);

  useEffect(() => {
    if (!game) {
      return undefined;
    }

    if (!currentPrompt && phase === "preparation") {
      prepareNextTurn(turnIndex);
    }

    return undefined;
  }, [game, currentPrompt, phase, turnIndex]);

  useEffect(() => {
    // Do not start the acting clock until the player presses "Start acting".
    if (!game || !currentPrompt || phase !== "acting" || isPaused || turnResolved) {
      return undefined;
    }

    if (timeLeft <= 0) {
      endTurn("timeout");
      return undefined;
    }

    const timerId = setTimeout(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [game, phase, isPaused, timeLeft, currentPrompt, turnResolved]);
