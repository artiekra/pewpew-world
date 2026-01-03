"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import api from "@/helpers/api";
import ColorizedText from "@/components/colorized-text";
import DataTable from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface UsernameChange {
  timestamp: number;
  new_name: string;
}

interface UsernameChangeHistoryResponse {
  player_uuid: string;
  changes: UsernameChange[];
}

interface LeaderboardPlacement {
  timestamp: number;
  placement: number | null;
  not_found: boolean;
}

interface PlayerLeaderboardPlacementsResponse {
  player_uuid: string;
  monthly_leaderboard: LeaderboardPlacement;
  xp_leaderboard: LeaderboardPlacement;
  blitz_leaderboard: LeaderboardPlacement;
}

interface XPHistoryEntry {
  timestamp: number;
  xp: number;
}

interface XPHistoryResponse {
  player_uuid: string;
  history: XPHistoryEntry[];
}

interface BlitzHistoryEntry {
  timestamp: number;
  bsr: number;
}

interface BlitzHistoryResponse {
  player_uuid: string;
  history: BlitzHistoryEntry[];
}

interface PlayerLevelScore {
  player_uuid: string;
  score: number;
  level_version: number;
  value_type: number;
  timestamp: number;
  country: string;
}

interface LevelScoresGroup {
  level_uuid: string;
  level_name: string;
  scores: PlayerLevelScore[];
}

interface ComparisonResponse {
  players: string[];
  levels: LevelScoresGroup[];
}

interface FlattenedScore {
  level_uuid: string;
  level_name: string;
  score: number;
  value_type: number;
  timestamp: number;
  country: string;
}

