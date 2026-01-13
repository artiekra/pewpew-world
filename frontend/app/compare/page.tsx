"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import api from "@/helpers/api";
import { stripColorCodes } from "@/helpers/text-utils";
import ColorizedText from "@/components/colorized-text";
import DataTable from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";
import Papa from "papaparse";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface PlayerData {
  uuid: string;
  name: string;
  placements: PlayerLeaderboardPlacementsResponse | null;
  xpHistory: XPHistoryEntry[];
  blitzHistory: BlitzHistoryEntry[];
}

interface PlayerLeaderboardPlacementsResponse {
  player_uuid: string;
  monthly_leaderboard: LeaderboardPlacement;
  xp_leaderboard: LeaderboardPlacement;
  blitz_leaderboard: LeaderboardPlacement;
}

interface LeaderboardPlacement {
  timestamp: number;
  placement: number | null;
  not_found: boolean;
}

interface XPHistoryEntry {
  timestamp: number;
  xp: number;
}

interface BlitzHistoryEntry {
  timestamp: number;
  bsr: number;
}

interface ComparisonResponse {
  players: string[];
  levels: LevelScoresGroup[];
}

interface LevelScoresGroup {
  level_uuid: string;
  level_name: string;
  scores: PlayerLevelScore[];
}

interface PlayerLevelScore {
  player_uuid: string;
  score: number;
  level_version: number;
  value_type: number;
  timestamp: number;
  country: string;
}

interface ComparisonRow {
  level_uuid: string;
  level_name: string;
  value_type: number;
  [key: string]: any; // player_uuid -> { score: number, ... }
}

interface PlayerShortInfo {
  account_id: string;
  username: string;
}

interface GetUsernameResponse {
  player_uuid: string;
  username: string;
}

