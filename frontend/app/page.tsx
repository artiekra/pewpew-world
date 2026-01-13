import LeaderboardExtract from "@/components/leaderboard-extract";

export default function Home() {
  return (
    <div className="container-xl p-4">
      <div className="row align-items-center mb-4">
        <div className="col">
          <h2 className="page-title">PewPew World ✨</h2>
        </div>
      </div>

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
          <h4 className="alert-heading">Hey there!</h4>
          <div className="alert-description">
            - This is an unofficial PewPew website. Data here is based on
            official{" "}
            <a href="https://github.com/pewpewlive/ppl-data">ppl-data</a>, as
            well as personal regular scrapes for archives.
            <br />- This website is{" "}
            <a href="https://github.com/artiekra/pewpew-world">open-source</a>!
          </div>
        </div>
      </div>
      <div className="row mt-2">
        <div className="col-12 col-md-6 mb-4">
          <LeaderboardExtract type="monthly" />
        </div>
        <div className="col-12 col-md-6 mb-4">
          <LeaderboardExtract type="speedrun" />
        </div>
      </div>

      <div className="hr-text">Website updates</div>

      <ul className="timeline">
        <li className="timeline-event">
          <div className="timeline-event-icon bg-x-lt">
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
              className="icon icon-tabler icons-tabler-outline icon-tabler-bell-ringing"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M10 5a2 2 0 0 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
              <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
              <path d="M21 6.727a11.05 11.05 0 0 0 -2.794 -3.727" />
              <path d="M3 6.727a11.05 11.05 0 0 1 2.792 -3.727" />
            </svg>
          </div>
          <div className="card timeline-event-card">
            <div className="card-body">
              <div className="text-secondary float-end">January 13th, 2025</div>
              <h4>PewPew World v1.0</h4>
              <p className="text-secondary">
                Release the first verison of the website featuring: monthly and
                speedrun leaderboards; archives of XP, blitz leaderboards, and
                quests; player comparison; and global player search!
              </p>
            </div>
          </div>
        </li>
        <li className="timeline-event">
          <div className="timeline-event-icon bg-x-lt">
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
              className="icon icon-tabler icons-tabler-outline icon-tabler-settings"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065" />
              <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
            </svg>
          </div>
          <div className="card timeline-event-card">
            <div className="card-body">
              <div className="text-secondary float-end">January 4th, 2025</div>
              <h4>Getting ready for release</h4>
              <p className="text-secondary">
                Roadmap after v1.0 is released includes search (among all
                players, levels, website), level pages, monthly leaderboard
                archive (and viewing past levels), improved dev tools, and blitz
                browser (view all blitz games, leaderboards for individual blitz
                config levels)
              </p>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}
