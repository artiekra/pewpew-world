import csv
import json
import math
import os
from collections import defaultdict
from datetime import datetime

from loguru import logger

OFFICIAL_LEVEL_NAMES = {
    "asteroids",
    "waves",
    "eskiv",
    "fury",
    "hexagon",
    "ceasefire",
    "partitioner",
    "symbiosis",
    "pandemonium",
    "oasis",
}


def run():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    score_data_path = os.path.join(data_dir, "github_data", "score_data.csv")
    output_path = os.path.join(data_dir, "speedrun_lb_daily", "leaderboard.csv")

    logger.info("Speedrun daily leaderboard processing started.")

    try:
        # Load Score Data & Determine Max Version per Level
        raw_scores = []
        level_max_versions = defaultdict(int)

        with open(score_data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("value_type") != "1":
                    continue

                ver = int(row.get("level_version", 0))
                lvl_uuid = row["level_uuid"]
                if ver > level_max_versions[lvl_uuid]:
                    level_max_versions[lvl_uuid] = ver

                raw_scores.append(row)

        # Filter Scores by Version
        valid_scores = []
        for row in raw_scores:
            lvl_uuid = row["level_uuid"]
            ver = int(row.get("level_version", 0))

            if ver >= level_max_versions[lvl_uuid]:
                valid_scores.append(row)

        # Group by level
        level_scores_map = defaultdict(list)
        for s in valid_scores:
            level_scores_map[s["level_uuid"]].append(s)

        # Player aggregate scores
        # Structure: player_uuid -> { "country": ..., "1p_official": 0, "2p_official": 0, "1p_community": 0, "2p_community": 0 }
        player_data = {}

        def get_player_entry(pid, country):
            if pid not in player_data:
                player_data[pid] = {
                    "country": country,
                    "score_1p_official": 0.0,
                    "score_2p_official": 0.0,
                    "score_1p_community": 0.0,
                    "score_2p_community": 0.0,
                }
            return player_data[pid]

        for level_uuid, scores in level_scores_map.items():
            is_official = level_uuid in OFFICIAL_LEVEL_NAMES

            # Sort: Higher Value is Better (because negative time), then Oldest Date
            scores.sort(key=lambda x: (-float(x["value"]), int(x["date"])))

            level_participants = set()
            for s in scores:
                aids = s["account_ids"].split("|")
                for aid in aids:
                    level_participants.add(aid)

            N = len(level_participants)
            if N == 0:
                continue

            N_pow = math.pow(N, 1 / 6)

            seen_1p = set()
            seen_2p = set()

            for rank_idx, score_entry in enumerate(scores):
                rank = rank_idx + 1

                # Formula: P = ((N ^ (1/6)) * 100) / sqrt(R)
                points = (N_pow * 100) / math.sqrt(rank)

                account_ids = score_entry["account_ids"].split("|")
                is_2p = len(account_ids) > 1

                # Determine score key
                if is_official:
                    key = "score_2p_official" if is_2p else "score_1p_official"
                else:
                    key = "score_2p_community" if is_2p else "score_1p_community"

                country = score_entry.get("country", "")

                for aid in account_ids:
                    if aid == "0":
                        continue

                    if is_2p:
                        if aid in seen_2p:
                            continue
                        seen_2p.add(aid)
                    else:
                        if aid in seen_1p:
                            continue
                        seen_1p.add(aid)

                    # Add points
                    entry = get_player_entry(aid, country)
                    entry[key] += points

        # Format Output
        final_leaderboard = []
        for pid, data in player_data.items():
            final_leaderboard.append(
                {
                    "player_uuid": pid,
                    "country": data["country"],
                    "score_1p_official": round(data["score_1p_official"], 2),
                    "score_2p_official": round(data["score_2p_official"], 2),
                    "score_1p_community": round(data["score_1p_community"], 2),
                    "score_2p_community": round(data["score_2p_community"], 2),
                }
            )

        final_leaderboard.sort(
            key=lambda x: -(
                x["score_1p_official"]
                + x["score_2p_official"]
                + x["score_1p_community"]
                + x["score_2p_community"]
            )
        )

        # Write to CSV
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = [
                "player_uuid",
                "country",
                "score_1p_official",
                "score_2p_official",
                "score_1p_community",
                "score_2p_community",
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(final_leaderboard)

        # Archive (Monthly Grid)
        now = datetime.now()
        archive_dir = os.path.join(os.path.dirname(output_path), "archive")
        archive_path = os.path.join(
            archive_dir, f"speedrun_lb_daily_{now.month:02d}_{now.year}.json"
        )
        timestamp = now.timestamp()

        os.makedirs(archive_dir, exist_ok=True)

        existing_entries = []
        if os.path.exists(archive_path):
            with open(archive_path, "r") as f:
                try:
                    existing_entries = json.load(f)
                except json.JSONDecodeError:
                    existing_entries = []

        existing_entries.append({"timestamp": timestamp, "data": final_leaderboard})

        with open(archive_path, "w") as f:
            json.dump(existing_entries, f, indent=2)

        logger.success(f"Processed {len(final_leaderboard)} players")

    except Exception as e:
        logger.error(f"Error: {e}")
        raise e

    logger.info("Speedrun daily leaderboard processing completed.")


if __name__ == "__main__":
    run()
