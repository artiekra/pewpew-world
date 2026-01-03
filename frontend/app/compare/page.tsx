"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import api from "@/helpers/api";
import ColorizedText from "@/components/colorized-text";
import DataTable from "@/components/data-table";
import { ColumnDef } from "@tanstack/react-table";
import dynamic from "next/dynamic";

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

export default function ComparePage() {
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
  const [newPlayerId, setNewPlayerId] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);

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
          const [historyRes, placementsRes, xpRes, blitzRes] =
            await Promise.all([
              api.get(`/v1/player/${uuid}/get_username_change_history`),
              api.get(`/v1/player/${uuid}/get_leaderboard_placements`),
              api.get(`/v1/player/${uuid}/get_xp_history?sample_rate=1200`),
              api.get(`/v1/player/${uuid}/get_blitz_history?sample_rate=60`),
            ]);

          const history = historyRes.data.changes;
          const name =
            history.length > 0
              ? history[history.length - 1].new_name
              : "Unknown";

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

    const rows: ComparisonRow[] = data.levels.map((level) => {
      const row: ComparisonRow = {
        level_uuid: level.level_uuid,
        level_name: level.level_name,
        value_type: level.scores.length > 0 ? level.scores[0].value_type : 0,
      };

      level.scores.forEach((score) => {
        row[score.player_uuid] = {
          score: score.score,
          timestamp: score.timestamp,
        };
      });

      return row;
    });

    setComparisonData(rows);
  };

  const handleAddPlayer = () => {
    if (newPlayerId && !playerUuids.includes(newPlayerId)) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("players", [...playerUuids, newPlayerId].join(","));
      router.push(`/compare?${newParams.toString()}`);
      setNewPlayerId("");
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
        <div className="table-responsive">
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
                              backgroundColor: color || "#f0f0f0",
                              color: color ? "#000" : "inherit",
                              border: color ? "none" : "1px solid #ccc",
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
    );
  };

  const renderCharts = () => {
    const xpSeries = playersData.map((p) => ({
      name: p.name, // We'll assume simple text name for chart legend for now
      data: p.xpHistory.map((h) => ({ x: h.timestamp * 1000, y: h.xp })),
    }));

    const blitzSeries = playersData.map((p) => ({
      name: p.name,
      data: p.blitzHistory.map((h) => ({ x: h.timestamp * 1000, y: h.bsr })),
    }));

    return (
      <div className="row row-cards mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">XP Growth</h3>
              <Chart
                options={{
                  chart: {
                    type: "line",
                    height: 300,
                    toolbar: { show: false },
                  },
                  xaxis: { type: "datetime" },
                  stroke: { curve: "smooth", width: 2 },
                  legend: { position: "top" },
                  theme: { mode: "light" }, // Adjust based on theme if needed
                }}
                series={xpSeries}
                type="line"
                height={300}
              />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Blitz Growth</h3>
              <Chart
                options={{
                  chart: {
                    type: "line",
                    height: 300,
                    toolbar: { show: false },
                  },
                  xaxis: { type: "datetime" },
                  stroke: { curve: "smooth", width: 2 },
                  legend: { position: "top" },
                }}
                series={blitzSeries}
                type="line"
                height={300}
              />
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
            {row.original.value_type === 1 && (
              <span className="me-2" title="Speedrun">
                ⚡
              </span>
            )}
            <ColorizedText text={row.original.level_name} />
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
          if (playersData.length >= 2) {
            const scores = playersData
              .map((pl) => row.original[pl.uuid]?.score)
              .filter((s) => s !== undefined);

            if (scores.length > 1) {
              const maxScore = Math.max(...scores);
              const minScore = Math.min(...scores);
              // Note: For speedruns (value_type 1), lower is better?
              // Assuming standard points for now. Wait, usually speedrun is lower is better.
              // But the API returns scores, and usually for leaderboards, higher is better?
              // Actually, let's check value_type 1.
              // In previous code:
              // "if (row.original.value_type === 1) { const totalSeconds = Math.abs(val) / 30; ... }"
              // This implies value is frames (int). Lower frames is better for time.
              // If standard score, bigger is better.

              const isSpeedrun = row.original.value_type === 1;

              // If speedrun, min value (frames) is best (green), max is worst (red)
              // If regular score, max value is best (green), min is worst (red)

              // Adjust logic:
              const bestScore = isSpeedrun ? minScore : maxScore;
              const worstScore = isSpeedrun ? maxScore : minScore;

              if (pData.score === bestScore) color = "var(--tblr-green)";
              else if (pData.score === worstScore) color = "var(--tblr-red)";
            }
          }

          let displayVal = pData.score.toLocaleString();
          if (row.original.value_type === 1) {
            const totalSeconds = Math.abs(pData.score) / 30;
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
        <h2 className="page-title">Player Comparison</h2>
        <div className="d-flex gap-2">
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
          <div className="dropdown d-inline-block">
            <button
              className="btn btn-outline-primary btn-icon"
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
                className="dropdown-menu show p-3"
                style={{ width: "300px", right: 0, left: "auto" }}
              >
                <div className="mb-2">
                  <label className="form-label">Player UUID</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newPlayerId}
                    onChange={(e) => setNewPlayerId(e.target.value)}
                    placeholder="Enter UUID"
                  />
                </div>
                <button
                  className="btn btn-primary w-100"
                  onClick={handleAddPlayer}
                >
                  Add
                </button>
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
          {playersData.length > 0 ? (
            <>
              {renderLeaderboardComparison()}
              {renderCharts()}
              {/* Only show scores if we have common levels */}
              {comparisonData.length > 0 && renderScoresTable()}
            </>
          ) : (
            <div className="empty">
              <div className="empty-header">No players selected</div>
              <p className="empty-title">Add players to start comparing</p>
              <div className="empty-action">
                <button
                  className="btn btn-primary"
                  onClick={() => setAddingPlayer(true)}
                >
                  Add Player
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
