import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class LeaderboardEntry(BaseModel):
    player_uuid: str
    country: str
    score: int
    wrs: int
    average_place: float


class MonthlyLeaderboardResponse(BaseModel):
    timestamp: float
    levels: List[str]
    leaderboard: List[LeaderboardEntry]


class MonthlyLevelsResponse(BaseModel):
    year: int
    month: int
    timestamp: float
    levels: List[str]


class XPLeaderboardEntry(BaseModel):
    acc: str
    name: str
    xp: int


class XPLeaderboardResponse(BaseModel):
    timestamp: float
    data: List[XPLeaderboardEntry]


class BlitzLeaderboardEntry(BaseModel):
    acc: str
    name: str
    bsr: int


class BlitzLeaderboardResponse(BaseModel):
    timestamp: float
    data: List[BlitzLeaderboardEntry]


class QuestLevel(BaseModel):
    uuid: str
    version: int
    name: str


class Quest(BaseModel):
    kind: int
    goal: int
    levels: List[QuestLevel]
    xp: int
    enemy: Optional[str] = None


class QuestData(BaseModel):
    version: int
    expiration: int
    quests_id: int
    quests: List[Quest]


class QuestResponse(BaseModel):
    timestamp: float
    data: QuestData


class PlayerXPHistoryPoint(BaseModel):
    timestamp: float
    xp: int


class PlayerXPHistoryResponse(BaseModel):
    player_uuid: str
    history: List[PlayerXPHistoryPoint]


class PlayerBlitzHistoryPoint(BaseModel):
    timestamp: float
    bsr: int


class PlayerBlitzHistoryResponse(BaseModel):
    player_uuid: str
    history: List[PlayerBlitzHistoryPoint]


class LeaderboardPlacement(BaseModel):
    timestamp: float
    placement: Optional[int]
    not_found: bool


class PlayerLeaderboardPlacementsResponse(BaseModel):
    player_uuid: str
    monthly_leaderboard: LeaderboardPlacement
    xp_leaderboard: LeaderboardPlacement
    blitz_leaderboard: LeaderboardPlacement


class UsernameChange(BaseModel):
    timestamp: float
    new_name: str


class UsernameChangeHistoryResponse(BaseModel):
    player_uuid: str
    changes: List[UsernameChange]


@router.get(
    "/",
    summary="Root endpoint",
    description="Returns a welcome message indicating the API is running",
    response_description="Welcome message",
)
async def root():
    return {"message": "API v1 is running"}


@router.get(
    "/health",
    summary="Health check",
    description="Check if the API is healthy and running",
    response_description="Health status",
)
async def health():
    return {"status": "healthy"}


