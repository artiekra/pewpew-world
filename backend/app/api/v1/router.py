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
