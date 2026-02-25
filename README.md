# All-Time Fantasy Draft

A pass-the-phone party game where 2-14 players take turns drafting historical NFL fantasy teams in a snake draft. Pick a real player, guess their best season year, and score points based on their actual PPR stats. Wrong year? Zero points.

## How to Play

1. Add players and choose a pool (All NFL, conference, or division)
2. Set draft order (random or custom)
3. Each pick: tap a roster slot, search for an NFL player, then guess a season year (2000-2024)
4. Points are based on that player's real PPR fantasy stats that year — but you don't see the score until after you lock in
5. After each round, a leaderboard shows standings
6. Most total PPR points wins. Ties go to sudden death.

## PPR Scoring

- **Passing:** 1pt per 25 pass yds, 4pt per pass TD, -2pt per INT
- **Rushing:** 1pt per 10 rush yds, 6pt per rush TD
- **Receiving:** 1pt per reception, 1pt per 10 rec yds, 6pt per rec TD

## Setup

### 1. Install dependencies

```bash
pip install nfl-data-py pandas
```

### 2. Generate stats data

```bash
python3 generate_stats.py
```

This fetches real NFL weekly data (2000-2024) and builds `stats.json` (~7.6 MB, ~11,000 player-seasons). Data is cached after the first run.

### 3. Run the game

```bash
python3 serve.py
```

Opens http://localhost:8000 in your browser.

### 4. Stop the server

Press `Ctrl+C` in the terminal, or kill the process on port 8000:

```bash
kill $(lsof -ti:8000)
```

## Project Structure

```
fantasy-draft-game/
├── index.html              HTML shell
├── css/
│   └── styles.css          All styles
├── js/
│   ├── app.js              Entry point, data loading, event delegation
│   ├── state.js            Game state, constants, roster helpers
│   ├── utils.js            Shared utilities (escaping, screen switching)
│   ├── setup.js            Setup screen, draft order, game reset
│   ├── draft.js            Draft screen, player search, year selection
│   ├── reveal.js           Pick reveal screen
│   └── leaderboard.js      Round and final leaderboards, tiebreaker
├── stats.json              Generated player data
├── generate_stats.py       Data generation script
└── serve.py                Local dev server
```

## Game Modes

- **Flex Position** — Adds an extra slot that can be RB, WR, or TE
- **Hard Mode** — Search shows all NFL players regardless of pool, but only players from your selected pool score points
- **Custom Draft Order** — Set your own pick order instead of random
