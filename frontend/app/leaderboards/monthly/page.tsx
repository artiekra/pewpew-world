"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import ChevronButton from "@/components/chevron-button";
import Accordion, { AccordionItem } from "@/components/accordion";
import DataTable from "@/components/data-table";
import api from "@/lib/api";

interface LeaderboardEntry {
  player_uuid: string;
  country: string;
  score: number;
  wrs: number;
  average_place: number;
}

interface MonthlyResponse {
  timestamp: number;
  levels: string[];
  leaderboard: LeaderboardEntry[];
}

const columns: ColumnDef<LeaderboardEntry>[] = [
  {
    accessorKey: "player_uuid",
    header: "Player",
    cell: (info) => (
      <p className="text-muted mb-0">
        {(info.getValue() as string).substring(0, 8)}...
      </p>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    cell: (info) => (
      <span className="badge bg-blue-lt">{info.getValue() as string}</span>
    ),
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
  const [levelNames, setLevelNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get<MonthlyResponse>(
          "/v1/get_monthly_leaderboard",
        );
        setData(response.data.leaderboard);
        setLevelNames(response.data.levels);
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
      <br />
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

      <p>
        <b>Levels this month: </b>
        {isLoading ? (
          <span
            className="spinner-border spinner-border-sm ms-2"
            role="status"
          ></span>
        ) : (
          levelNames.join(", ")
        )}
      </p>

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
