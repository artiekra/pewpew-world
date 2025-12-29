# put this into a folder together with the project root folder, and folders "data" and "data_old" to migrate from

import datetime
import json
import os
import struct
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

import cbor2

# --- CONFIGURATION ---


def get_destination_info(old_category: str) -> Tuple[str, str] | None:
    """Map old folder names to new archive folder names and file prefixes."""
    mapping = {
        "blitz-leaderboard": ("blitz_lb_archive", "blitz_lb"),
        "quests": ("quests_archive", "quests"),
        "xp-leaderboard": ("xp_lb_archive", "xp_lb"),
    }
    return mapping.get(old_category)


# --- PARSING & TRANSFORMATION ---


def parse_timestamp(date_str: str) -> float:
    """Convert 'YYYY-MM-DD HH:MM:SS' string to unix timestamp float."""
    try:
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
        return dt.timestamp()
    except Exception:
        return 0.0


def transform_data(cbor_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Transform the old dictionary structure to the new timestamp/data structure."""
    new_entries = []
    for entry in cbor_entries:
        try:
            date_str = entry.get("date_saved")
            if not date_str:
                continue
            timestamp = parse_timestamp(date_str)

            if "leaderboard" in entry:
                payload = entry["leaderboard"]
            elif "quests" in entry:
                payload = entry["quests"]
            else:
                continue

            new_entries.append({"timestamp": timestamp, "data": payload})
        except Exception:
            continue
    return new_entries


# --- RECOVERY ---


def recover_cbor_data(file_path: Path) -> List[Any]:
    """Attempts to read a corrupted CBOR list file by skipping the header."""
    with open(file_path, "rb") as f:
        try:
            return cbor2.load(f)
        except Exception:
            pass  # Fall through to recovery

        print(f"  -> attempting recovery for {file_path.name}...")
        f.seek(0)
        data = f.read()

    stream = BytesIO(data)
    recovered_items = []

    try:
        first_byte = stream.read(1)
        if not first_byte:
            return []
        fb = first_byte[0]

        # Skip array headers (0x80-0x9F) to read items sequentially
        if 0x98 == fb:
            stream.read(1)
        elif 0x99 == fb:
            stream.read(2)
        elif 0x9A == fb:
            stream.read(4)
        elif 0x9B == fb:
            stream.read(8)
        elif not (0x80 <= fb <= 0x97 or fb == 0x9F):
            stream.seek(0)  # Not an array, reset

        while True:
            try:
                item = cbor2.load(stream)
                recovered_items.append(item)
            except (EOFError, cbor2.CBORDecodeError, struct.error):
                break

        print(f"  -> recovered {len(recovered_items)} items.")
        return recovered_items
    except Exception as e:
        print(f"  -> recovery failed: {e}")
        return []


# --- MAIN LOGIC ---


def main() -> None:
    base_dir = Path(__file__).parent
    project_dir = base_dir / "project"
    source_dirs = ["data", "data_old"]

    # Dictionary to group source files by target destination
    # Key: (category, year, month) -> Value: List[Path]
    tasks: Dict[Tuple[str, str, str], List[Path]] = {}

    print("scanning for files...")

    # 1. SCAN PHASE
    for source_name in source_dirs:
        current_source_root = base_dir / source_name
        if not current_source_root.exists():
            continue

        for category_dir in current_source_root.iterdir():
            if not category_dir.is_dir():
                continue

            # Check if this is a category we care about
            if not get_destination_info(category_dir.name):
                continue

            for file_path in category_dir.iterdir():
                if file_path.suffix != ".cbor":
                    continue

                try:
                    # Parse filename: name_YYYY-MM.cbor
                    filename_parts = file_path.stem.split("_")
                    date_part = filename_parts[-1]  # 2025-12
                    year, month = date_part.split("-")

                    key = (category_dir.name, year, month)
                    if key not in tasks:
                        tasks[key] = []
                    tasks[key].append(file_path)

                except ValueError:
                    print(f"skipping {file_path.name}: bad filename format")

    print(f"found {len(tasks)} unique target files to create.")

    # 2. MERGE & MIGRATE PHASE
    for (category, year, month), source_paths in tasks.items():
        dest_info = get_destination_info(category)
        if not dest_info:
            continue

        new_folder_name, new_prefix = dest_info
        new_filename = f"{new_prefix}_{month}_{year}.json"

        print(f"processing {new_filename} (sources: {len(source_paths)})...")

        merged_data = []

        # Load all sources for this month
        for src in source_paths:
            raw_data = recover_cbor_data(src)
            if raw_data:
                transformed = transform_data(raw_data)
                merged_data.extend(transformed)

        # Deduplicate based on timestamp
        unique_data = []
        seen_timestamps: Set[float] = set()

        for entry in merged_data:
            ts = entry["timestamp"]
            if ts not in seen_timestamps:
                seen_timestamps.add(ts)
                unique_data.append(entry)

        # Sort by timestamp
        unique_data.sort(key=lambda x: x["timestamp"])

        # Save
        dest_dir = project_dir / "data" / "data" / new_folder_name
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_path = dest_dir / new_filename

        try:
            with open(dest_path, "w", encoding="utf-8") as f:
                json.dump(unique_data, f, indent=4)
        except Exception as e:
            print(f"error writing {new_filename}: {e}")

    print("migration complete!")


if __name__ == "__main__":
    main()