function CompareContent() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const playersParam = searchParams.get("players");
  const playerUuids = useMemo(
    () => (playersParam ? playersParam.split(",").filter((id) => id) : []),
    [playersParam],
  );

  const [playersData, setPlayersData] = useState<PlayerData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerShortInfo[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [showMobileList, setShowMobileList] = useState(false);

  useEffect(() => {
    api
      .get("/v1/data/get_players", { responseType: "text" })
      .then((res) => {
        Papa.parse(res.data, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedPlayers: PlayerShortInfo[] = results.data
              .map((row: any) => ({
                account_id: row.account_id || row.account_ids || "",
                username: row.username || "",
              }))
              .filter((p) => p.account_id && p.username);

            setAvailablePlayers(parsedPlayers);
          },
        });
      })
      .catch((err) => console.error("Error fetching players:", err));
  }, []);

  const filteredPlayers = useMemo(() => {
    if (!searchTerm) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return availablePlayers
      .filter((p) =>
        stripColorCodes(p.username).toLowerCase().includes(lowerSearch),
      )
      .slice(0, 50); // Show up to 50 matches
  }, [searchTerm, availablePlayers]);

  useEffect(() => {
    if (playerUuids.length === 0) {
      setLoading(false);
      return;
    }

    async function fetchAllData() {
      setLoading(true);
      try {
        // Fetch basic data for each player
        const playersPromises = playerUuids.map(async (uuid) => {
          const [placementsRes, xpRes, blitzRes, usernameRes] =
            await Promise.all([
              api.get(`/v1/player/${uuid}/get_leaderboard_placements`),
              api.get(`/v1/player/${uuid}/get_xp_history`),
              api.get(`/v1/player/${uuid}/get_blitz_history`),
              api.get(`/v1/player/${uuid}/get_username`),
            ]);

          const name = usernameRes.data.username;

          return {
            uuid,
            name,
            placements: placementsRes.data,
            xpHistory: xpRes.data.history.sort(
              (a: any, b: any) => a.timestamp - b.timestamp,
            ),
            blitzHistory: blitzRes.data.history
              .map((h: any) => ({ ...h, bsr: h.bsr / 10 }))
              .sort((a: any, b: any) => a.timestamp - b.timestamp),
          };
        });

        const fetchedPlayersData = await Promise.all(playersPromises);
        setPlayersData(fetchedPlayersData);

        // Fetch comparison scores if we have players
        if (playerUuids.length > 0) {
          const scoresRes = await api.get(
            `/v1/comparison/get_scores_by_level?player_uuids=${playerUuids.join("&player_uuids=")}`,
          );
          processComparisonData(scoresRes.data);
        }
      } catch (error) {
        console.error("Error fetching comparison data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, [playerUuids]);

  const processComparisonData = (data: ComparisonResponse) => {
    if (!data.levels) return;

    const rows: ComparisonRow[] = [];

    data.levels.forEach((level) => {
      // Group scores by value_type
      const scoresByType = new Map<number, PlayerLevelScore[]>();

      if (level.scores.length === 0) {
        const row: ComparisonRow = {
          level_uuid: level.level_uuid,
          level_name: level.level_name,
          value_type: 0,
        };
        rows.push(row);
      } else {
        level.scores.forEach((score) => {
          if (!scoresByType.has(score.value_type)) {
            scoresByType.set(score.value_type, []);
          }
          scoresByType.get(score.value_type)!.push(score);
        });

        scoresByType.forEach((scores, type) => {
          const row: ComparisonRow = {
            level_uuid: level.level_uuid,
            level_name: level.level_name,
            value_type: type,
          };

          scores.forEach((s) => {
            row[s.player_uuid] = {
              score: s.score,
              timestamp: s.timestamp,
            };
          });

          rows.push(row);
        });
      }
    });

    setComparisonData(rows);
  };

  const handleAddPlayer = (id: string) => {
    if (id && !playerUuids.includes(id)) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("players", [...playerUuids, id].join(","));
      router.push(`/compare?${newParams.toString()}`);
      setSearchTerm("");
      setAddingPlayer(false);
    }
  };

  const removePlayer = (uuidToRemove: string) => {
    const newUuids = playerUuids.filter((uuid) => uuid !== uuidToRemove);
    const newParams = new URLSearchParams(searchParams.toString());
    if (newUuids.length > 0) {
      newParams.set("players", newUuids.join(","));
    } else {
      newParams.delete("players");
    }
    router.push(`/compare?${newParams.toString()}`);
  };

  const getMedalColor = (placement: number | null) => {
    if (placement === 1) return "#FFD700";
    if (placement === 2) return "#C0C0C0";
    if (placement === 3) return "#CD7F32";
    return undefined;
  };

  // --- Render Helpers ---

  const renderLeaderboardComparison = () => {
    return (
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">Rankings</h3>
        </div>
        <div className="card-content">
          <div className="table-responsive ms-1">
            <table className="table table-vcenter">
              <thead>
                <tr>
                  <th>Leaderboard</th>
                  {playersData.map((p) => (
                    <th key={p.uuid} className="text-center">
                      <div className="d-flex flex-column align-items-center">
                        <ColorizedText text={p.name} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["Monthly", "XP", "Blitz"].map((lbType) => (
                  <tr key={lbType}>
                    <td>{lbType}</td>
                    {playersData.map((p) => {
                      let placement: LeaderboardPlacement | undefined;
                      if (lbType === "Monthly")
                        placement = p.placements?.monthly_leaderboard;
                      else if (lbType === "XP")
                        placement = p.placements?.xp_leaderboard;
                      else if (lbType === "Blitz")
                        placement = p.placements?.blitz_leaderboard;

                      const color = getMedalColor(placement?.placement || null);

                      return (
                        <td key={p.uuid} className="text-center">
                          {placement && !placement.not_found ? (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: color || "inherit",
                                color: color ? "#000" : "inherit",
                                border: color ? "none" : "inherit",
                                fontSize: "1.1em",
                              }}
                            >
                              #{placement.placement}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderCharts = () => {
    const xpSeries = playersData.map((p) => ({
      name: stripColorCodes(p.name),
      data: [
        ...p.xpHistory.map((h) => ({ x: h.timestamp * 1000, y: h.xp })),
        { x: new Date().getTime(), y: p.xpHistory[p.xpHistory.length - 1]?.xp },
      ],
    }));

    const blitzSeries = playersData.map((p) => ({
      name: stripColorCodes(p.name),
      data: [
        ...p.blitzHistory.map((h) => ({ x: h.timestamp * 1000, y: h.bsr })),
        {
          x: new Date().getTime(),
          y: p.blitzHistory[p.blitzHistory.length - 1]?.bsr,
        },
      ],
    }));

    const CHART_COLORS = [
      "#206bc4", // Blue
      "#ae3ec9", // Purple
      "#d63939", // Red
      "#f76707", // Orange
      "#f59f00", // Yellow
      "#74b816", // Lime
      "#e83e8c", // Pink
      "#343a40", // Dark Gray
      "#2fb344", // Green
      "#1098ad", // Teal
    ];

    const commonOptions: any = {
      chart: {
        type: "line",
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
      stroke: {
        width: 2,
        lineCap: "round",
        curve: "stepline",
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
      legend: {
        position: "top",
        labels: {
          colors: theme === "dark" ? "#fff" : "#000",
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5,
        },
        markers: {
          offsetX: -4,
        },
      },
      colors: CHART_COLORS,
    };

    return (
      <div className="row row-cards">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-body ps-0">
              <div className="ps-3">
                <div className="subheader mb-3">XP Growth</div>
              </div>
              <div className="position-relative" style={{ minHeight: "240px" }}>
                <Chart
                  options={{
                    ...commonOptions,
                    yaxis: {
                      labels: {
                        formatter: (val: number) => val.toLocaleString(),
                        style: {
                          colors:
                            theme === "dark"
                              ? "rgba(255, 255, 255, 0.7)"
                              : "rgba(0, 0, 0, 0.7)",
                        },
                      },
                    },
                  }}
                  series={xpSeries}
                  height={240}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-body ps-0">
              <div className="ps-3">
                <div className="subheader mb-3">Blitz Growth</div>
              </div>
              <div className="position-relative" style={{ minHeight: "240px" }}>
                <Chart
                  options={{
                    ...commonOptions,
                    yaxis: {
                      labels: {
                        formatter: (val: number) =>
                          Math.round(val).toLocaleString(),
                        style: {
                          colors:
                            theme === "dark"
                              ? "rgba(255, 255, 255, 0.7)"
                              : "rgba(0, 0, 0, 0.7)",
                        },
                      },
                    },
                  }}
                  series={blitzSeries}
                  height={240}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderScoresTable = () => {
    const cols: ColumnDef<ComparisonRow>[] = [
      {
        accessorKey: "level_name",
        header: "Level",
        cell: ({ row }) => (
          <div>
            <div className="text-truncate" style={{ maxWidth: "180px" }}>
              {row.original.value_type === 1 && (
                <span className="me-2" title="Speedrun">
                  ⚡
                </span>
              )}
              <ColorizedText text={row.original.level_name} />
            </div>
          </div>
        ),
      },
      ...playersData.map((p) => ({
        id: p.uuid,
        header: () => <ColorizedText text={p.name} />,
        cell: ({ row }: { row: any }) => {
          const pData = row.original[p.uuid];
          if (!pData) return <span className="text-muted">-</span>;

          // Determine color
          let color = "inherit";
          if (playersData.length >= 1) {
            const scores = playersData
              .map((pl) => row.original[pl.uuid]?.score)
              .filter((s) => s !== undefined);

            if (scores.length > 1) {
              const maxScore = Math.max(...scores);
              const minScore = Math.min(...scores);
              // For speedruns (value_type 1), scores are negated ticks.
              // So -100 (100 ticks) is > -200 (200 ticks). Max is best.
              // For normal scores (value_type 0), higher points is best. Max is best.

              const bestScore = maxScore;
              const worstScore = minScore;

              if (pData.score === bestScore) color = "var(--tblr-green)";
              else if (pData.score === worstScore) color = "var(--tblr-red)";
            }
          }

          let displayVal = pData.score.toLocaleString();
          if (row.original.value_type === 1) {
            const totalSeconds = (pData.score * -1) / 30; // Negate to get positive ticks, then divide by 30
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);
            const fraction = Math.round(
              (totalSeconds - Math.floor(totalSeconds)) * 100,
            );
            displayVal = `${minutes}:${seconds.toString().padStart(2, "0")}.${fraction.toString().padStart(2, "0")}`;
          }

          return (
            <span
              style={{
                color,
                fontWeight: color !== "inherit" ? "bold" : "normal",
              }}
            >
              {displayVal}
            </span>
          );
        },
      })),
    ];

    return (
      <DataTable
        data={comparisonData}
        columns={cols}
        title="Score Comparison"
        defaultSort={[{ id: "level_name", desc: false }]}
        showRowNumbers={false}
      />
    );
  };

  return (
    <div className="container-xl p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="page-title">Comparing</h2>
        <div className="d-flex gap-2">
          <div className="d-none d-md-flex gap-2 flex-wrap">
            {playersData.map((p) => (
              <div
                key={p.uuid}
                className="badge bg-blue-lt d-flex align-items-center gap-2 p-2"
              >
                <ColorizedText text={p.name} />
                <button
                  onClick={() => removePlayer(p.uuid)}
                  className="btn-close btn-close-white"
                  style={{ fontSize: "0.6rem" }}
                ></button>
              </div>
            ))}
          </div>
          <div className="d-md-none dropdown d-inline-block">
            <button
              className="btn dropdown-toggle"
              onClick={() => setShowMobileList(!showMobileList)}
            >
              {playersData.length} Selected
            </button>
            {showMobileList && (
              <div
                className="dropdown-menu show p-2 dropdown-menu-end"
                style={{ width: "150px", right: "auto" }}
              >
                {playersData.length === 0 && (
                  <span className="text-muted p-2 d-block text-center">
                    No players
                  </span>
                )}
                {playersData.map((p) => (
                  <div
                    key={p.uuid}
                    className="d-flex justify-content-between align-items-center mb-2 px-1"
                  >
                    <div
                      className="text-truncate"
                      style={{ maxWidth: "150px" }}
                    >
                      <ColorizedText text={p.name} />
                    </div>
                    <button
                      onClick={() => removePlayer(p.uuid)}
                      className="btn btn-sm btn-icon btn-ghost-danger"
                      title="Remove"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="icon icon-tabler icon-tabler-x"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M18 6l-12 12" />
                        <path d="M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="dropdown d-inline-block">
            <button
              className="btn btn-icon"
              onClick={() => setAddingPlayer(!addingPlayer)}
              title="Add Player"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="icon icon-tabler icon-tabler-plus"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M12 5l0 14" />
                <path d="M5 12l14 0" />
              </svg>
            </button>
            {addingPlayer && (
              <div
                className="dropdown-menu dropdown-menu-end dropdown-menu-card show"
                style={{ right: 0, left: "auto" }}
              >
                <div className="card">
                  <div className="card-body">
                    <h3 className="card-title">Add Player</h3>
                    <div className="mb-3">
                      <label className="form-label">Search by Username</label>
                      <input
                        type="text"
                        className="form-control"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Type to search..."
                        autoFocus
                      />
                    </div>
                    {searchTerm && (
                      <div
                        className="list-group list-group-flush border rounded-2"
                        style={{ maxHeight: "300px", overflowY: "auto" }}
                      >
                        {filteredPlayers.length > 0 ? (
                          filteredPlayers.map((p) => (
                            <button
                              key={p.account_id}
                              className="list-group-item list-group-item-action py-2"
                              onClick={() => handleAddPlayer(p.account_id)}
                            >
                              <ColorizedText text={p.username} />
                            </button>
                          ))
                        ) : (
                          <div className="list-group-item text-muted small p-2">
                            No matching players found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <div className="mt-2 text-muted">Loading players...</div>
        </div>
      ) : (
        <>
          {playersData.length >= 2 ? (
            <>
              {renderLeaderboardComparison()}
              {renderCharts()}
              {/* Only show scores if we have common levels */}
              {comparisonData.length > 0 && renderScoresTable()}
            </>
          ) : (
            <div className="alert alert-warning" role="alert">
              <div className="alert-icon">
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
                  className="icon alert-icon icon-2"
                >
                  <path d="M12 9v4" />
                  <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" />
                  <path d="M12 16h.01" />
                </svg>
              </div>
              <div>
                <h4 className="alert-heading">
                  {playersData.length === 0
                    ? "No players selected"
                    : "Not enough players"}
                </h4>
                <div className="alert-description">
                  At least 2 players must be selected to compare
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="container-xl p-4 text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <div className="mt-2 text-muted">Loading compare tool...</div>
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
