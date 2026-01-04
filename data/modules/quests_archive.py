import json
import os
from datetime import datetime

import requests
from loguru import logger


def run():
    """
    Fetches daily quests data from https://pewpew.live/get_daily_quests
    and saves it to data/data/quests_archive/quests_{month}_{year}.json
    """
    url = "https://pewpew.live/get_daily_quests"
    data_dir = "/storage"
    archive_dir = os.path.join(data_dir, "quests_archive")
    
    now = datetime.now()
    filename = f"quests_{now.month:02d}_{now.year}.json"
    filepath = os.path.join(archive_dir, filename)
    
    logger.info("Fetching daily quests data...")
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        quests_data = response.json()
        
        timestamp = now.timestamp()
        
        os.makedirs(archive_dir, exist_ok=True)
        
        existing_entries = []
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                existing_entries = json.load(f)
        
        existing_entries.append({
            "timestamp": timestamp,
            "data": quests_data
        })
        
        with open(filepath, "w") as f:
            json.dump(existing_entries, f, indent=2)
        
        logger.success(f"Saved quests data to {filepath}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch quests data: {e}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}")
    except Exception as e:
        logger.error(f"Error: {e}")
