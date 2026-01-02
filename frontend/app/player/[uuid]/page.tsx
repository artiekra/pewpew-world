"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import api from "@/helpers/api";
import ColorizedText from "@/components/colorized-text";
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

export default function PlayerProfilePage() {
  const params = useParams();
  const uuid = params?.uuid as string;
  const [history, setHistory] = useState<UsernameChange[]>([]);
  const [placements, setPlacements] =
    useState<PlayerLeaderboardPlacementsResponse | null>(null);
  const [xpHistory, setXpHistory] = useState<XPHistoryEntry[]>([]);
  const [blitzHistory, setBlitzHistory] = useState<BlitzHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!uuid) return;

    const startTime = Date.now();
    const expectedDuration = 2900;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress((prev) => {
        if (prev >= 95) return 95;
        const target = Math.min((elapsed / expectedDuration) * 95, 95);
        return Math.max(prev, target);
      });
    }, 50);

    async function fetchData() {
      try {
        const [historyRes, placementsRes, xpRes, blitzRes] = await Promise.all([
          api.get(`/v1/player/${uuid}/get_username_change_history`),
          api.get(`/v1/player/${uuid}/get_leaderboard_placements`),
          api.get(`/v1/player/${uuid}/get_xp_history?sample_rate=1200`),
          api.get(`/v1/player/${uuid}/get_blitz_history?sample_rate=60`),
        ]);

        setHistory(historyRes.data.changes.reverse());
        setPlacements(placementsRes.data);
        setXpHistory(
          xpRes.data.history.sort(
            (a: any, b: any) => a.timestamp - b.timestamp,
          ),
        );
        setBlitzHistory(
          blitzRes.data.history
            .map((h: any) => ({ ...h, bsr: h.bsr / 10 }))
            .sort((a: any, b: any) => a.timestamp - b.timestamp),
        );
      } catch (error) {
        console.error("Failed to fetch player data:", error);
      } finally {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
        }, 400);
      }
    }

    fetchData();

    return () => clearInterval(progressInterval);
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

  const [showAllHistory, setShowAllHistory] = useState(false);

  const displayedHistory = showAllHistory ? history : history.slice(0, 5);
  const latestUsername = history.length > 0 ? history[0].new_name : null;

  return (
    <div className="container-xl p-4">
      <h2 className="page-title">
        {latestUsername ? (
          <ColorizedText text={latestUsername} />
        ) : (
          "Player Profile"
        )}
      </h2>
      <div className="text-muted mt-1">UUID: {uuid}</div>

      <div className="page-body">
        {loading ? (
          <div className="row justify-content-center mt-6">
            <div className="col-md-8 col-lg-6 text-center">
              <div className="mb-4">
                <span className="text-muted h4 fw-normal">
                  Getting Player Data...{" "}
                  <span className="fw-bold">{Math.round(progress)}%</span>
                </span>
              </div>
              <div
                className="progress progress-sm mb-3"
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  background: "rgba(0,0,0,0.05)",
                }}
              >
                <div
                  className="progress-bar bg-primary progress-bar-striped progress-bar-animated"
                  style={{
                    width: `${progress}%`,
                    transition: "width 0.3s ease-out",
                    boxShadow: "0 0 10px rgba(32, 107, 196, 0.4)",
                  }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {placements && (
              <div className="row row-cards mb-4">
                <div className="col-4">
                  {renderPlacement("Monthly", placements.monthly_leaderboard)}
                </div>
                <div className="col-4">
                  {renderPlacement("XP", placements.xp_leaderboard)}
                </div>
                <div className="col-4">
                  {renderPlacement("Blitz", placements.blitz_leaderboard)}
                </div>
              </div>
            )}

            <div className="row row-cards">
              {xpHistory.length >= 2 && (
                <div className="col-md-6">
                  <div className="card mb-4">
                    <div className="card-body">
                      <div className="subheader mb-3">XP Growth</div>
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
                              labels: {},
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
              )}

              {blitzHistory.length >= 2 && (
                <div className="col-md-6">
                  <div className="card mb-4">
                    <div className="card-body">
                      <div className="subheader mb-3">Blitz Growth</div>
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
                              labels: {},
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
              )}
            </div>

            {history.length > 1 && (
              <div className="mt-2">
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
