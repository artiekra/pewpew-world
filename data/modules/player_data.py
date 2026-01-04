import json
import os
from datetime import datetime

from loguru import logger


def run():
    """Track player data changes from XP and Blitz leaderboard archives."""
    data_dir = "/storage"

    output_dir = os.path.join(data_dir, "player_data")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, "player_changes.json")

    player_changes = {}
    if os.path.exists(output_file):
        with open(output_file, "r") as f:
            player_changes = json.load(f)

    last_xp_timestamp = player_changes.get("_metadata", {}).get("last_xp_processed", 0)
    last_blitz_timestamp = player_changes.get("_metadata", {}).get(
        "last_blitz_processed", 0
    )

    xp_archive_dir = os.path.join(data_dir, "xp_lb_archive")
    if os.path.exists(xp_archive_dir):
        for filename in sorted(os.listdir(xp_archive_dir)):
            if filename.startswith("xp_lb_") and filename.endswith(".json"):
                filepath = os.path.join(xp_archive_dir, filename)
                last_xp_timestamp = process_xp_archive(
                    filepath, player_changes, last_xp_timestamp
                )

    blitz_archive_dir = os.path.join(data_dir, "blitz_lb_archive")
    if os.path.exists(blitz_archive_dir):
        for filename in sorted(os.listdir(blitz_archive_dir)):
            if filename.startswith("blitz_lb_") and filename.endswith(".json"):
                filepath = os.path.join(blitz_archive_dir, filename)
                last_blitz_timestamp = process_blitz_archive(
                    filepath, player_changes, last_blitz_timestamp
                )

    if "_metadata" not in player_changes:
        player_changes["_metadata"] = {}
    player_changes["_metadata"]["last_xp_processed"] = last_xp_timestamp
    player_changes["_metadata"]["last_blitz_processed"] = last_blitz_timestamp
    player_changes["_metadata"]["last_updated"] = datetime.now().isoformat()

    with open(output_file, "w") as f:
        json.dump(player_changes, f, indent=2)

    logger.success(
        f"Player data tracking completed. Processed XP up to {last_xp_timestamp}, Blitz up to {last_blitz_timestamp}"
    )


def process_xp_archive(filepath, player_changes, last_processed):
    try:
        with open(filepath, "r") as f:
            entries = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        logger.error(f"Failed to read XP archive {filepath}: {e}")
        return last_processed

    for entry in entries:
        timestamp = entry.get("timestamp", 0)
        if timestamp <= last_processed:
            continue

        data = entry.get("data", [])
        for player in data:
            acc = player.get("acc")
            if not acc:
                continue

            if acc not in player_changes:
                player_changes[acc] = {
                    "usernames": [],
                    "xp_changes": [],
                    "blitz_changes": [],
                }

            name = player.get("name", "")
            usernames = player_changes[acc]["usernames"]
            if not usernames or usernames[-1]["name"] != name:
                usernames.append({"timestamp": timestamp, "name": name})

            xp = player.get("xp", 0)
            xp_changes = player_changes[acc]["xp_changes"]
            if not xp_changes or xp_changes[-1]["xp"] != xp:
                xp_changes.append({"timestamp": timestamp, "xp": xp})

        if timestamp > last_processed:
            last_processed = timestamp

    return last_processed


def process_blitz_archive(filepath, player_changes, last_processed):
    try:
        with open(filepath, "r") as f:
            entries = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        logger.error(f"Failed to read Blitz archive {filepath}: {e}")
        return last_processed

    for entry in entries:
        timestamp = entry.get("timestamp", 0)
        if timestamp <= last_processed:
            continue

        data = entry.get("data", [])
        for player in data:
            acc = player.get("acc")
            if not acc:
                continue

            if acc not in player_changes:
                player_changes[acc] = {
                    "usernames": [],
                    "xp_changes": [],
                    "blitz_changes": [],
                }

            name = player.get("name", "")
            usernames = player_changes[acc]["usernames"]
            if not usernames or usernames[-1]["name"] != name:
                usernames.append({"timestamp": timestamp, "name": name})

            bsr = player.get("bsr", 0)
            blitz_changes = player_changes[acc]["blitz_changes"]
            if not blitz_changes or blitz_changes[-1]["bsr"] != bsr:
                blitz_changes.append({"timestamp": timestamp, "bsr": bsr})

        if timestamp > last_processed:
            last_processed = timestamp

    return last_processed


if __name__ == "__main__":
    run()
