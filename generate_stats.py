"""
generate_stats.py — Build stats.json for Fantasy Draft Showdown

Requirements:
    pip install nfl-data-py pandas

Usage:
    python3 generate_stats.py

Outputs stats.json with historical PPR fantasy points for all NFL players 2000–2025.
"""

import json
import nfl_data_py as nfl
import pandas as pd

# Team → division/conference mapping (current alignments used for all years)
TEAM_INFO = {
    # AFC East
    "BUF": ("AFC", "AFC East"), "MIA": ("AFC", "AFC East"),
    "NE":  ("AFC", "AFC East"), "NYJ": ("AFC", "AFC East"),
    # AFC North
    "BAL": ("AFC", "AFC North"), "CIN": ("AFC", "AFC North"),
    "CLE": ("AFC", "AFC North"), "PIT": ("AFC", "AFC North"),
    # AFC South
    "HOU": ("AFC", "AFC South"), "IND": ("AFC", "AFC South"),
    "JAX": ("AFC", "AFC South"), "TEN": ("AFC", "AFC South"),
    # AFC West
    "DEN": ("AFC", "AFC West"), "KC":  ("AFC", "AFC West"),
    "LV":  ("AFC", "AFC West"), "LAC": ("AFC", "AFC West"),
    # NFC East
    "DAL": ("NFC", "NFC East"), "NYG": ("NFC", "NFC East"),
    "PHI": ("NFC", "NFC East"), "WAS": ("NFC", "NFC East"),
    # NFC North
    "CHI": ("NFC", "NFC North"), "DET": ("NFC", "NFC North"),
    "GB":  ("NFC", "NFC North"), "MIN": ("NFC", "NFC North"),
    # NFC South
    "ATL": ("NFC", "NFC South"), "CAR": ("NFC", "NFC South"),
    "NO":  ("NFC", "NFC South"), "TB":  ("NFC", "NFC South"),
    # NFC West
    "ARI": ("NFC", "NFC West"), "LA":  ("NFC", "NFC West"),
    "SEA": ("NFC", "NFC West"), "SF":  ("NFC", "NFC West"),
}

# Common team name aliases used in historical data
TEAM_ALIASES = {
    "OAK": "LV",
    "SD":  "LAC",
    "STL": "LA",
    "RAM": "LA",
    "GNB": "GB",
    "KAN": "KC",
    "NWE": "NE",
    "TAM": "TB",
    "SFO": "SF",
    "NOR": "NO",
    "JAC": "JAX",
    "CLT": "IND",
    "RAV": "BAL",
    "RAI": "LV",
    "CRD": "ARI",
    "HTX": "HOU",
    "SDG": "LAC",
    "WAS": "WAS",
    "WSH": "WAS",
}

STAT_COLS = [
    "passing_yards", "passing_tds", "interceptions",
    "rushing_yards", "rushing_tds", "rushing_fumbles_lost",
    "receptions", "receiving_yards", "receiving_tds", "receiving_fumbles_lost",
]


def normalize_team(team_abbr: str) -> str:
    if not team_abbr or pd.isna(team_abbr):
        return ""
    team = str(team_abbr).strip().upper()
    return TEAM_ALIASES.get(team, team)


