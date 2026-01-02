"use client";

import { useEffect, useState } from "react";
import ColorizedText from "@/components/colorized-text";
import api from "@/helpers/api";

interface QuestLevel {
  uuid: string;
  version: number;
  name: string;
}

interface Quest {
  kind: number;
  goal: number;
  levels: QuestLevel[];
  xp: number;
  enemy: string | null;
}

interface QuestsData {
  version: number;
  expiration: number;
  quests_id: number;
  quests: Quest[];
}

interface QuestsSuccessResponse {
  timestamp: number;
  data: QuestsData;
}

interface QuestsErrorResponse {
  detail: string;
}

interface UptimeDay {
  day: number;
  status: "full data" | "partially available" | "no data";
}

interface UptimeResponse {
  year: number;
  month: number;
  days: UptimeDay[];
}

const ARCHIVE_START_DATE = new Date(2025, 3, 10); // April 10th, 2025
const ARCHIVE_START_DAY = 10;
const ARCHIVE_START_MONTH = 3;
const ARCHIVE_START_YEAR = 2025;

type QuestsResponse = QuestsSuccessResponse | QuestsErrorResponse;

const kindNames: Record<number, string> = {
  0: "Reach score",
  1: "Destroy enemies",
  2: "Survive",
};

const enemyTypeNames: Record<string, string> = {
  ASTEROID: "Asteroids",
  BAF: "BAFs",
  INERTIAC: "Inertiacs",
  MOTHERSHIP: "Motherships",
  MOTHERSHIP_BULLET: "Mothership Bullets",
  ROLLING_CUBE: "Rolling Cubes",
  ROLLING_SPHERE: "Rolling Spheres",
  UFO: "UFOs",
  WARY: "Waries",
  CROWDER: "Crowders",
  CUSTOMIZABLE_ENTITY: "Customizable Entities",
  SHIP: "Ships",
  BOMB: "Bombs",
  BAF_BLUE: "Blue BAFs",
  BAF_RED: "Red BAFs",
  WARY_MISSILE: "Wary Missiles",
  UFO_BULLET: "UFO Bullets",
  SPINY: "Spinies",
  SUPER_MOTHERSHIP: "Super Motherships",
  PLAYER_BULLET: "Player Bullets",
  BOMB_EXPLOSION: "Bomb Explosions",
  PLAYER_EXPLOSION: "Player Explosions",
  BONUS: "Bonuses",
  FLOATING_MESSAGE: "Floating Messages",
  POINTONIUM: "Pointonium",
  KAMIKAZE: "Kamikazes",
  BONUS_IMPLOSION: "Bonus Implosions",
  MACE: "Maces",
  PLASMA_FIELD: "Plasma Fields",
  LASERBEAM: "Laserbeams",
  EXPLODER: "Exploders",
  EXPLODER_EXPLOSION: "Exploder Explosions",
  WEAPON_ZONE: "Weapon Zones",
};

