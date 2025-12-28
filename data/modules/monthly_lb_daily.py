import csv
import json
import os
from collections import defaultdict
from datetime import datetime

from loguru import logger


def run():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    score_data_path = os.path.join(data_dir, "github_data", "score_data.csv")
    levels_path = os.path.join(data_dir, "monthly_leaderboard_monthly", "levels.txt")
    output_path = os.path.join(data_dir, "monthly_leaderboard_daily", "leaderboard.csv")

    logger.info("Daily leaderboard processing started.")

    try:
        # Load the list of relevant Level UUIDs
        with open(levels_path, "r") as f:
            selected_levels = set()  # Use set for O(1) lookup
            for line in f:
                level_uuid = line.strip()
                if level_uuid:
                    selected_levels.add(level_uuid)

        # Load Score Data & Determine Max Version per Level
        raw_scores = []
        level_max_versions = defaultdict(int)

        with open(score_data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Only process if it's a selected level
                if row["level_uuid"] in selected_levels:

                    # Only allow Standard Mode (Type 0)
                    if int(row.get("type", 0)) != 0:
                        continue

                    # Track max version logic
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

        # Create Level Leaderboards
        level_leaderboards = {}
        for level_uuid in selected_levels:
            # Get scores for this level
            level_specific_scores = [
                s for s in valid_scores if s["level_uuid"] == level_uuid
            ]

            # Sort: High Score first, then Oldest Date wins ties
            level_specific_scores.sort(key=lambda x: (-int(x["value"]), int(x["date"])))

            # Take top 25
            level_leaderboards[level_uuid] = level_specific_scores[:25]

        # Calculate Points
        position_scores = {}
        for rank in range(1, 26):
            idx = rank - 1

            if rank <= 3:
                position_scores[rank] = 2500 - idx * 250
            elif rank <= 10:
                position_scores[rank] = 2125 - idx * 125
            else:
                position_scores[rank] = 1450 - idx * 50

        player_scores = defaultdict(int)
        player_data = {}

        for level_uuid, top_25 in level_leaderboards.items():
            for position, score_entry in enumerate(top_25, start=1):
                account_id = score_entry["account_ids"]
                points = position_scores[position]

                player_scores[account_id] += points

                if account_id not in player_data:
                    player_data[account_id] = {
                        "country": score_entry["country"],
                        "wrs": 0,
                        "places": [],
                    }

                player_data[account_id]["places"].append(position)
                if position == 1:
                    player_data[account_id]["wrs"] += 1

        # Format Output
        final_leaderboard = []
        for account_id, total_score in player_scores.items():
            info = player_data[account_id]
            avg_place = sum(info["places"]) / len(info["places"])

            final_leaderboard.append(
                {
                    "player_uuid": account_id,
                    "country": info["country"],
                    "score": total_score,
                    "wrs": info["wrs"],
                    "average_place": round(avg_place, 4),
                }
            )

        final_leaderboard.sort(key=lambda x: -x["score"])

        # Write to CSV
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = ["player_uuid", "country", "score", "wrs", "average_place"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(final_leaderboard)

        # Archive to monthly file with timestamp (JSON format like quests/xp archives)
        now = datetime.now()
        archive_dir = os.path.join(os.path.dirname(output_path), "archive")
        archive_path = os.path.join(
            archive_dir, f"monthly_lb_{now.month}_{now.year}.json"
        )
        timestamp = now.timestamp()

        os.makedirs(archive_dir, exist_ok=True)

        existing_entries = []
        if os.path.exists(archive_path):
            with open(archive_path, "r") as f:
                existing_entries = json.load(f)

        existing_entries.append({
            "timestamp": timestamp,
            "data": final_leaderboard
        })

        with open(archive_path, "w") as f:
            json.dump(existing_entries, f, indent=2)

        logger.success(f"Processed {len(final_leaderboard)} players")

    except Exception as e:
        logger.error(f"Error: {e}")
        raise e

    logger.info("Daily leaderboard processing completed.")


if __name__ == "__main__":
    run()
