import csv
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import orjson
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()


class LeaderboardEntry(BaseModel):
    player_uuid: str
    player_name: str
    country: str
    score: int
    wrs: int
    average_place: float


class LevelInfo(BaseModel):
    uuid: str
    name: str


class MonthlyLeaderboardResponse(BaseModel):
    timestamp: float
    levels: List[LevelInfo]
    leaderboard: List[LeaderboardEntry]


class MonthlyLevelsResponse(BaseModel):
    year: int
    month: int
    timestamp: float
    levels: List[str]


class SpeedrunLeaderboardEntry(BaseModel):
    player_uuid: str
    player_name: str
    country: str
    score_1p_official: float
    score_2p_official: float
    score_1p_community: float
    score_2p_community: float


class SpeedrunLeaderboardResponse(BaseModel):
    timestamp: float
    leaderboard: List[SpeedrunLeaderboardEntry]


class XPLeaderboardEntry(BaseModel):
    acc: str
    name: str
    xp: int


class XPLeaderboardResponse(BaseModel):
    timestamp: float
    data: List[XPLeaderboardEntry]


class DayStatus(BaseModel):
    day: int
    status: str


class MonthUptimeResponse(BaseModel):
    year: int
    month: int
    days: List[DayStatus]


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
    levels: List[QuestLevel] = []
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


class PlayerLevelScore(BaseModel):
    player_uuid: str
    score: int
    level_version: int
    value_type: int
    timestamp: float
    country: str


class LevelScoresGroup(BaseModel):
    level_uuid: str
    level_name: str
    scores: List[PlayerLevelScore]


class ComparisonResponse(BaseModel):
    players: List[str]
    levels: List[LevelScoresGroup]


class PlayerShortInfo(BaseModel):
    account_id: str
    username: str