export default function QuestsArchivePage() {
  const [data, setData] = useState<QuestsData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [actualTimestamp, setActualTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uptimeData, setUptimeData] = useState<UptimeResponse | null>(null);

  const fetchData = async (year: number, month: number, day: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<QuestsResponse>(
        `/v1/archive/quests/${year}/${month}/${day}`,
      );
      if ("data" in response.data) {
        setData(response.data.data);
        setActualTimestamp(response.data.timestamp);
      } else {
        setData(null);
        setActualTimestamp(null);
        setError(response.data.detail);
      }
    } catch (err) {
      console.error("Failed to fetch quests:", err);
      setError("Data not available");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUptimeData = async (year: number, month: number) => {
    try {
      const response = await api.get<UptimeResponse>(
        `/v1/archive/uptime/quests/${year}/${month}`,
      );
      setUptimeData(response.data);
    } catch (err) {
      console.error("Failed to fetch uptime data:", err);
      setUptimeData(null);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "full data":
        return "bg-success";
      case "partially available":
        return "bg-warning";
      case "no data":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  const getStatusTitle = (status: string) => {
    switch (status) {
      case "full data":
        return "Fully Available";
      case "partially available":
        return "Partially Available";
      case "no data":
        return "Downtime";
      default:
        return status;
    }
  };

  const calculateAvailability = () => {
    if (!uptimeData || uptimeData.days.length === 0) return 0;
    const now = new Date();
    const isCurrentOrFutureMonth =
      uptimeData.year > now.getFullYear() ||
      (uptimeData.year === now.getFullYear() &&
        uptimeData.month > now.getMonth() + 1) ||
      (uptimeData.year === now.getFullYear() &&
        uptimeData.month === now.getMonth() + 1);
    const currentDay = now.getDate();

    const relevantDays = uptimeData.days.filter((d) => {
      if (uptimeData.year < ARCHIVE_START_YEAR) return false;
      if (uptimeData.year > ARCHIVE_START_YEAR) return true;
      if (uptimeData.month < ARCHIVE_START_MONTH + 1) return false;
      if (uptimeData.month > ARCHIVE_START_MONTH + 1) return true;
      return d.day >= ARCHIVE_START_DAY;
    });

    if (relevantDays.length === 0) return 0;
    const fullDataDays = relevantDays.filter(
      (d) => d.status === "full data",
    ).length;
    return ((fullDataDays / relevantDays.length) * 100).toFixed(1);
  };

  const renderTrackingBlocks = () => {
    if (!uptimeData) return null;
    const now = new Date();
    const isCurrentOrFutureMonth =
      uptimeData.year > now.getFullYear() ||
      (uptimeData.year === now.getFullYear() &&
        uptimeData.month > now.getMonth() + 1) ||
      (uptimeData.year === now.getFullYear() &&
        uptimeData.month === now.getMonth() + 1);
    const currentDay = now.getDate();
    const isBeforeArchiveStart =
      uptimeData.year < ARCHIVE_START_YEAR ||
      (uptimeData.year === ARCHIVE_START_YEAR &&
        uptimeData.month < ARCHIVE_START_MONTH + 1);

    const isInArchiveMonth =
      uptimeData.year === ARCHIVE_START_YEAR &&
      uptimeData.month === ARCHIVE_START_MONTH + 1;

    return uptimeData.days.map((day) => {
      const isFutureDay =
        isCurrentOrFutureMonth &&
        day.status === "no data" &&
        day.day > currentDay;
      const isBeforeArchive =
        isBeforeArchiveStart ||
        (isInArchiveMonth &&
          day.status === "no data" &&
          day.day < ARCHIVE_START_DAY);

      const isEmpty = isFutureDay || isBeforeArchive;

      return (
        <div
          key={day.day}
          className={`tracking-block ${isEmpty ? "" : getStatusClass(day.status)}`}
          data-bs-toggle={isEmpty ? undefined : "tooltip"}
          data-bs-placement={isEmpty ? undefined : "top"}
          title={isEmpty ? undefined : getStatusTitle(day.status)}
        ></div>
      );
    });
  };

  const renderQuestKindBadge = (kind: number) => {
    switch (kind) {
      case 0:
        return (
          <span className="badge bg-red-lt text-red-lt-fg">
            Destroy Enemies
          </span>
        );
      case 1:
        return (
          <span className="badge bg-green-lt text-green-lt-fg">
            Reach Score
          </span>
        );
      case 2:
        return (
          <span className="badge bg-azure-lt text-azure-lt-fg">Survive</span>
        );
      default:
        return <span className="badge bg-secondary-lt">Kind: {kind}</span>;
    }
  };

  const formatEnemyName = (enemy: string | null) => {
    if (!enemy) return "";
    return enemyTypeNames[enemy] || enemy;
  };

  useEffect(() => {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    setSelectedDate(localIso);

    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    fetchData(year, month, day);
    fetchUptimeData(year, month);
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    setSelectedDate(dateStr);
    if (dateStr) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      fetchData(year, month, day);
      fetchUptimeData(year, month);
    }
  };

  const isValidDate = () => {
    if (!selectedDate) return true;
    const date = new Date(selectedDate);
    const now = new Date();
    const archiveStart = new Date(
      ARCHIVE_START_YEAR,
      ARCHIVE_START_MONTH,
      ARCHIVE_START_DAY,
    );
    return date <= now && date >= archiveStart;
  };

  const getDateWarning = () => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate);
    const now = new Date();
    const archiveStart = new Date(
      ARCHIVE_START_YEAR,
      ARCHIVE_START_MONTH,
      ARCHIVE_START_DAY,
    );
    if (date > now) {
      return "Cannot view future dates in the archive.";
    }
    if (date < archiveStart) {
      return `Archive data starts on ${ARCHIVE_START_DATE.toLocaleDateString()}.`;
    }
    return null;
  };

  return (
    <div className="container-xl p-4">
      <h1 className="page-title">Quests Archive</h1>
      <p className="text-muted">
        Take a look in the past, what quests were available on a specific day!
      </p>
      <div className="alert alert-info" role="alert">
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
            <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
            <path d="M12 9h.01" />
            <path d="M11 12h1v4h1" />
          </svg>
        </div>
        <div>
          <h4 className="alert-heading">Archive details</h4>
          <div className="alert-description">
            Data starts on {ARCHIVE_START_DATE.toLocaleDateString()}. Some days
            may be missing from the archive.
          </div>
        </div>
      </div>
      <div className="mt-4 mb-4">
        <label className="form-label">Select Date</label>
        <input
          type="date"
          className="form-control"
          value={selectedDate}
          onChange={handleDateChange}
        />
      </div>

      {!isValidDate() ? (
        <div className="alert alert-warning">{getDateWarning()}</div>
      ) : (
        <>
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="subheader">Archive availability</div>
                <div className="ms-auto lh-1 text-muted">
                  {uptimeData
                    ? `${new Date(
                      uptimeData.year,
                      uptimeData.month - 1,
                    ).toLocaleString("default", {
                      month: "long",
                    })} ${uptimeData.year}`
                    : "Loading..."}
                </div>
              </div>
              <div className="d-flex align-items-baseline">
                <div className="h1 mb-3 me-2">{calculateAvailability()}%</div>
              </div>
              <div className="mt-2">
                <div className="tracking">{renderTrackingBlocks()}</div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status"></div>
            </div>
          ) : error ? (
            <div className="alert alert-warning">{error}.</div>
          ) : data && actualTimestamp !== null ? (
            <>
              <p className="text-muted">
                Showing quests for{" "}
                {new Date(actualTimestamp * 1000).toLocaleString()} (snapped at{" "}
                {actualTimestamp})
              </p>
              <div className="card mb-4">
                <div className="card-body">
                  <h3>Quests #{data.quests_id}</h3>
                  <p className="text-secondary">
                    Expires: {new Date(data.expiration * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="row">
                {data.quests.map((quest, index) => (
                  <div key={index} className="col-md-4 mb-3">
                    <div className="card h-100">
                      <div className="card-header">
                        <strong>
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
                            className="icon icon-tabler icons-tabler-outline icon-tabler-target-arrow me-2"
                          >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                            <path d="M12 7a5 5 0 1 0 5 5" />
                            <path d="M13 3.055a9 9 0 1 0 7.941 7.945" />
                            <path d="M15 6v3h3l3 -3h-3v-3l-3 3" />
                            <path d="M15 9l-3 3" />
                          </svg>
                          Quest {index + 1}
                        </strong>
                      </div>
                      <div className="card-body">
                        <div
                          className="datagrid"
                          style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
                        >
                          <div className="datagrid-item">
                            <div className="datagrid-title">Type</div>
                            <div className="datagrid-content">
                              {renderQuestKindBadge(quest.kind)}
                            </div>
                          </div>
                          <div className="datagrid-item">
                            <div className="datagrid-title">Goal</div>
                            <div className="datagrid-content">
                              {quest.kind === 2
                                ? `${quest.goal / 30}s`
                                : quest.kind === 0
                                  ? `${quest.goal} ${formatEnemyName(quest.enemy)}`
                                  : quest.goal}
                            </div>
                          </div>
                          <div className="datagrid-item">
                            <div className="datagrid-title">XP</div>
                            <div className="datagrid-content">{quest.xp}</div>
                          </div>
                          {quest.enemy && quest.kind !== 0 && (
                            <div className="datagrid-item">
                              <div className="datagrid-title">Enemy</div>
                              <div className="datagrid-content">
                                {formatEnemyName(quest.enemy)}
                              </div>
                            </div>
                          )}
                          <div className="datagrid-item">
                            <div className="datagrid-title">Level</div>
                            <div className="datagrid-content">
                              {quest.levels && quest.levels.length > 0 ? (
                                <ColorizedText text={quest.levels[0].name} />
                              ) : (
                                "Any official level"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
