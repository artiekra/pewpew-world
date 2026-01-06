"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ColorizedText from "@/components/colorized-text";
import api from "@/helpers/api";

interface LeaderboardEntry {
  player_uuid: string;
  player_name: string;
  country: string;
  score: number;
  wrs: number;
  average_place: number;
}

interface SpeedrunLeaderboardEntry {
  player_uuid: string;
  player_name: string;
  country: string;
  score_1p_official: number;
  score_2p_official: number;
  score_1p_community: number;
  score_2p_community: number;
}

// Helper to get Tabler flag class
const getFlagClass = (countryCode: string) => {
  if (!countryCode) return "";
  return `flag flag-xs flag-country-${countryCode.toLowerCase()}`;
};

interface LeaderboardExtractProps {
  type: "monthly" | "speedrun";
}

export default function LeaderboardExtract({ type }: LeaderboardExtractProps) {
  const [monthlyData, setMonthlyData] = useState<LeaderboardEntry[]>([]);
  const [speedrunData, setSpeedrunData] = useState<
    (SpeedrunLeaderboardEntry & { display_score: number })[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (type === "monthly") {
          const response = await api.get<{ leaderboard: LeaderboardEntry[] }>(
            "/v1/get_monthly_leaderboard",
          );
          setMonthlyData(response.data.leaderboard.slice(0, 5));
        } else {
          const response = await api.get<{
            leaderboard: SpeedrunLeaderboardEntry[];
          }>("/v1/get_speedrun_leaderboard");
          const processed = response.data.leaderboard
            .map((entry) => ({
              ...entry,
              display_score:
                entry.score_1p_official +
                entry.score_2p_official +
                entry.score_1p_community +
                entry.score_2p_community,
            }))
            .sort((a, b) => b.display_score - a.display_score)
            .slice(0, 5);
          setSpeedrunData(processed);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [type]);

  const title =
    type === "monthly" ? "Monthly Leaderboard" : "Speedrun Leaderboard";
  const linkHref =
    type === "monthly" ? "/leaderboards/monthly" : "/leaderboards/speedrun";
  const data =
    type === "monthly"
      ? monthlyData
      : speedrunData.map((entry) => ({
          player_uuid: entry.player_uuid,
          player_name: entry.player_name,
          country: entry.country,
          score: entry.display_score,
        }));

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">{title}</h5>
        <Link href={linkHref} className="btn">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-external-link"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
            <path d="M11 13l9 -9" />
            <path d="M15 4h5v5" />
          </svg>
          Open
        </Link>
      </div>
      <div className="card-body">
        {isLoading ? (
          <div className="text-center">
            <div
              className="spinner-border spinner-border-sm"
              role="status"
            ></div>
          </div>
        ) : (
          <>
            <ul className="list-group list-group-flush">
              {data.map((entry, index) => (
                <li
                  key={entry.player_uuid}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div className="d-flex align-items-center">
                    <span className="badge me-2">{index + 1}</span>
                    {entry.country && (
                      <span
                        className={`me-2 user-select-none ${getFlagClass(
                          entry.country,
                        )}`}
                        title={entry.country}
                      ></span>
                    )}
                    <Link
                      href={`/player/${entry.player_uuid}`}
                      className="player-link text-reset"
                    >
                      <ColorizedText text={entry.player_name} />
                    </Link>
                  </div>
                  <span className="text-muted">
                    {entry.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
