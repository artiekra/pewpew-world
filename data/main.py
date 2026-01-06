import importlib
import json
import os
import sys
import argparse

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

# Add the current directory to the path so we can import modules
sys.path.append(os.path.dirname(__file__))

data_dir = os.path.dirname(__file__)

# Configure logger to write to logs directory
logs_dir = os.path.join(data_dir, "logs")
os.makedirs(logs_dir, exist_ok=True)

logger.add(
    os.path.join(logs_dir, "app_{time}.log"),
    level="SUCCESS",
    rotation="30 MB",
    retention="3 months",
)


def run_module(module_name):
    """
    Dynamically imports and runs a module's 'run' function.
    """
    try:
        mod = importlib.import_module(module_name)
        if hasattr(mod, "run"):
            mod.run()
            logger.info(f"Successfully ran module: {module_name}")
        else:
            logger.error(f"Module {module_name} does not have a 'run' function.")
    except Exception as e:
        logger.error(f"Error running {module_name}: {e}")


# Load modules configuration from modules.json
modules_json_path = os.path.join(data_dir, "modules.json")

try:
    with open(modules_json_path, "r") as f:
        modules_config = json.load(f)
except FileNotFoundError:
    logger.error(f"modules.json not found at {modules_json_path}")
    sys.exit(1)
except json.JSONDecodeError as e:
    logger.error(f"Error parsing modules.json: {e}")
    sys.exit(1)

# Set up argument parser
parser = argparse.ArgumentParser(description="Data Scraper for PewPew World")
parser.add_argument(
    "--now",
    type=str,
    help="Run a specific module or 'all' immediately and exit",
)

args = parser.parse_args()

if args.now:
    if args.now == "all":
        logger.info("Running all modules immediately...")
        for config in modules_config:
            run_module(config["module"])
    else:
        # Check if the module is in the config
        module_found = False
        for config in modules_config:
            if config["module"] == args.now:
                logger.info(f"Running module {args.now} immediately...")
                run_module(args.now)
                module_found = True
                break
        
        if not module_found:
            # Try to run it even if it's not in the config (extra flexibility)
            logger.info(f"Module {args.now} not in modules.json, attempting to run anyway...")
            run_module(args.now)
    
    logger.info("Direct execution complete. Exiting.")
    sys.exit(0)

# Initialize the scheduler
scheduler = BlockingScheduler()

# Schedule jobs based on the configuration
for config in modules_config:
    module = config["module"]
    cron = config["cron"]

    try:
        scheduler.add_job(run_module, CronTrigger.from_crontab(cron), args=[module])
        logger.info(f"Scheduled {module} with cron '{cron}'")
    except Exception as e:
        logger.error(f"Invalid cron expression '{cron}' for module {module}: {e}")

logger.info("Scheduler started. Running in the background...")

# Start the scheduler (blocks until stopped)
scheduler.start()