@router.get(
    "/get_monthly_leaderboard",
    summary="Get current monthly leaderboard",
    description="Retrieves the current monthly leaderboard, current levels and data timestamp",
    tags=["monthly leaderboard"],
    response_model=MonthlyLeaderboardResponse,
)
async def get_monthly_leaderboard():
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"

    leaderboard_path = base_path / "monthly_lb_daily/leaderboard.csv"
    levels_path = base_path / "monthly_lb_monthly/levels.txt"
    metadata_path = base_path / "github_data/metadata.json"

    leaderboard = []
    levels = []
    timestamp = 0.0

    if leaderboard_path.exists():
        with open(leaderboard_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                leaderboard.append(
                    LeaderboardEntry(
                        player_uuid=row["player_uuid"],
                        country=row["country"],
                        score=int(row["score"]),
                        wrs=int(row["wrs"]),
                        average_place=float(row["average_place"]),
                    )
                )

    if levels_path.exists():
        with open(levels_path, "r") as f:
            levels = [line.strip() for line in f if line.strip()]

    if metadata_path.exists():
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
            timestamp = metadata.get("timestamp", 0.0)

    return MonthlyLeaderboardResponse(
        timestamp=timestamp, levels=levels, leaderboard=leaderboard
    )


@router.get(
    "/get_monthly_leaderboard/{year}/{month}",
    summary="Get archived monthly leaderboard",
    description="Retrieves the archived monthly leaderboard for a specific month with the latest stored state",
    tags=["monthly leaderboard"],
    response_model=MonthlyLeaderboardResponse,
)
async def get_archived_monthly_leaderboard(year: int, month: int):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = (
        base_path / f"monthly_lb_daily/archive/monthly_lb_{month}_{year}.json"
    )
    levels_archive_path = base_path / "monthly_lb_monthly/levels_archive.json"

    if not archive_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No monthly leaderboard archive found for {month}/{year}",
        )

    with open(archive_path, "r") as f:
        archive = json.load(f)

    if not archive:
        raise HTTPException(status_code=404, detail=f"Archive is empty")

    latest_entry = max(archive, key=lambda x: x.get("timestamp", 0))

    leaderboard = []
    for entry in latest_entry.get("data", []):
        leaderboard.append(
            LeaderboardEntry(
                player_uuid=entry["player_uuid"],
                country=entry["country"],
                score=int(entry["score"]),
                wrs=int(entry["wrs"]),
                average_place=float(entry["average_place"]),
            )
        )

    levels = []
    timestamp = latest_entry.get("timestamp", 0.0)

    if levels_archive_path.exists():
        with open(levels_archive_path, "r") as f:
            levels_archive = json.load(f)
            closest_levels_entry = find_closest_timestamp(levels_archive, timestamp)
            levels = closest_levels_entry.get("levels", [])

    return MonthlyLeaderboardResponse(
        timestamp=timestamp, levels=levels, leaderboard=leaderboard
    )


@router.get(
    "/get_monthly_leaderboard_levels/{year}/{month}",
    summary="Get monthly leaderboard levels by year and month",
    description="Retrieves the levels for a specific month from the levels archive",
    tags=["monthly leaderboard"],
    response_model=MonthlyLevelsResponse,
)
async def get_monthly_leaderboard_levels(year: int, month: int):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = base_path / "monthly_lb_monthly/levels_archive.json"

    with open(archive_path, "r") as f:
        archive = json.load(f)

    month_start = datetime(year, month, 1).timestamp()

    if month == 12:
        month_end = datetime(year + 1, 1, 1).timestamp()
    else:
        month_end = datetime(year, month + 1, 1).timestamp()

    for entry in archive:
        timestamp = entry.get("timestamp", 0)
        if month_start <= timestamp < month_end:
            return MonthlyLevelsResponse(
                year=year,
                month=month,
                timestamp=timestamp,
                levels=entry.get("levels", []),
            )

    raise HTTPException(status_code=404, detail=f"No levels found for {year}/{month}")


def find_closest_timestamp(
    archive: List[Dict[str, Any]], target_timestamp: float
) -> Dict[str, Any]:
    closest_entry = min(
        archive, key=lambda x: abs(x.get("timestamp", 0) - target_timestamp)
    )
    return closest_entry


@router.get(
    "/archive/xp_leaderboard/{timestamp}",
    summary="Get archived XP leaderboard by timestamp",
    description="Retrieves the XP leaderboard entry closest to the given timestamp",
    tags=["archive"],
    response_model=XPLeaderboardResponse,
)
async def get_archived_xp_leaderboard(timestamp: float):
    dt = datetime.fromtimestamp(timestamp)
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = base_path / f"xp_lb_archive/xp_lb_{dt.month}_{dt.year}.json"

    with open(archive_path, "r") as f:
        archive = json.load(f)

    closest_entry = find_closest_timestamp(archive, timestamp)

    return XPLeaderboardResponse(
        timestamp=closest_entry["timestamp"], data=closest_entry["data"]
    )


@router.get(
    "/archive/blitz_leaderboard/{timestamp}",
    summary="Get archived Blitz leaderboard by timestamp",
    description="Retrieves the Blitz leaderboard entry closest to the given timestamp",
    tags=["archive"],
    response_model=BlitzLeaderboardResponse,
)
async def get_archived_blitz_leaderboard(timestamp: float):
    dt = datetime.fromtimestamp(timestamp)
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = base_path / f"blitz_lb_archive/blitz_lb_{dt.month}_{dt.year}.json"

    with open(archive_path, "r") as f:
        archive = json.load(f)

    closest_entry = find_closest_timestamp(archive, timestamp)

    return BlitzLeaderboardResponse(
        timestamp=closest_entry["timestamp"], data=closest_entry["data"]
    )


