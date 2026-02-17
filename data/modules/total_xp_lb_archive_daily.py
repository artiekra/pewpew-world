import json
import os
import time
from datetime import datetime

import requests
from dotenv import load_dotenv
from loguru import logger

load_dotenv()


def get_top_20_from_weekly() -> list:
    """
    Scans the weekly archive folder for the latest file,
    reads the most recent data entry, sorts by Total XP,
    and returns the top 20 players.
    """
    data_dir = os.getenv("STORAGE_PATH", "/storage")
    weekly_dir = os.path.join(data_dir, "total_xp_lb_archive_weekly")

    if not os.path.exists(weekly_dir):
        logger.error(f"Weekly archive directory not found at {weekly_dir}")
        return []

    # 1. Find the latest file based on MM_YYYY filename
    files = []
    for f in os.listdir(weekly_dir):
        if f.startswith("total_xp_lb_") and f.endswith(".json"):
            try:
                # Filename format: total_xp_lb_MM_YYYY.json
                parts = f.replace("total_xp_lb_", "").replace(".json", "").split("_")
                if len(parts) == 2:
                    month, year = int(parts[0]), int(parts[1])
                    files.append(((year, month), os.path.join(weekly_dir, f)))
            except ValueError:
                continue

    if not files:
        logger.error("No weekly archive files found.")
        return []

    # Sort by (Year, Month) descending to get the newest file
    files.sort(key=lambda x: x[0], reverse=True)
    latest_filepath = files[0][1]
    logger.info(f"Loading reference data from: {latest_filepath}")

    # 2. Read file and extract top 20
    try:
        with open(latest_filepath, "r") as f:
            data = json.load(f)

        if not data:
            logger.warning("Weekly file is empty.")
            return []

        # Get the last entry (the most recent weekly run)
        latest_entry = data[-1]
        players = latest_entry.get("data", [])

        return players[:20]

    except Exception as e:
        logger.error(f"Failed to parse weekly archive: {e}")
        return []


def get_total_xp(account_id: str) -> int | None:
    """Fetches the profile JSON for a specific account ID to get Total XP."""
    url = "https://pewpew.live/profile_json"

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
    Fetches Total XP for the TOP 20 players (based on previous weekly data).
    Saves incrementally to {STORAGE_PATH}/total_xp_lb_archive_daily/total_xp_lb_{month}_{year}.json
    """
    data_dir = os.getenv("STORAGE_PATH", "/storage")
    archive_dir = os.path.join(data_dir, "total_xp_lb_archive_daily")
    os.makedirs(archive_dir, exist_ok=True)

    now = datetime.now()
    filename = f"total_xp_lb_{now.month:02d}_{now.year}.json"
    filepath = os.path.join(archive_dir, filename)

    logger.info("Starting Daily Top 20 Total XP archive job...")

    # 1. Get Top 20 players from the latest WEEKLY archive
    target_players = get_top_20_from_weekly()

    if not target_players:
        logger.error("Could not determine Top 20 players. Aborting.")
        return

    logger.info(f"Targeting Top {len(target_players)} players from weekly records.")

    # 2. initialize the file structure for this run
    current_entry_index = init_storage(filepath, now.timestamp())
    total_targets = len(target_players)

    # 3. iterate and save incrementally
    for index, player in enumerate(target_players):
        # Retrieve ID/Name from the saved record
        account_id = player.get("account_id")
        username = player.get("username", "Unknown")

        if not account_id:
            continue

        # Wait 2 minutes between requests to be safe
        if index > 0:
            logger.info(f"Sleeping for 2 minutes... ({index}/{total_targets} done)")
            time.sleep(120)

        logger.info(f"Fetching fresh Total XP for {username}...")
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

    logger.success(f"Finished daily archive for Top {total_targets} players.")


if __name__ == "__main__":
    run()
