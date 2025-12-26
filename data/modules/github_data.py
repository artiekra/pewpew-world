def run():
    """
    Fetches data from https://github.com/pewpewlive/ppl-data repository
    and stores CSV files in data/github_data/ along with metadata.json
    """
    import json
    import os
    from datetime import datetime

    import requests
    from loguru import logger

    base_url = "https://raw.githubusercontent.com/pewpewlive/ppl-data/master/"
    files = ["account_data.csv", "level_data.csv", "score_data.csv"]

    data_dir = os.path.dirname(os.path.dirname(__file__))
    github_data_dir = os.path.join(data_dir, "data", "github_data")
    os.makedirs(github_data_dir, exist_ok=True)

    timestamp = datetime.now().timestamp()

    for filename in files:
        url = base_url + filename
        filepath = os.path.join(github_data_dir, filename)

        response = requests.get(url)
        response.raise_for_status()

        with open(filepath, "wb") as f:
            f.write(response.content)
        logger.info(f"Downloaded {filename}")

    metadata = {"timestamp": timestamp}

    metadata_path = os.path.join(github_data_dir, "metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    logger.success("GitHub data download completed.")
