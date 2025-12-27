import csv
import os

from loguru import logger


def run():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    score_data_path = os.path.join(data_dir, "github_data", "score_data.csv")
    levels_path = os.path.join(data_dir, "monthly_leaderboard_monthly", "levels.txt")
    output_path = os.path.join(data_dir, "monthly_leaderboard_daily", "leaderboard.csv")

    logger.info("Daily leaderboard processing started.")

    try:
        with open(levels_path, "r") as f:
            selected_levels = []
            for line in f:
                level_uuid = line.strip()
                if level_uuid:
                    selected_levels.append(level_uuid)

        score_data = []
        with open(score_data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["level_uuid"] in selected_levels:
                    score_data.append(row)

        level_leaderboards = {}
        for level_uuid in selected_levels:
            level_scores = [s for s in score_data if s["level_uuid"] == level_uuid]
            level_scores.sort(key=lambda x: (-int(x["value"]), int(x["date"])))
            top_25 = level_scores[:25]
            level_leaderboards[level_uuid] = top_25

        position_scores = {}
        for i in range(1, 5):
            position_scores[i] = 2500 - (i - 1) * 250
        for i in range(5, 11):
            position_scores[i] = 1625 - (i - 5) * 125
        for i in range(11, 26):
            position_scores[i] = 950 - (i - 11) * 50

        player_scores = {}
        player_data = {}

        for level_uuid, top_25 in level_leaderboards.items():
            for position, score_entry in enumerate(top_25, start=1):
                account_id = score_entry["account_ids"]
                score = position_scores[position]

                if account_id not in player_scores:
                    player_scores[account_id] = 0
                    player_data[account_id] = {
                        "country": score_entry["country"],
                        "wrs": 0,
                        "places": [],
                    }

                player_scores[account_id] += score
                player_data[account_id]["places"].append(position)

                if position == 1:
                    player_data[account_id]["wrs"] += 1

        final_leaderboard = []
        for account_id in player_scores:
            player_info = player_data[account_id]
            avg_place = sum(player_info["places"]) / len(player_info["places"])
            final_leaderboard.append(
                {
                    "player_uuid": account_id,
                    "country": player_info["country"],
                    "score": player_scores[account_id],
                    "wrs": player_info["wrs"],
                    "average_place": round(avg_place, 4),
                }
            )

        final_leaderboard.sort(key=lambda x: -x["score"])

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", newline="") as f:
            fieldnames = ["player_uuid", "country", "score", "wrs", "average_place"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(final_leaderboard)

        logger.success(f"Processed {len(final_leaderboard)} players")
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")

    logger.info("Daily leaderboard processing completed.")
