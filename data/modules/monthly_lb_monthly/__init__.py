import csv
import json
import os
import random
from datetime import datetime

from loguru import logger


def run():
    """
    Monthly leaderboard processing module.
    Picks 5 random levels and saves their UUIDs to a file.
    """
    module_dir = os.path.dirname(__file__)
    config_path = os.path.join(module_dir, "config.json")
    data_dir = "/storage"
    level_data_path = os.path.join(data_dir, "github_data", "level_data.csv")
    output_dir = os.path.join(data_dir, "monthly_lb_monthly")
    output_path = os.path.join(output_dir, "levels.txt")
    banned_path = os.path.join(output_dir, "banned_levels.txt")

    logger.info("Monthly leaderboard processing started.")

    try:
        with open(config_path, "r") as f:
            config = json.load(f)

        excluded_levels = set(config.get("exclude", []))

        banned_levels = set()
        if os.path.exists(banned_path):
            with open(banned_path, "r") as f:
                for line in f:
                    level_uuid = line.strip()
                    if level_uuid:
                        banned_levels.add(level_uuid)

        if os.path.exists(output_path):
            with open(output_path, "r") as f:
                current_levels = []
                for line in f:
                    level_uuid = line.strip()
                    if level_uuid:
                        current_levels.append(level_uuid)

            if current_levels:
                all_banned = list(banned_levels) + current_levels
                if len(all_banned) > 10:
                    all_banned = all_banned[-10:]

                os.makedirs(output_dir, exist_ok=True)
                with open(banned_path, "w") as f:
                    for level_uuid in all_banned:
                        f.write(level_uuid + "\n")

                banned_levels = set(all_banned)

        excluded_levels = excluded_levels.union(banned_levels)

        levels = []
        with open(level_data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                level_uuid = row.get("level_uuid")
                if level_uuid and level_uuid not in excluded_levels:
                    levels.append(level_uuid)

        if len(levels) < 5:
            logger.error("Need at least 5 levels available after exclusions")
            return

        selected_levels = random.sample(levels, 5)

        os.makedirs(output_dir, exist_ok=True)
        with open(output_path, "w") as f:
            for level_uuid in selected_levels:
                f.write(level_uuid + "\n")

        archive_path = os.path.join(output_dir, "levels_archive.json")
        existing_entries = []
        if os.path.exists(archive_path):
            with open(archive_path, "r") as f:
                existing_entries = json.load(f)

        timestamp = datetime.now().timestamp()

        existing_entries.append({
            "timestamp": timestamp,
            "levels": selected_levels
        })

        with open(archive_path, "w") as f:
            json.dump(existing_entries, f, indent=2)

        logger.success(f"Selected {len(selected_levels)} levels: {selected_levels}")
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing config.json: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")

    logger.info("Monthly leaderboard processing completed.")
