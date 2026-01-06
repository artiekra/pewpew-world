"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/helpers/api";
import { stripColorCodes } from "@/helpers/text-utils";
import ColorizedText from "@/components/colorized-text";
import Papa from "papaparse";

interface PlayerShortInfo {
  account_id: string;
  username: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [availablePlayers, setAvailablePlayers] = useState<PlayerShortInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPlayer = (uuid: string) => {
    router.push(`/player/${uuid}`);
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <div className="dropdown w-100" ref={containerRef}>
      <div className="input-icon">
        <span className="input-icon-addon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="icon"
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
            <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
            <path d="M21 21l-6 -6" />
          </svg>
        </span>
        <input
          type="text"
          className="form-control"
          placeholder="Search for a player..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
      </div>
      {showResults && searchTerm && (
        <div 
          className="dropdown-menu show w-100 mt-1" 
          style={{ 
            maxHeight: "400px", 
            overflowY: "auto",
            zIndex: 1000 
          }}
        >
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((p) => (
              <button
                key={p.account_id}
                className="dropdown-item py-2"
                onClick={() => handleSelectPlayer(p.account_id)}
              >
                <ColorizedText text={p.username} />
              </button>
            ))
          ) : (
            <div className="dropdown-item text-muted small py-2">
              No matching players found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