@router.get(
    "/archive/quests/{year}/{month}/{day}",
    summary="Get archived quests by date",
    description="Retrieves the quests entry for a specific date",
    tags=["archive"],
    response_model=QuestResponse,
)
async def get_archived_quests(year: int, month: int, day: int):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = base_path / f"quests_archive/quests_{month}_{year}.json"

    if not archive_path.exists():
        raise HTTPException(
            status_code=404, detail=f"No quests archive found for {month}/{year}"
        )

    with open(archive_path, "r") as f:
        archive = json.load(f)

    day_start = datetime(year, month, day).timestamp()
    day_end = (
        datetime(year, month, day + 1).timestamp()
        if day < 31
        else (
            datetime(year, month + 1, 1).timestamp()
            if month < 12
            else datetime(year + 1, 1, 1).timestamp()
        )
    )

    for entry in archive:
        entry_timestamp = entry.get("timestamp", 0)
        if day_start <= entry_timestamp < day_end:
            return QuestResponse(timestamp=entry_timestamp, data=entry["data"])

    raise HTTPException(
        status_code=404, detail=f"No quests found for {year}/{month}/{day}"
    )


@router.get(
    "/player/{uuid}/get_xp_history",
    summary="Get player XP history",
    description="Retrieves XP value history for a specific player across all archive files",
    tags=["player"],
    response_model=PlayerXPHistoryResponse,
)
async def get_player_xp_history(uuid: str, sample_rate: int = 1):
    if sample_rate < 1:
        raise HTTPException(status_code=400, detail="Sample rate must be at least 1")

    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    xp_archive_dir = base_path / "xp_lb_archive"

    all_entries = []

    for archive_file in sorted(xp_archive_dir.glob("xp_lb_*.json")):
        with open(archive_file, "r") as f:
            archive = json.load(f)

        for entry in archive:
            timestamp = entry.get("timestamp", 0)
            for player in entry.get("data", []):
                if player.get("acc") == uuid:
                    all_entries.append(
                        PlayerXPHistoryPoint(
                            timestamp=timestamp, xp=int(player.get("xp", 0))
                        )
                    )
                    break

    all_entries.sort(key=lambda x: x.timestamp)

    sampled_entries = all_entries[::sample_rate]

    return PlayerXPHistoryResponse(player_uuid=uuid, history=sampled_entries)


@router.get(
    "/player/{uuid}/get_blitz_history",
    summary="Get player blitz history",
    description="Retrieves blitz rating history for a specific player across all archive files",
    tags=["player"],
    response_model=PlayerBlitzHistoryResponse,
)
async def get_player_blitz_history(uuid: str, sample_rate: int = 1):
    if sample_rate < 1:
        raise HTTPException(status_code=400, detail="Sample rate must be at least 1")

    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    blitz_archive_dir = base_path / "blitz_lb_archive"

    all_entries = []

    for archive_file in sorted(blitz_archive_dir.glob("blitz_lb_*.json")):
        with open(archive_file, "r") as f:
            archive = json.load(f)

        for entry in archive:
            timestamp = entry.get("timestamp", 0)
            for player in entry.get("data", []):
                if player.get("acc") == uuid:
                    all_entries.append(
                        PlayerBlitzHistoryPoint(
                            timestamp=timestamp, bsr=int(player.get("bsr", 0))
                        )
                    )
                    break

    all_entries.sort(key=lambda x: x.timestamp)

    sampled_entries = all_entries[::sample_rate]

    return PlayerBlitzHistoryResponse(player_uuid=uuid, history=sampled_entries)