class PlayersResponse(BaseModel):
    players: List[PlayerShortInfo]


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
    level_data_path = base_path / "github_data/level_data.csv"
    account_data_path = base_path / "github_data/account_data.csv"

    leaderboard = []
    levels = []
    timestamp = 0.0

    player_name_map = {}
    if account_data_path.exists():
        with open(account_data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                player_name_map[row["account_id"]] = row["username"]

    if leaderboard_path.exists():
        with open(leaderboard_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                player_uuid = row["player_uuid"]
                leaderboard.append(
                    LeaderboardEntry(
                        player_uuid=player_uuid,
                        player_name=player_name_map.get(player_uuid, player_uuid),
                        country=row["country"],
                        score=int(row["score"]),
                        wrs=int(row["wrs"]),
                        average_place=float(row["average_place"]),
                    )
                )

    if levels_path.exists():
        with open(levels_path, "r") as f:
            level_uuids = [line.strip() for line in f if line.strip()]

        level_name_map = {}
        if level_data_path.exists():
            with open(level_data_path, "r") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    level_name_map[row["level_uuid"]] = row["name"]

        levels = [
            LevelInfo(uuid=uuid, name=level_name_map.get(uuid, uuid))
            for uuid in level_uuids
        ]

    if metadata_path.exists():
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
            timestamp = metadata.get("timestamp", 0.0)

    return MonthlyLeaderboardResponse(
        timestamp=timestamp, levels=levels, leaderboard=leaderboard
    )


@router.get(
    "/get_speedrun_leaderboard",
    summary="Get current speedrun leaderboard",
    description="Retrieves the current daily speedrun leaderboard",
    tags=["leaderboards"],
    response_model=SpeedrunLeaderboardResponse,
)
async def get_speedrun_leaderboard():
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"

    leaderboard_path = base_path / "speedrun_lb_daily/leaderboard.csv"
    metadata_path = base_path / "github_data/metadata.json"
    account_data_path = base_path / "github_data/account_data.csv"

    leaderboard = []
    timestamp = 0.0

    player_name_map = {}
    if account_data_path.exists():
        with open(account_data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                player_name_map[row["account_id"]] = row["username"]

    if leaderboard_path.exists():
        with open(leaderboard_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                player_uuid = row["player_uuid"]
                leaderboard.append(
                    SpeedrunLeaderboardEntry(
                        player_uuid=player_uuid,
                        player_name=player_name_map.get(player_uuid, player_uuid),
                        country=row.get("country", ""),
                        score_1p_official=float(row.get("score_1p_official", 0.0)),
                        score_2p_official=float(row.get("score_2p_official", 0.0)),
                        score_1p_community=float(row.get("score_1p_community", 0.0)),
                        score_2p_community=float(row.get("score_2p_community", 0.0)),
                    )
                )

    if metadata_path.exists():
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
            timestamp = metadata.get("timestamp", 0.0)

    return SpeedrunLeaderboardResponse(timestamp=timestamp, leaderboard=leaderboard)


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
        base_path / f"monthly_lb_daily/archive/monthly_lb_{month:02d}_{year}.json"
    )
    levels_archive_path = base_path / "monthly_lb_monthly/levels_archive.json"
    level_data_path = base_path / "github_data/level_data.csv"
    account_data_path = base_path / "github_data/account_data.csv"

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

    player_name_map = {}
    if account_data_path.exists():
        with open(account_data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                player_name_map[row["account_id"]] = row["username"]

    leaderboard = []
    for entry in latest_entry.get("data", []):
        player_uuid = entry["player_uuid"]
        leaderboard.append(
            LeaderboardEntry(
                player_uuid=player_uuid,
                player_name=player_name_map.get(player_uuid, player_uuid),
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
            level_uuids = closest_levels_entry.get("levels", [])

        level_name_map = {}
        if level_data_path.exists():
            with open(level_data_path, "r") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    level_name_map[row["level_uuid"]] = row["name"]

        levels = [
            LevelInfo(uuid=uuid, name=level_name_map.get(uuid, uuid))
            for uuid in level_uuids
        ]

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
    archive_path = base_path / f"xp_lb_archive/xp_lb_{dt.month:02d}_{dt.year}.json"

    if not archive_path.exists():
        raise HTTPException(
            status_code=404, detail=f"No XP archive found for {dt.month}/{dt.year}"
        )

    with open(archive_path, "r") as f:
        archive = json.load(f)

    closest_entry = find_closest_timestamp(archive, timestamp)

    return XPLeaderboardResponse(
        timestamp=closest_entry["timestamp"], data=closest_entry["data"]
    )


@router.get(
    "/archive/uptime/xp_leaderboard/{year}/{month}",
    summary="Get XP leaderboard uptime status for a month",
    description="Checks availability of XP leaderboard data for each day of a given month",
    tags=["archive"],
    response_model=MonthUptimeResponse,
)
async def get_xp_leaderboard_uptime(year: int, month: int):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = base_path / f"xp_lb_archive/xp_lb_{month:02d}_{year}.json"

    if not archive_path.exists():
        raise HTTPException(
            status_code=404, detail=f"No XP archive found for {month}/{year}"
        )

    with open(archive_path, "r") as f:
        archive = json.load(f)

    next_month = (
        datetime(year, month + 1, 1, tzinfo=timezone.utc)
        if month < 12
        else datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    )
    days_in_month = (next_month - timedelta(days=1)).day

    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    month_end = (
        datetime(year, month + 1, 1, tzinfo=timezone.utc)
        if month < 12
        else datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    )

    days = []
    for day in range(1, days_in_month + 1):
        day_start = datetime(year, month, day, tzinfo=timezone.utc)
        day_end = (
            datetime(year, month, day + 1, tzinfo=timezone.utc)
            if day < days_in_month
            else month_end
        )

        day_start_ts = day_start.timestamp()
        day_end_ts = day_end.timestamp()

        entries_in_day = [
            e for e in archive if day_start_ts <= e.get("timestamp", 0) < day_end_ts
        ]

        if not entries_in_day:
            status = "no data"
        else:
            hours_with_data = set()
            for entry in entries_in_day:
                dt = datetime.fromtimestamp(entry.get("timestamp", 0), timezone.utc)
                hours_with_data.add(dt.hour)

            if len(hours_with_data) == 24:
                status = "full data"
            else:
                status = "partially available"

        days.append(DayStatus(day=day, status=status))

    return MonthUptimeResponse(year=year, month=month, days=days)


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
    archive_path = (
        base_path / f"blitz_lb_archive/blitz_lb_{dt.month:02d}_{dt.year}.json"
    )

    if not archive_path.exists():
        raise HTTPException(
            status_code=404, detail=f"No blitz archive found for {dt.month}/{dt.year}"
        )

    with open(archive_path, "r") as f:
        archive = json.load(f)

    closest_entry = find_closest_timestamp(archive, timestamp)

    return BlitzLeaderboardResponse(
        timestamp=closest_entry["timestamp"], data=closest_entry["data"]
    )


@router.get(
    "/archive/uptime/blitz_leaderboard/{year}/{month}",
    summary="Get Blitz leaderboard uptime status for a month",
    description="Checks availability of Blitz leaderboard data for each day of a given month",
    tags=["archive"],
    response_model=MonthUptimeResponse,
)
async def get_blitz_leaderboard_uptime(year: int, month: int):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = base_path / f"blitz_lb_archive/blitz_lb_{month:02d}_{year}.json"

    if not archive_path.exists():
        raise HTTPException(
            status_code=404, detail=f"No blitz archive found for {month}/{year}"
        )

    with open(archive_path, "r") as f:
        archive = json.load(f)

    next_month = (
        datetime(year, month + 1, 1, tzinfo=timezone.utc)
        if month < 12
        else datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    )
    days_in_month = (next_month - timedelta(days=1)).day

    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    month_end = (
        datetime(year, month + 1, 1, tzinfo=timezone.utc)
        if month < 12
        else datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    )

    days = []
    for day in range(1, days_in_month + 1):
        day_start = datetime(year, month, day, tzinfo=timezone.utc)
        day_end = (
            datetime(year, month, day + 1, tzinfo=timezone.utc)
            if day < days_in_month
            else month_end
        )

        day_start_ts = day_start.timestamp()
        day_end_ts = day_end.timestamp()

        entries_in_day = [
            e for e in archive if day_start_ts <= e.get("timestamp", 0) < day_end_ts
        ]

        if not entries_in_day:
            status = "no data"
        else:
            hours_with_data = set()
            for entry in entries_in_day:
                dt = datetime.fromtimestamp(entry.get("timestamp", 0), timezone.utc)
                hours_with_data.add(dt.hour)

            if len(hours_with_data) == 24:
                status = "full data"
            else:
                status = "partially available"

        days.append(DayStatus(day=day, status=status))

    return MonthUptimeResponse(year=year, month=month, days=days)


@router.get(
    "/archive/quests/{year}/{month}/{day}",
    summary="Get archived quests by date",
    description="Retrieves the quests entry for a specific date",
    tags=["archive"],
    response_model=QuestResponse,
)
async def get_archived_quests(year: int, month: int, day: int):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = base_path / f"quests_archive/quests_{month:02d}_{year}.json"

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
    "/archive/uptime/quests/{year}/{month}",
    summary="Get quests uptime status for a month",
    description="Checks availability of quests data for each day of a given month",
    tags=["archive"],
    response_model=MonthUptimeResponse,
)
async def get_quests_uptime(year: int, month: int):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    archive_path = base_path / f"quests_archive/quests_{month:02d}_{year}.json"

    if not archive_path.exists():
        raise HTTPException(
            status_code=404, detail=f"No quests archive found for {month}/{year}"
        )

    with open(archive_path, "r") as f:
        archive = json.load(f)

    next_month = (
        datetime(year, month + 1, 1, tzinfo=timezone.utc)
        if month < 12
        else datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    )
    days_in_month = (next_month - timedelta(days=1)).day

    month_end = (
        datetime(year, month + 1, 1, tzinfo=timezone.utc)
        if month < 12
        else datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    )

    days = []
    for day in range(1, days_in_month + 1):
        day_start = datetime(year, month, day, tzinfo=timezone.utc)
        day_end = (
            datetime(year, month, day + 1, tzinfo=timezone.utc)
            if day < days_in_month
            else month_end
        )

        day_start_ts = day_start.timestamp()
        day_end_ts = day_end.timestamp()

        has_data = any(
            day_start_ts <= entry.get("timestamp", 0) < day_end_ts for entry in archive
        )

        status = "full data" if has_data else "no data"
        days.append(DayStatus(day=day, status=status))

    return MonthUptimeResponse(year=year, month=month, days=days)


def extract_history(
    uuid: str,
    sample_rate: int,
    archive_dir: Path,
    data_key: str,
    model_class,
):
    """Extracts history points from json archives with optimized sampling and orjson."""
    history = []
    snapshot_counter = 0

    for archive_file in sorted(archive_dir.glob("*_lb_*.json")):
        with open(archive_file, "rb") as f:
            archive = orjson.loads(f.read())

        for entry in archive:
            if snapshot_counter % sample_rate == 0:
                timestamp = entry.get("timestamp", 0)

                player_data = next(
                    (p for p in entry.get("data", []) if p.get("acc") == uuid), None
                )

                if player_data:
                    history.append(
                        model_class(
                            timestamp=timestamp,
                            **{data_key: int(player_data.get(data_key, 0))},
                        )
                    )

            snapshot_counter += 1

    return history


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

    sampled_entries = extract_history(
        uuid, sample_rate, xp_archive_dir, "xp", PlayerXPHistoryPoint
    )

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

    sampled_entries = extract_history(
        uuid, sample_rate, blitz_archive_dir, "bsr", PlayerBlitzHistoryPoint
    )

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


@router.get(
    "/comparison/get_scores_by_level",
    summary="Compare player scores by level",
    description="Retrieves latest scores for specified players grouped by level",
    tags=["comparison"],
    response_model=ComparisonResponse,
)
async def compare_scores_by_level(
    player_uuids: List[str] = Query(..., description="List of player UUIDs to compare")
):
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    score_data_path = base_path / "github_data/score_data.csv"

    level_versions = {}

    with open(score_data_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            level_uuid = row["level_uuid"]
            level_version = int(row["level_version"])

            if (
                level_uuid not in level_versions
                or level_version > level_versions[level_uuid]
            ):
                level_versions[level_uuid] = level_version

    player_scores = {}

    with open(score_data_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            player_uuid = row["account_ids"]

            if player_uuid not in player_uuids:
                continue

            level_uuid = row["level_uuid"]
            level_version = int(row["level_version"])

            if level_version != level_versions[level_uuid]:
                continue

            score = int(row["value"])
            value_type = int(row["value_type"])
            timestamp = float(row["date"])
            country = row["country"]

            key = (player_uuid, level_uuid, value_type)

            if key not in player_scores or timestamp > player_scores[key]["timestamp"]:
                player_scores[key] = {
                    "score": score,
                    "level_version": level_version,
                    "timestamp": timestamp,
                    "country": country,
                }

    level_groups = {}

    for (player_uuid, level_uuid, value_type), score_data in player_scores.items():
        if level_uuid not in level_groups:
            level_groups[level_uuid] = []

        level_groups[level_uuid].append(
            PlayerLevelScore(
                player_uuid=player_uuid,
                score=score_data["score"],
                level_version=score_data["level_version"],
                value_type=value_type,
                timestamp=score_data["timestamp"],
                country=score_data["country"],
            )
        )

    levels_sorted = sorted(level_groups.keys())

    level_data_path = base_path / "github_data/level_data.csv"
    level_name_map = {}
    if level_data_path.exists():
        with open(level_data_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                level_name_map[row["level_uuid"]] = row["name"]

    levels = [
        LevelScoresGroup(
            level_uuid=level_uuid,
            level_name=level_name_map.get(level_uuid, level_uuid),
            scores=sorted(
                level_groups[level_uuid], key=lambda x: x.score, reverse=True
            ),
        )
        for level_uuid in levels_sorted
    ]

    return ComparisonResponse(players=player_uuids, levels=levels)


@router.get(
    "/data/get_players",
    summary="Get all players",
    description="Retrieves all player data from the player-data.csv storage",
    tags=["data"],
    response_model=PlayersResponse,
)
async def get_players():
    base_path = Path(__file__).parent.parent.parent.parent.parent / "data/data"
    player_data_path = base_path / "github_data/account_data.csv"

    players = []
    try:
        with open(player_data_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                players.append(
                    PlayerShortInfo(
                        account_id=row.get("account_id", row.get("account_ids", "")),
                        username=row.get("username", ""),
                    )
                )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error reading player data: {str(e)}"
        )

    return PlayersResponse(players=players)
