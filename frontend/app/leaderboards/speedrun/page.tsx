"use client";

import { useEffect, useState, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import Accordion, { AccordionItem } from "@/components/accordion";
import DataTable from "@/components/data-table";
import ColorizedText from "@/components/colorized-text";
import api from "@/helpers/api";

interface SpeedrunLeaderboardEntry {
  player_uuid: string;
  player_name: string;
  country: string;
  score_1p_official: number;
  score_2p_official: number;
  score_1p_community: number;
  score_2p_community: number;
}

interface SpeedrunLeaderboardResponse {
  timestamp: number;
  leaderboard: SpeedrunLeaderboardEntry[];
}

// Helper to get Tabler flag class
const getFlagClass = (countryCode: string) => {
  if (!countryCode) return "";
  return `flag h-3 flag-country-${countryCode.toLowerCase()}`;
};

const scoreCalculation = (
  <>
    <p>
      The number of points P you get for your rank R in a given level depends on
      the number of players N that submitted a score to that level.
    </p>
    <p>
      <code>P = ((N ^ (1/6)) * 100) / sqrt(R)</code>
    </p>
    <p>
      There are separate scores for 1p/2p and Official/Community levels. You can
      combine them using the filters.
    </p>
  </>
);

export default function SpeedrunLeaderboardPage() {
  const [data, setData] = useState<SpeedrunLeaderboardEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [levelScope, setLevelScope] = useState<
    "all" | "official" | "community"
  >("all");
  const [playerMode, setPlayerMode] = useState<"all" | "1p" | "2p">("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get<SpeedrunLeaderboardResponse>(
          "/v1/get_speedrun_leaderboard",
        );
        setData(response.data.leaderboard);
        setLastUpdated(response.data.timestamp);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter Logic
  const filteredData = useMemo(() => {
    return data
      .map((entry) => {
        let score = 0;

        const includeOfficial =
          levelScope === "all" || levelScope === "official";
        const includeCommunity =
          levelScope === "all" || levelScope === "community";
        const include1p = playerMode === "all" || playerMode === "1p";
        const include2p = playerMode === "all" || playerMode === "2p";

        if (includeOfficial && include1p) score += entry.score_1p_official;
        if (includeOfficial && include2p) score += entry.score_2p_official;
        if (includeCommunity && include1p) score += entry.score_1p_community;
        if (includeCommunity && include2p) score += entry.score_2p_community;

        return {
          ...entry,
          display_score: parseFloat(score.toFixed(2)),
        };
      })
      .filter((entry) => entry.display_score > 0)
      .sort((a, b) => b.display_score - a.display_score);
  }, [data, levelScope, playerMode]);

  // Handle Community Selection disabling 2p
  useEffect(() => {
    if (levelScope === "community") {
      setPlayerMode("1p");
    }
  }, [levelScope]);

  const columns = useMemo<ColumnDef<(typeof filteredData)[0]>[]>(
    () => [
      {
        accessorKey: "player_name",
        header: "Player",
        cell: ({ row, getValue }) => {
          const countryCode = row.original.country;
          const uuid = row.original.player_uuid;

          return (
            <div className="d-flex align-items-center">
              <div className="text-truncate d-flex align-items-center" style={{ maxWidth: "160px" }}>
                {countryCode && (
                  <span
                    className={`me-2 user-select-none ${getFlagClass(
                      countryCode,
                    )}`}
                    title={countryCode}
                  ></span>
                )}
                <Link
                  href={`/player/${uuid}`}
                  className="player-link text-reset"
                >
                  <ColorizedText text={getValue() as string} />
                </Link>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "display_score",
        header: "Score",
        cell: (info) => (info.getValue() as number).toLocaleString(),
      },
    ],
    [],
  );

  return (
    <div className="container-xl p-4">
      <h1 className="page-title">Speedrun Leaderboard</h1>
      <p className="text-muted">Customizable speedrun leaderboard!</p>

      <Accordion id="speedrun-leaderboard-accordion">
        <AccordionItem id="one" title="Score calculation">
          {scoreCalculation}
        </AccordionItem>
      </Accordion>

      <div className="card mb-4 mt-4">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-3 align-items-end">
            <div>
              <label className="form-label">Levels</label>
              <div className="dropdown">
                <a
                  href="#"
                  className="btn dropdown-toggle"
                  data-bs-toggle="dropdown"
                >
                  {levelScope === "all"
                    ? "Every"
                    : levelScope === "official"
                      ? "Only Official"
                      : "Only Community"}
                </a>
                <div className="dropdown-menu">
                  <a
                    href="#"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      setLevelScope("all");
                    }}
                  >
                    Every
                  </a>
                  <a
                    href="#"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      setLevelScope("official");
                    }}
                  >
                    Only Official
                  </a>
                  <a
                    href="#"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      setLevelScope("community");
                    }}
                  >
                    Only Community
                  </a>
                </div>
              </div>
            </div>
            <div>
              <label className="form-label">Mode</label>
              <div className="dropdown">
                <a
                  href="#"
                  className={`btn dropdown-toggle ${levelScope === "community" ? "disabled" : ""
                    }`}
                  data-bs-toggle="dropdown"
                >
                  {playerMode === "all"
                    ? "1p & 2p"
                    : playerMode === "1p"
                      ? "Only 1p"
                      : "Only 2p"}
                </a>
                <div className="dropdown-menu">
                  <a
                    href="#"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlayerMode("all");
                    }}
                  >
                    1p & 2p
                  </a>
                  <a
                    href="#"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlayerMode("1p");
                    }}
                  >
                    Only 1p
                  </a>
                  <a
                    href="#"
                    className="dropdown-item"
                    onClick={(e) => {
                      e.preventDefault();
                      setPlayerMode("2p");
                    }}
                  >
                    Only 2p
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status"></div>
        </div>
      ) : (
        <>
          {lastUpdated && (
            <div className="mb-2 text-muted">
              Last updated at: {new Date(lastUpdated * 1000).toLocaleString()}
            </div>
          )}
          <DataTable
            key={`${levelScope}-${playerMode}`} // Force re-render on filter change to reset sorting state if needed, though filteredData handles it
            data={filteredData}
            columns={columns}
            defaultSort={[{ id: "display_score", desc: true }]}
            title="Speedrun Leaderboard"
          />
        </>
      )}
    </div>
  );
}
