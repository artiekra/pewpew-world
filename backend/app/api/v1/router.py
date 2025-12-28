import csv
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

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
