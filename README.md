# PartyVerse

PartyVerse is a local, browser-based collection of party games built with React, Vite, and React Router.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Create a room, add 3–16 players, choose Telugu movie era and difficulty filters, then start Charades. Build the production app with `npm run build`; run tests with `npm test`; run lint with `npm run lint`.

## Telugu Movie Charades

The Charades deck is limited to Telugu movie titles and has release-year and difficulty metadata. Setup filters cover 2000–2009, 2010–2019, and 2020–2026 (the local deck currently contains selected titles through 2025). Correct earns one point, or two when Double Points is used. Skip earns no points. Correct and Skip deal another title to the same actor; only End Turn or timer expiry advances to the next actor. The first team/player to reach configured points is not currently enabled; the match ends after the configured rounds.

Each side has one Double Points, one Extra Time (+15 seconds), and one Free Skip per match. The shared team inventory resets on Play Again. Streaks count consecutive correct answers and reset on a skip or turn end. A five-answer milestone is recorded in match state. Live and final scores are local to the device.

### Tilt controls

On a supported phone, reveal the movie and press **Enable tilt** during an active turn. Browsers that require sensor permission will prompt after the button press. Hold the phone in a comfortable neutral position until calibrated, then tilt up to mark correct and down to skip. Return near neutral before the next sensor action. Visible Correct and Skip buttons remain available at all times. If permission is denied or motion events are unavailable, use manual controls. Vibration can be disabled in the active turn controls.

Device orientation support and permission behavior vary by browser and device; HTTPS or localhost is commonly required for sensor access. The game does not synchronize across devices, and the title is private only on the acting device. The timer pauses when the game is paused; if the browser tab is hidden, the timer continues.

## Known limitations

The deck is bundled locally and contains more than 150 unique movie titles. Release-year and difficulty metadata are lightweight gameplay classifications; the full deck has not been independently audited title by title against filmographic records. The 2020–2026 filter currently has selected entries through 2025; 2026 releases are not included. Audience voting, online room synchronization, best-of-three/sudden-death modes, and acting modifiers require additional implementation and are not represented as working features. Browser vibration is optional and unsupported devices silently use visual feedback.