def main():
    years = list(range(2000, 2026))
    print(f"Fetching weekly stats for {years[0]}–{years[-1]}...")
    print("This may take a few minutes on first run (data is cached after).\n")

    # Fetch weekly data in batches (full range can 404)
    frames = []
    batch_size = 5
    for i in range(0, len(years), batch_size):
        batch = years[i:i + batch_size]
        print(f"  Fetching {batch[0]}–{batch[-1]}...")
        try:
            chunk = nfl.import_weekly_data(batch)
            frames.append(chunk)
        except Exception as e:
            print(f"  Warning: batch {batch[0]}–{batch[-1]} failed ({e}), trying individually...")
            for y in batch:
                try:
                    chunk = nfl.import_weekly_data([y])
                    frames.append(chunk)
                except Exception as e2:
                    print(f"    Skipping {y}: {e2}")

    if not frames:
        print("Error: could not fetch any data.")
        return

    df = pd.concat(frames, ignore_index=True)
    print(f"\nRaw weekly rows: {len(df)}")

    # Filter to regular season skill positions
    valid_positions = {"QB", "RB", "WR", "TE"}
    df = df[df["position"].isin(valid_positions)].copy()
    if "season_type" in df.columns:
        df = df[df["season_type"] == "REG"].copy()

    # Fill NaN stat columns with 0
    for col in STAT_COLS:
        if col in df.columns:
            df[col] = df[col].fillna(0)

    # Calculate per-week PPR points for game logs
    df["week_ppr"] = (
        df["receptions"] * 1
        + df["receiving_yards"] * 0.1
        + df["rushing_yards"] * 0.1
        + df["receiving_tds"] * 6
        + df["rushing_tds"] * 6
        + df["passing_yards"] * 0.04
        + df["passing_tds"] * 4
        - df["interceptions"] * 2
        - df.get("rushing_fumbles_lost", 0) * 2
        - df.get("receiving_fumbles_lost", 0) * 2
    ).round(1)

    # Build game logs per player-season
    print("Building game logs...")
    game_logs = {}
    for (pid, season), grp in df.groupby(["player_id", "season"]):
        logs = []
        for _, w in grp.sort_values("week").iterrows():
            log = {"wk": int(w["week"]), "pts": float(w["week_ppr"])}
            pos = w["position"]
            if pos == "QB":
                log["line"] = f"{int(w['passing_yards'])}yd/{int(w['passing_tds'])}td/{int(w['interceptions'])}int"
            elif pos in ("RB", "WR", "TE"):
                parts = []
                rush = int(w["rushing_yards"])
                rtd = int(w["rushing_tds"])
                rec = int(w["receptions"])
                rec_yds = int(w["receiving_yards"])
                rectd = int(w["receiving_tds"])
                if rush > 0 or rtd > 0:
                    parts.append(f"{rush}rush")
                if rec > 0 or rec_yds > 0:
                    parts.append(f"{rec}rec/{rec_yds}yd")
                tds = rtd + rectd
                if tds > 0:
                    parts.append(f"{tds}td")
                log["line"] = "/".join(parts) if parts else "0"
            logs.append(log)
        game_logs[(pid, season)] = logs

    # Aggregate weekly → seasonal
    agg_dict = {col: "sum" for col in STAT_COLS if col in df.columns}
    agg_dict["recent_team"] = "last"
    agg_dict["position"] = "first"
    agg_dict["player_display_name"] = "first"
    agg_dict["week"] = "count"  # games played

    print("Aggregating to seasonal totals...")
    seasonal = df.groupby(["player_id", "season"]).agg(agg_dict).reset_index()
    seasonal.rename(columns={"week": "games"}, inplace=True)

    # Calculate PPR points
    seasonal["ppr_points"] = (
        seasonal["receptions"] * 1
        + seasonal["receiving_yards"] * 0.1
        + seasonal["rushing_yards"] * 0.1
        + seasonal["receiving_tds"] * 6
        + seasonal["rushing_tds"] * 6
        + seasonal["passing_yards"] * 0.04
        + seasonal["passing_tds"] * 4
        - seasonal["interceptions"] * 2
        - seasonal.get("rushing_fumbles_lost", 0) * 2
        - seasonal.get("receiving_fumbles_lost", 0) * 2
    ).round(1)

    # Filter out low-scoring seasons
    seasonal = seasonal[seasonal["ppr_points"] >= 5].copy()
    print(f"Player-seasons after filtering: {len(seasonal)}")

    # Build records
    records = []
    for _, row in seasonal.iterrows():
        team = normalize_team(row["recent_team"])
        conf, div = TEAM_INFO.get(team, ("", ""))
        position = row["position"]

        stats = {}
        if position == "QB":
            stats = {
                "pass_yds": int(row["passing_yards"]),
                "pass_td": int(row["passing_tds"]),
                "interceptions": int(row["interceptions"]),
                "rush_yds": int(row["rushing_yards"]),
                "rush_td": int(row["rushing_tds"]),
            }
        elif position == "RB":
            stats = {
                "rush_yds": int(row["rushing_yards"]),
                "rush_td": int(row["rushing_tds"]),
                "receptions": int(row["receptions"]),
                "rec_yds": int(row["receiving_yards"]),
                "rec_td": int(row["receiving_tds"]),
            }
        elif position == "WR":
            stats = {
                "receptions": int(row["receptions"]),
                "rec_yds": int(row["receiving_yards"]),
                "rec_td": int(row["receiving_tds"]),
                "rush_yds": int(row["rushing_yards"]),
            }
        elif position == "TE":
            stats = {
                "receptions": int(row["receptions"]),
                "rec_yds": int(row["receiving_yards"]),
                "rec_td": int(row["receiving_tds"]),
            }

        logs = game_logs.get((row["player_id"], row["season"]), [])

        records.append({
            "name": row["player_display_name"],
            "year": int(row["season"]),
            "team": team,
            "conference": conf,
            "division": div,
            "position": position,
            "games": int(row["games"]),
            "ppr_points": float(row["ppr_points"]),
            "stats": stats,
            "log": logs,
        })

    records.sort(key=lambda x: x["ppr_points"], reverse=True)

    output_path = "stats.json"
    with open(output_path, "w") as f:
        json.dump(records, f)

    print(f"\nDone! Wrote {len(records)} player-seasons to {output_path}")
    print(f"File size: {len(json.dumps(records)) / 1024 / 1024:.1f} MB")
    print(f"\nTop 10 seasons:")
    for r in records[:10]:
        print(f"  {r['name']} ({r['year']}) — {r['ppr_points']} pts ({r['position']}, {r['team']})")


if __name__ == "__main__":
    main()
