# PartyVerse 🎉

**PartyVerse** is a browser-based party game collection for game nights with friends. It brings together secret-role deduction, social bluffing, and Telugu movie Charades in one React application.

**🎮 Play online:** https://partyverse-gules.vercel.app/  
**💻 Repository:** https://github.com/lucy02-zone/PartyVerse

## 🎮 Games

### 🎭 Imposter

A hidden-word deduction game where players privately receive a role and clue, discuss without revealing the secret word, and vote on who they suspect is the Imposter.

**Features**
- Private role and clue reveal
- Timed discussion phase
- Sequential private voting
- Vote results and round recap
- Replay with a new round

### 🕵️ Undercover — Secret Missions

A social bluffing game built around hidden objectives rather than matching secret words. Each player receives a private mission and tries to complete it naturally during the round.

**Features**
- **Private mission reveal:** Pass the device so each player can read their mission privately.
- **Mission variety:** Social, Sneaky, Strategy, and Funny categories.
- **Difficulty levels:** Casual, Standard, and Chaos missions.
- **Timed rounds and events:** Optional timer, public conversation prompts, and private suspicion nominations.
- **Mission check-ins:** Players can submit mission-completion claims; eligible social claims are reviewed during the recap.
- **Accusations and tokens:** Players spend tokens to guess another player's mission, with scoring consequences.
- **Multiple rounds:** Mission assignments refresh between rounds while scores accumulate.
- **Leaderboard and recap:** Review final standings, mission outcomes, and accusations.
- **Configurable setup:** Player list, categories, difficulty, duration, rounds, accusation tokens, and events.

Undercover uses a shared-device flow. Social mission claims rely on player honesty and group review; they are not automatically detected by the browser.

### 🎬 Telugu Movie Charades

A Telugu-film-only Charades game featuring movie prompts, release-era filters, difficulty settings, turn-based scoring, and optional tilt controls.

**Features**
- Telugu movie prompts with release-year and difficulty metadata
- Era filters for 2000–2009, 2010–2019, and 2020–2026
- Correct-answer scoring and Double Points
- Skip, Extra Time, and Free Skip utilities
- Streak tracking and a five-answer milestone
- Optional phone tilt gestures for Correct and Skip
- Manual controls as an alternative to motion sensors

The current deck contains selected titles through 2025; 2026 releases are not yet included. Charades scores are local to the device, and games do not synchronize across devices.

### 🗳️ Mafia

A hidden-role social deduction game with private role reveal and a hand-off into the night-phase flow.

**Features**
- Private role assignment and reveal
- Player-count validation
- Role-specific instructions
- Night-phase transition
- Option to shuffle roles again

## 🛠️ Tech Stack

- **React** — UI and game components
- **Vite** — Development server and production builds
- **React Router** — Navigation between games
- **Lucide React** — Interface icons
- **JavaScript and CSS** — Game logic, styling, and responsive layouts

## 🚀 Run Locally

### Requirements

Install a current version of [Node.js](https://nodejs.org/) and npm.

### Installation

Clone the repository and install the dependencies:

\`\`\`bash
git clone https://github.com/lucy02-zone/PartyVerse.git
cd PartyVerse
npm install
\`\`\`

Start the development server:

\`\`\`bash
npm run dev
\`\`\`

Open the local URL printed by Vite in your browser.

## 📜 Available Scripts

| Command | Description |
|---|---|
| \`npm run dev\` | Start the local development server |
| \`npm test\` | Run the test suite |
| \`npm run build\` | Build the production application |
| \`npm run lint\` | Run lint checks |

## 🕹️ How to Play

1. Open PartyVerse and choose a game.
2. Enter player names and configure the available settings.
3. Follow the game's on-screen instructions.
4. For shared-device games, pass the device only when prompted and hide secret information before handing it to the next player.
5. Review the results and start another round.

## 🔒 Privacy and Limitations

- The games primarily use a shared-device flow; secure, synchronized online multiplayer should not be assumed.
- Secret information remains private only when players follow the hand-off instructions and keep the display out of view of others.
- Undercover's social mission completion depends on self-reported claims and group review.
- Charades movie titles and their metadata are bundled locally and have not been independently audited title by title against filmographic records.
- Tilt and vibration support varies by device and browser. Tilt controls may require HTTPS or localhost and motion-sensor permission.
- Manual Charades controls remain available when motion sensors are unsupported or permission is denied.
- Features not implemented in the current build should not be considered available.

## 🤝 Contributing

Issues and pull requests are welcome. Please describe proposed changes clearly, include relevant tests, and run the available test and build checks before submitting a pull request.

## 📄 License

No license is currently declared in this repository. Until a license is added, the project does not explicitly grant permission to reuse or redistribute its code.
