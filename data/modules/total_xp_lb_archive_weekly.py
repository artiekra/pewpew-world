import json
import os
import time
from datetime import datetime

import requests
from dotenv import load_dotenv
from loguru import logger

load_dotenv()


def fetch_leaderboard() -> list:
    """Fetches the base XP leaderboard to get the list of active players."""
    url = "https://pewpew.live/get_xp_leaderboard"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch initial leaderboard: {e}")
        return []


def get_total_xp(account_id: str) -> int | None:
    """Fetches the profile JSON for a specific account ID to get Total XP."""
    url = "https://pewpew.live/profile_json"

    # using tuples (None, value) creates a multipart/form-data payload
    # without actual file content, matching the required format.
    payload = {
        "account_id": (None, account_id),
        "ppl_name": (None, "PewPew Live"),
        "ppl_version": (None, "0.9.232"),
    }

    try:
        response = requests.post(url, files=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("XP")
    except Exception as e:
        logger.error(f"Failed to fetch profile for {account_id}: {e}")
        return None


def init_storage(filepath: str, timestamp: float) -> int:
    """
    Ensures the JSON structure exists and creates a new entry for this run.
    Returns the index of the new entry in the list.
    """
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
    else:
        data = []

    new_entry = {"timestamp": timestamp, "data": []}
    data.append(new_entry)

    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

    return len(data) - 1


def save_player_data(filepath: str, entry_index: int, player_data: dict) -> None:
    """Reads the file, appends the player data to the specific entry, and rewrites."""
    try:
        with open(filepath, "r") as f:
            all_entries = json.load(f)

        # append to the 'data' list of the specific entry
        all_entries[entry_index]["data"].append(player_data)

        with open(filepath, "w") as f:
            json.dump(all_entries, f, indent=2)

    except Exception as e:
        logger.error(f"Failed to save incremental data: {e}")


def run():
    """
    Fetches Total XP for all players on the current leaderboard.
    Saves incrementally to {STORAGE_PATH}/total_xp_lb_archive_weekly/total_xp_lb_{month}_{year}.json
    """
    data_dir = os.getenv("STORAGE_PATH", "/storage")
    archive_dir = os.path.join(data_dir, "total_xp_lb_archive_weekly")
    os.makedirs(archive_dir, exist_ok=True)

    now = datetime.now()
    filename = f"total_xp_lb_{now.month:02d}_{now.year}.json"
    filepath = os.path.join(archive_dir, filename)

    logger.info("Starting Total XP archive job...")

    # 1. get list of players
    leaderboard = fetch_leaderboard()
    if not leaderboard:
        logger.error("No leaderboard data found. Aborting.")
        return

    # 2. initialize the file structure for this run
    current_entry_index = init_storage(filepath, now.timestamp())
    total_players = len(leaderboard)

    # 3. iterate and save incrementally
    for index, player in enumerate(leaderboard):
        account_id = player.get("acc")
        username = player.get("name", "Unknown")

        if not account_id:
            continue

        # wait 2 minutes between requests
        # placed at the start so we don't wait after the very last person
        if index > 0:
            logger.info(f"Sleeping for 2 minutes... ({index}/{total_players} done)")
            time.sleep(120)

        logger.info(f"Fetching Total XP for {username}...")
        xp_value = get_total_xp(account_id)

        if xp_value is not None:
            player_record = {
                "account_id": account_id,
                "username": username,
                "total_xp": xp_value,
            }
            save_player_data(filepath, current_entry_index, player_record)
        else:
            logger.warning(f"Could not retrieve XP for {username}")

    logger.success(f"Finished archiving Total XP for {total_players} players.")