@router.get(
    "/player/{uuid}/get_leaderboard_placements",
    summary="Get player leaderboard placements",
    description="Retrieves player's placement on monthly, XP, and Blitz leaderboards",
    tags=["player"],
    response_model=PlayerLeaderboardPlacementsResponse,
)
async def get_player_leaderboard_placements(uuid: str):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"

    monthly_placement = LeaderboardPlacement(
        timestamp=0.0, placement=None, not_found=True
    )
    xp_placement = LeaderboardPlacement(timestamp=0.0, placement=None, not_found=True)
    blitz_placement = LeaderboardPlacement(
        timestamp=0.0, placement=None, not_found=True
    )

    leaderboard_path = base_path / "monthly_lb_daily/leaderboard.csv"
    metadata_path = base_path / "github_data/metadata.json"

    if leaderboard_path.exists():
        with open(leaderboard_path, "r") as f:
            reader = csv.DictReader(f)
            for index, row in enumerate(reader):
                if row["player_uuid"] == uuid:
                    monthly_placement = LeaderboardPlacement(
                        timestamp=0.0, placement=index + 1, not_found=False
                    )
                    break

    if metadata_path.exists():
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
            monthly_placement.timestamp = metadata.get("timestamp", 0.0)

    xp_archive_dir = base_path / "xp_lb_archive"
    if xp_archive_dir.exists():
        xp_files = sorted(xp_archive_dir.glob("xp_lb_*.json"))
        if xp_files:
            latest_xp_file = xp_files[-1]
            with open(latest_xp_file, "r") as f:
                xp_archive = json.load(f)
            latest_xp_entry = max(xp_archive, key=lambda x: x.get("timestamp", 0))
            xp_placement.timestamp = latest_xp_entry.get("timestamp", 0.0)
            for index, player in enumerate(latest_xp_entry.get("data", [])):
                if player.get("acc") == uuid:
                    xp_placement.placement = index + 1
                    xp_placement.not_found = False
                    break

    blitz_archive_dir = base_path / "blitz_lb_archive"
    if blitz_archive_dir.exists():
        blitz_files = sorted(blitz_archive_dir.glob("blitz_lb_*.json"))
        if blitz_files:
            latest_blitz_file = blitz_files[-1]
            with open(latest_blitz_file, "r") as f:
                blitz_archive = json.load(f)
            latest_blitz_entry = max(blitz_archive, key=lambda x: x.get("timestamp", 0))
            blitz_placement.timestamp = latest_blitz_entry.get("timestamp", 0.0)
            for index, player in enumerate(latest_blitz_entry.get("data", [])):
                if player.get("acc") == uuid:
                    blitz_placement.placement = index + 1
                    blitz_placement.not_found = False
                    break

    return PlayerLeaderboardPlacementsResponse(
        player_uuid=uuid,
        monthly_leaderboard=monthly_placement,
        xp_leaderboard=xp_placement,
        blitz_leaderboard=blitz_placement,
    )


@router.get(
    "/player/{uuid}/get_username_change_history",
    summary="Get player username change history",
    description="Retrieves history of username changes for a specific player",
    tags=["player"],
    response_model=UsernameChangeHistoryResponse,
)
async def get_username_change_history(uuid: str):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    xp_archive_dir = base_path / "xp_lb_archive"

    all_entries = []

    for archive_file in sorted(xp_archive_dir.glob("xp_lb_*.json")):
        with open(archive_file, "r") as f:
            archive = json.load(f)

        for entry in archive:
            timestamp = entry.get("timestamp", 0)
            for player in entry.get("data", []):
                if player.get("acc") == uuid:
                    all_entries.append(
                        {"timestamp": timestamp, "name": player.get("name", "")}
                    )
                    break

    all_entries.sort(key=lambda x: x["timestamp"])

    changes = []
    previous_name = None

    for entry in all_entries:
        current_name = entry["name"]
        if previous_name is None or current_name != previous_name:
            changes.append(
                UsernameChange(timestamp=entry["timestamp"], new_name=current_name)
            )
            previous_name = current_name

    return UsernameChangeHistoryResponse(player_uuid=uuid, changes=changes)
