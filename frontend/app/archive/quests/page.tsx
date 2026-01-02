"use client";

import { useEffect, useState } from "react";
import ColorizedText from "@/components/colorized-text";
import api from "@/lib/api";

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

type QuestsResponse = QuestsSuccessResponse | QuestsErrorResponse;

const kindNames: Record<number, string> = {
  0: "Reach score",
  1: "Destroy enemies",
  2: "Survive",
};

export default function QuestsArchivePage() {
  const [data, setData] = useState<QuestsData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [actualTimestamp, setActualTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
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
    }
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
            Data starts on April 10th 2025. Some days may be missing from the
            archive.
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

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status"></div>
        </div>
      ) : error ? (
        <div className="alert alert-warning">
          {error}. Data starts on April 10th 2025.
        </div>
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
                    <strong>Quest {index + 1}</strong>
                  </div>
                  <div className="card-body">
                    <p className="mb-1">
                      <strong>Type:</strong>{" "}
                      {kindNames[quest.kind] || `Kind: ${quest.kind}`}
                    </p>
                    <p className="mb-1">
                      <strong>Goal:</strong> {quest.goal}
                    </p>
                    <p className="mb-1">
                      <strong>XP:</strong> {quest.xp}
                    </p>
                    {quest.enemy && (
                      <p className="mb-1">
                        <strong>Enemy:</strong> {quest.enemy}
                      </p>
                    )}
                    <hr />
                    <p className="mb-1">
                      <strong>Levels:</strong>
                    </p>
                    <ul className="mb-0">
                      {quest.levels.map((level, i) => (
                        <li key={i}>
                          <ColorizedText text={level.name} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
