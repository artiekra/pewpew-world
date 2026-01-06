"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import ChevronButton from "@/components/chevron-button";
import Accordion, { AccordionItem } from "@/components/accordion";
import DataTable from "@/components/data-table";
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

interface LevelInfo {
  uuid: string;
  name: string;
}

interface MonthlyResponse {
  timestamp: number;
  levels: LevelInfo[];
  leaderboard: LeaderboardEntry[];
}

// Helper to get Tabler flag class
const getFlagClass = (countryCode: string) => {
  if (!countryCode) return "";
  return `flag h-3 flag-country-${countryCode.toLowerCase()}`;
};

const columns: ColumnDef<LeaderboardEntry>[] = [
  {
    accessorKey: "player_name",
    header: "Player",
    cell: ({ row, getValue }) => {
      const countryCode = row.original.country;
      const uuid = row.original.player_uuid;

      return (
        <div className="d-flex align-items-center">
          {countryCode && (
            <span
              className={`me-2 user-select-none ${getFlagClass(
                countryCode,
              )}`}
              title={countryCode}
            ></span>
          )}
          {/* <span className="badge bg-blue-lt me-2">{countryCode}</span> */}
          <Link href={`/player/${uuid}`} className="player-link text-reset">
            <ColorizedText text={getValue() as string} />
          </Link>
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

const credits = (
  <>
    <p>
      Original monthly leaderboards were a collaboration between{" "}
      <a href="https://github.com/artiekra">me</a> and{" "}
      <a href="https://github.com/glebi574">glebi574</a>. Thanks to glebi574 for
      the idea and original implementation of score calculation script, which
      can be found{" "}
      <a href="https://github.com/glebi574/ppl-process-scores">here</a>.
    </p>
    <p>
      New script replacing the old monthly leaderboard calculations can be found{" "}
      <a href="https://github.com/artiekra/pewpew-world/blob/main/data/modules/monthly_lb_daily.py">
        here
      </a>
      .
    </p>
    <p>
      Monthly leaderboards continue to work with the original score calculation
      rules since August 2024!
    </p>
  </>
);

export default function MonthlyLeaderboardPage() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [levels, setLevels] = useState<LevelInfo[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get<MonthlyResponse>(
          "/v1/get_monthly_leaderboard",
        );
        setData(response.data.leaderboard);
        setLevels(response.data.levels);
        setLastUpdated(response.data.timestamp);
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
      {/* <div className="btn-list"> */}
      {/*   <ChevronButton label="Archive" /> */}
      {/*   <ChevronButton label="Past levels" /> */}
      {/* </div> */}

      <Accordion id="monthly-leaderboard-accordion">
        <AccordionItem id="one" title="Level selection rules">
          {levelSelectionRules}
        </AccordionItem>
        <AccordionItem id="two" title="Score calculation">
          {scoreCalculation}
        </AccordionItem>
        <AccordionItem id="three" title="Credits">
          {credits}
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
        <>
          {lastUpdated && (
            <div className="mb-2 text-muted">
              Last updated at: {new Date(lastUpdated * 1000).toLocaleString()}
            </div>
          )}
          <DataTable
            data={data}
            columns={columns}
            defaultSort={[{ id: "score", desc: true }]}
            title="Monthly Leaderboard"
          />
        </>
      )}
    </div>
  );
}
