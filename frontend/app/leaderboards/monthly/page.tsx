"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import ChevronButton from "@/components/chevron-button";
import Accordion, { AccordionItem } from "@/components/accordion";
import DataTable from "@/components/data-table";
import ColorizedText from "@/components/colorized-text";
import api from "@/lib/api";

interface LeaderboardEntry {
  player_uuid: string;
  player_name: string;
  country: string;
  score: number;
  wrs: number;
  average_place: number;
}

interface LevelInfo {
  uuid: string;
  name: string;
}

interface MonthlyResponse {
  timestamp: number;
  levels: LevelInfo[];
  leaderboard: LeaderboardEntry[];
}

// Helper to convert ISO 2-letter code to Emoji Flag
const getFlagEmoji = (countryCode: string) => {
  if (!countryCode) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const columns: ColumnDef<LeaderboardEntry>[] = [
  {
    accessorKey: "player_name",
    header: "Player",
    cell: ({ row, getValue }) => {
      const countryCode = row.original.country;
      const flag = getFlagEmoji(countryCode);

      return (
        <div className="d-flex align-items-center">
          <span
            className="me-2 user-select-none"
            title={countryCode}
            style={{ fontSize: "1em" }}
          >
            {flag}
          </span>
          {/* <span className="badge bg-blue-lt me-2">{countryCode}</span> */}
          <ColorizedText text={getValue() as string} />
        </div>
      );
    },
  },
  {
    accessorKey: "score",
    header: "Score",
    cell: (info) => (info.getValue() as number).toLocaleString(),
  },
  {
    accessorKey: "wrs",
    header: "WRs",
  },
  {
    accessorKey: "average_place",
    header: "Avg Place",
    cell: (info) => Number(info.getValue()).toFixed(2),
  },
];

const levelSelectionRules = (
  <>
    <p>
      1. Only community levels will be used in the pool (apart from Just Pong,
      Pew Pong, Simon Says, Inertiacs spawner, Pacifism Live, Inertiac World).
    </p>
    <p>
      2. Levels used in previous 2 monthly leaderboards won&apos;t be in the
      pool.
    </p>
    <p>3. Levels are selected randomly from all possible options.</p>
    <p>
      4. All time scores are used in the leaderboards, not only scores from this
      month.
    </p>
  </>
);

const scoreCalculation = (
  <>
    <p>
      Player is given a score, depending on their place in the level&apos;s
      leaderboard. Score for each level is summed up and score is assigned to
      the player. Score is given only to first 25 players in the leaderboard of
      each level.
    </p>
    <p>Scores for each place are:</p>
    <p>1-4: 2500-1750</p>
    <p>5-10: 1625-1000</p>
    <p>11-25: 950-250</p>
  </>
);

export default function MonthlyLeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get<MonthlyResponse>(
          "/v1/get_monthly_leaderboard",
        );
        setData(response.data.leaderboard);
        setLevels(response.data.levels);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container-xl p-4">
      <h1 className="page-title">Monthly Leaderboard</h1>
      <p className="text-muted">Exclusive to this website!</p>
      <p>
        This is a monthly leaderboard. It tracks scores in a set of 5 levels,
        which changes every month.
      </p>
      <p>
        Play these levels and practise your skills! Best 3 players in the end of
        the month will get special badge, which tracks amount of wins in the
        monthly leaderboard.
      </p>
      <div className="btn-list">
        <ChevronButton label="Leaderboard Archive" />
        <ChevronButton label="Past levels" />
      </div>

      <Accordion id="monthly-leaderboard-accordion">
        <AccordionItem id="one" title="Level selection rules">
          {levelSelectionRules}
        </AccordionItem>
        <AccordionItem id="two" title="Score calculation">
          {scoreCalculation}
        </AccordionItem>
      </Accordion>

      <div className="hr-text">leaderboard</div>

      <div className="card mb-4">
        <div className="card-body">
          <h3 className="card-title">Levels this month</h3>
          <p className="text-secondary">
            {isLoading ? (
              <span
                className="spinner-border spinner-border-sm ms-2"
                role="status"
              ></span>
            ) : (
              <span>
                {levels.map((l, i) => (
                  <span key={l.uuid}>
                    {i > 0 && "; "}
                    <ColorizedText text={l.name} />
                  </span>
                ))}
              </span>
            )}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status"></div>
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          defaultSort={[{ id: "score", desc: true }]}
          title="Monthly Leaderboard"
        />
      )}
    </div>
  );
}