export default function PlayerProfilePage() {
  const { theme } = useTheme();
  const params = useParams();
  const uuid = params?.uuid as string;
  const [history, setHistory] = useState<UsernameChange[] | null>(null);
  const [placements, setPlacements] =
    useState<PlayerLeaderboardPlacementsResponse | null>(null);
  const [xpHistory, setXpHistory] = useState<XPHistoryEntry[] | null>(null);
  const [blitzHistory, setBlitzHistory] = useState<BlitzHistoryEntry[] | null>(
    null,
  );
  const [scores, setScores] = useState<FlattenedScore[] | null>(null);

  useEffect(() => {
    if (!uuid) return;

    api.get(`/v1/player/${uuid}/get_username_change_history`).then((res) => {
      setHistory(res.data.changes.reverse());
    });

    api.get(`/v1/player/${uuid}/get_leaderboard_placements`).then((res) => {
      setPlacements(res.data);
    });

    api.get(`/v1/player/${uuid}/get_xp_history`).then((res) => {
      setXpHistory(
        res.data.history.sort((a: any, b: any) => a.timestamp - b.timestamp),
      );
    });

    api.get(`/v1/player/${uuid}/get_blitz_history`).then((res) => {
      setBlitzHistory(
        res.data.history
          .map((h: any) => ({ ...h, bsr: h.bsr / 10 }))
          .sort((a: any, b: any) => a.timestamp - b.timestamp),
      );
    });

    api
      .get(`/v1/comparison/get_scores_by_level?player_uuids=${uuid}`)
      .then((res) => {
        if (res.data && res.data.levels) {
          const flatScores: FlattenedScore[] = [];
          res.data.levels.forEach((level: LevelScoresGroup) => {
            level.scores.forEach((score) => {
              flatScores.push({
                level_uuid: level.level_uuid,
                level_name: level.level_name,
                score: score.score,
                value_type: score.value_type,
                timestamp: score.timestamp,
                country: score.country,
              });
            });
          });
          setScores(flatScores);
        } else {
          setScores([]);
        }
      });
  }, [uuid]);

  const renderPlacement = (title: string, placement: LeaderboardPlacement) => {
    let cardStyle: React.CSSProperties = {};
    let medalColor = "";

    if (!placement.not_found) {
      if (placement.placement === 1) {
        medalColor = "#FFD700";
      } else if (placement.placement === 2) {
        medalColor = "#C0C0C0";
      } else if (placement.placement === 3) {
        medalColor = "#CD7F32";
      }

      if (medalColor) {
        cardStyle = {
          border: `4px solid ${medalColor}`,
          boxShadow: `0 0 15px ${medalColor}22`,
        };
      }
    }

    return (
      <div className="card card-sm h-100" style={cardStyle}>
        <div className="card-body">
          <div className="subheader">{title}</div>
          <div className="h3 m-0" style={{ color: medalColor || "inherit" }}>
            {placement.not_found ? (
              <span className="text-muted small">Not Ranked</span>
            ) : (
              `#${placement.placement}`
            )}
          </div>
          {!placement.not_found && (
            <div className="text-muted mt-1 small opacity-75">
              Updated:{" "}
              {new Date(placement.timestamp * 1000).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    );
  };

  const columns = useMemo<ColumnDef<FlattenedScore>[]>(
    () => [
      {
        accessorKey: "level_name",
        header: "Level",
        cell: ({ row }) => (
          <div className="text-truncate" style={{ maxWidth: "180px" }}>
            {row.original.value_type === 1 && (
              <span className="me-2" title="Speedrun">
                ⚡
              </span>
            )}
            <ColorizedText text={row.original.level_name} />
          </div>
        ),
      },
      {
        accessorKey: "score",
        header: "Score",
        cell: ({ row }) => {
          const val = row.original.score;
          if (row.original.value_type === 1) {
            const totalSeconds = Math.abs(val) / 30;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);
            const fraction = Math.round(
              (totalSeconds - Math.floor(totalSeconds)) * 100,
            );
            return `${minutes}:${seconds.toString().padStart(2, "0")}.${fraction.toString().padStart(2, "0")}`;
          }
          return val.toLocaleString();
        },
      },
      {
        accessorKey: "timestamp",
        header: "Date",
        cell: ({ row }) =>
          new Date(row.original.timestamp * 1000).toLocaleString(),
      },
    ],
    [],
  );

  const [showAllHistory, setShowAllHistory] = useState(false);

  const displayedHistory = history
    ? showAllHistory
      ? history
      : history.slice(0, 5)
    : [];
  const latestUsername =
    history && history.length > 0 ? history[0].new_name : null;

  return (
    <div className="container-xl p-4">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h2 className="page-title">
            {latestUsername ? (
              <ColorizedText text={latestUsername} />
            ) : (
              "Player Profile"
            )}
          </h2>
          <div className="text-muted mt-1">UUID: {uuid}</div>
        </div>
        <a href={`/compare?players=${uuid}`} className="btn">
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
            className="icon icon-tabler icons-tabler-outline icon-tabler-scale"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M7 20l10 0" />
            <path d="M6 6l6 -1l6 1" />
            <path d="M12 3l0 17" />
            <path d="M9 12l-3 -6l-3 6a3 3 0 0 0 6 0" />
            <path d="M21 12l-3 -6l-3 6a3 3 0 0 0 6 0" />
          </svg>
          Compare
        </a>
      </div>

      <div className="page-body">
        <div className="row row-cards mb-4">
          <div className="col-4">
            {placements ? (
              renderPlacement("Monthly", placements.monthly_leaderboard)
            ) : (
              <div className="card card-sm h-100">
                <div className="card-body">
                  <div className="subheader">Monthly</div>
                  <div className="h3 m-0">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading...
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="col-4">
            {placements ? (
              renderPlacement("XP", placements.xp_leaderboard)
            ) : (
              <div className="card card-sm h-100">
                <div className="card-body">
                  <div className="subheader">XP</div>
                  <div className="h3 m-0">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading...
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="col-4">
            {placements ? (
              renderPlacement("Blitz", placements.blitz_leaderboard)
            ) : (
              <div className="card card-sm h-100">
                <div className="card-body">
                  <div className="subheader">Blitz</div>
                  <div className="h3 m-0">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Loading...
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="row row-cards">
          {xpHistory && xpHistory.length >= 2 ? (
            <div className="col-md-6">
              <div className="card">
                <div className="card-body ps-0">
                  <div className="ps-3">
                    <div className="subheader mb-3">XP Growth</div>
                  </div>
                  <div
                    className="position-relative"
                    style={{ minHeight: "240px" }}
                  >
                    <Chart
                      options={{
                        chart: {
                          type: "area",
                          fontFamily: "inherit",
                          height: 240,
                          parentHeightOffset: 0,
                          toolbar: {
                            show: false,
                          },
                          animations: {
                            enabled: false,
                          },
                        },
                        dataLabels: {
                          enabled: false,
                        },
                        fill: {
                          colors: ["rgba(32, 107, 196, 0.16)"],
                          type: "solid",
                        },
                        stroke: {
                          width: 2,
                          lineCap: "round",
                          curve: "smooth",
                        },
                        tooltip: {
                          theme: "dark",
                          x: {
                            format: "dd MMM yyyy HH:mm",
                          },
                        },
                        grid: {
                          padding: {
                            top: -20,
                            right: 0,
                            left: -4,
                            bottom: -4,
                          },
                          strokeDashArray: 4,
                        },
                        xaxis: {
                          labels: {
                            style: {
                              colors:
                                theme === "dark"
                                  ? "rgba(255, 255, 255, 0.7)"
                                  : "rgba(0, 0, 0, 0.7)",
                            },
                          },
                          tooltip: {
                            enabled: false,
                          },
                          axisBorder: {
                            show: false,
                          },
                          type: "datetime",
                        },
                        yaxis: {
                          labels: {
                            formatter: (val) => val.toLocaleString(),
                            style: {
                              colors:
                                theme === "dark"
                                  ? "rgba(255, 255, 255, 0.7)"
                                  : "rgba(0, 0, 0, 0.7)",
                            },
                          },
                        },
                        colors: ["#206bc4"],
                      }}
                      series={[
                        {
                          name: "XP",
                          data: xpHistory.map((h) => ({
                            x: h.timestamp * 1000,
                            y: h.xp,
                          })),
                        },
                      ]}
                      type="area"
                      height={240}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : xpHistory === null ? (
            <div className="col-md-6">
              <div className="card">
                <div className="card-body ps-0">
                  <div className="ps-3">
                    <div className="subheader mb-3">XP Growth</div>
                  </div>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ minHeight: "240px" }}
                  >
                    <span className="spinner-border text-primary" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {blitzHistory && blitzHistory.length >= 2 ? (
            <div className="col-md-6">
              <div className="card">
                <div className="card-body ps-0">
                  <div className="ps-3">
                    <div className="subheader mb-3">Blitz Growth</div>
                  </div>
                  <div
                    className="position-relative"
                    style={{ minHeight: "240px" }}
                  >
                    <Chart
                      options={{
                        chart: {
                          type: "area",
                          fontFamily: "inherit",
                          height: 240,
                          parentHeightOffset: 0,
                          toolbar: {
                            show: false,
                          },
                          animations: {
                            enabled: false,
                          },
                        },
                        dataLabels: {
                          enabled: false,
                        },
                        fill: {
                          colors: ["rgba(174, 62, 201, 0.16)"],
                          type: "solid",
                        },
                        stroke: {
                          width: 2,
                          lineCap: "round",
                          curve: "smooth",
                        },
                        tooltip: {
                          theme: "dark",
                          x: {
                            format: "dd MMM yyyy HH:mm",
                          },
                        },
                        grid: {
                          padding: {
                            top: -20,
                            right: 0,
                            left: -4,
                            bottom: -4,
                          },
                          strokeDashArray: 4,
                        },
                        xaxis: {
                          labels: {
                            style: {
                              colors:
                                theme === "dark"
                                  ? "rgba(255, 255, 255, 0.7)"
                                  : "rgba(0, 0, 0, 0.7)",
                            },
                          },
                          tooltip: {
                            enabled: false,
                          },
                          axisBorder: {
                            show: false,
                          },
                          type: "datetime",
                        },
                        yaxis: {
                          labels: {
                            formatter: (val) =>
                              Math.round(val).toLocaleString(),
                            style: {
                              colors:
                                theme === "dark"
                                  ? "rgba(255, 255, 255, 0.7)"
                                  : "rgba(0, 0, 0, 0.7)",
                            },
                          },
                        },
                        colors: ["#ae3ec9"],
                      }}
                      series={[
                        {
                          name: "BSR",
                          data: blitzHistory.map((h) => ({
                            x: h.timestamp * 1000,
                            y: h.bsr,
                          })),
                        },
                      ]}
                      type="area"
                      height={240}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : blitzHistory === null ? (
            <div className="col-md-6">
              <div className="card">
                <div className="card-body ps-0">
                  <div className="ps-3">
                    <div className="subheader mb-3">Blitz Growth</div>
                  </div>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{ minHeight: "240px" }}
                  >
                    <span className="spinner-border text-primary" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {history && history.length > 1 ? (
          <div className="mt-4">
            <div className="subheader mb-2">Username History</div>
            <div className="text-muted small">
              {displayedHistory.map((change, index) => (
                <div key={index} className="mb-1">
                  {new Date(change.timestamp * 1000).toLocaleString()} -{" "}
                  <span className="fw-bold text-reset">
                    <ColorizedText text={change.new_name} />
                  </span>
                </div>
              ))}
            </div>
            {history.length > 5 && (
              <button
                className="btn btn-link btn-sm p-0 mt-1"
                onClick={() => setShowAllHistory(!showAllHistory)}
              >
                {showAllHistory
                  ? "Show less"
                  : `Show ${history.length - 5} more...`}
              </button>
            )}
          </div>
        ) : history === null ? (
          <div className="mt-4">
            <div className="subheader mb-2">Username History</div>
            <div className="text-muted small d-flex align-items-center">
              <span className="spinner-border spinner-border-sm me-2" />
              Loading...
            </div>
          </div>
        ) : null}

        {scores && scores.length > 0 ? (
          <div className="mt-4">
            <DataTable
              data={scores}
              columns={columns}
              title="Player Scores"
              defaultSort={[{ id: "timestamp", desc: true }]}
              showRowNumbers={false}
            />
          </div>
        ) : scores === null ? (
          <div className="mt-2 mb-4">
            <div className="subheader mb-2">Player Scores</div>
            <div className="text-muted small d-flex align-items-center">
              <span className="spinner-border spinner-border-sm me-2" />
              Loading...
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
