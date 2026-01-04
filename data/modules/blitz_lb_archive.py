import json
import os
from datetime import datetime

import requests
from loguru import logger


def run():
    """
    Fetches Blitz leaderboard data from https://pewpew.live/get_blitz_leaderboard
    and saves it to data/data/blitz_lb_archive/blitz_lb_{month}_{year}.json
    """
    url = "https://pewpew.live/get_blitz_leaderboard"
    data_dir = "/storage"
    archive_dir = os.path.join(data_dir, "blitz_lb_archive")
    
    now = datetime.now()
    filename = f"blitz_lb_{now.month:02d}_{now.year}.json"
    filepath = os.path.join(archive_dir, filename)
    
    logger.info("Fetching Blitz leaderboard data...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        leaderboard_data = response.json()
        
        timestamp = now.timestamp()
        
        os.makedirs(archive_dir, exist_ok=True)
        
        existing_entries = []
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                existing_entries = json.load(f)
        
        existing_entries.append({
            "timestamp": timestamp,
            "data": leaderboard_data
        })
        
        with open(filepath, "w") as f:
            json.dump(existing_entries, f, indent=2)
        
        logger.success(f"Saved Blitz leaderboard data to {filepath}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Blitz leaderboard data: {e}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")
