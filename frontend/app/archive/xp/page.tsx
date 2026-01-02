"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "@/components/data-table";
import ColorizedText from "@/components/colorized-text";
import api from "@/lib/api";

interface XPEntry {
  acc: string;
  name: string;
  xp: number;
}

interface XPSuccessResponse {
  timestamp: number;
  data: XPEntry[];
}

interface XPErrorResponse {
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

const ARCHIVE_START_DATE = new Date(2025, 3, 9); // April 9th, 2025
const ARCHIVE_START_DAY = 9;
const ARCHIVE_START_MONTH = 3;
const ARCHIVE_START_YEAR = 2025;

type XPResponse = XPSuccessResponse | XPErrorResponse;

const columns: ColumnDef<XPEntry>[] = [
  {
    accessorKey: "name",
    header: "Player",
    cell: (info) => <ColorizedText text={info.getValue() as string} />,
  },
  {
    accessorKey: "xp",
    header: "XP",
    cell: (info) => (info.getValue() as number).toLocaleString(),
  },
];

export default function XPLeaderboardPage() {
  const [data, setData] = useState<XPEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [actualTimestamp, setActualTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uptimeData, setUptimeData] = useState<UptimeResponse | null>(null);

  const fetchData = async (timestamp: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<XPResponse>(
        `/v1/archive/xp_leaderboard/${timestamp}`,
      );
      if ("data" in response.data) {
        setData(response.data.data);
        setActualTimestamp(response.data.timestamp);
      } else {
        setData([]);
        setActualTimestamp(null);
        setError(response.data.detail);
      }
    } catch (err) {
      console.error("Failed to fetch XP leaderboard:", err);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUptimeData = async (year: number, month: number) => {
    try {
      const response = await api.get<UptimeResponse>(
        `/v1/archive/uptime/xp_leaderboard/${year}/${month}`,
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
    const isBeforeArchiveStart =
      uptimeData.year < ARCHIVE_START_YEAR ||
      (uptimeData.year === ARCHIVE_START_YEAR &&
        uptimeData.month < ARCHIVE_START_MONTH + 1);

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

  useEffect(() => {
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setSelectedDate(localIso);

    const timestamp = Math.floor(now.getTime() / 1000);
    fetchData(timestamp);

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    fetchUptimeData(currentYear, currentMonth);
  }, []);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    setSelectedDate(dateStr);
    if (dateStr) {
      const date = new Date(dateStr);
      const timestamp = Math.floor(date.getTime() / 1000);
      fetchData(timestamp);
      fetchUptimeData(date.getFullYear(), date.getMonth() + 1);
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
      <h1 className="page-title">XP Leaderboard Archive</h1>
      <p className="text-muted">
        Take a look in the past, how the XP Leaderboard looked like!
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
            Data starts on {ARCHIVE_START_DATE.toLocaleDateString()}. Server
            doesn't save the leaderboard every minute, you will get the closest
            snapshot of data to the time you select below. If there is a big
            difference between the date you selected and the snapshot you get,
            it is probably because the server was experiencing downtime.
          </div>
          <div className="alert-description">
            The website is going to show how the leaderboard looked like on
            selected date and time, <b>your timezone</b>.
          </div>
        </div>
      </div>
      <div className="mt-4 mb-4">
        <label className="form-label">Select Date & Time</label>
        <input
          type="datetime-local"
          className="form-control"
          value={selectedDate}
          onChange={handleDateChange}
        />
      </div>

      {!isValidDate() ? (
        <div className="alert alert-warning">{getDateWarning()}</div>
      ) : (
        <>
          <div class="card mb-4">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="subheader">Archive availability</div>
                <div class="ms-auto lh-1 text-muted">
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
              <div class="d-flex align-items-baseline">
                <div class="h1 mb-3 me-2">{calculateAvailability()}%</div>
              </div>
              <div class="mt-2">
                <div class="tracking">{renderTrackingBlocks()}</div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status"></div>
            </div>
          ) : error ? (
            <div className="alert alert-warning">
              {error}. You can only select months starting with August 2025.
            </div>
          ) : actualTimestamp !== null ? (
            <>
              <p className="text-muted">
                Showing data for{" "}
                {new Date(actualTimestamp * 1000).toLocaleString()} your
                timezone (snapped at {actualTimestamp})
              </p>
              <DataTable
                data={data}
                columns={columns}
                defaultSort={[{ id: "xp", desc: true }]}
                title="XP Leaderboard"
              />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
