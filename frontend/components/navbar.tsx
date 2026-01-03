"use client";

import Link from "next/link";
import {
  IconHome,
  IconTrophy,
  IconArchive,
  IconUsers,
  IconCode,
  IconSun,
  IconMoon,
  IconExternalLink,
} from "@tabler/icons-react";
import { useTheme } from "@/components/theme-provider";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  subitems?: { label: string; href: string; icon?: React.ReactNode }[];
}

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: <IconHome size={24} /> },
  {
    label: "Leaderboards",
    href: "/leaderboards",
    icon: <IconTrophy size={24} />,
    subitems: [
      { label: "Monthly Leaderboard", href: "/leaderboards/monthly" },
      { label: "Speedrun Leaderboards", href: "/leaderboards/speedrun" },
    ],
  },
  {
    label: "Archive",
    href: "/archive",
    icon: <IconArchive size={24} />,
    subitems: [
      { label: "XP Leaderboard", href: "/archive/xp" },
      { label: "Blitz Leaderboard", href: "/archive/blitz" },
      { label: "Quests", href: "/archive/quests" },
    ],
  },
  {
    label: "Comparison",
    href: "/compare",
    icon: (
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
        className="icon icon-tabler icon-tabler-scale"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M7 20l10 0" />
        <path d="M6 6l6 -1l6 1" />
        <path d="M12 3l0 17" />
        <path d="M9 12l-3 -6l-3 6a3 3 0 0 0 6 0" />
        <path d="M21 12l-3 -6l-3 6a3 3 0 0 0 6 0" />
      </svg>
    ),
  },
  {
    label: "Dev",
    href: "/dev",
    icon: <IconCode size={24} />,
    subitems: [
      {
        label: "Blitz Config Generator",
        href: "https://ppl.artiekra.org/sandbox-config-generator/",
      },
      { label: "Mesh Editor", href: "https://ppl.artiekra.org/mesh-editor/" },
    ],
  },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar navbar-expand-md navbar-light d-print-none">
      <div className="container-xl">
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbar-menu"
          aria-controls="navbar-menu"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <h1 className="navbar-brand d-none-navbar-horizontal pe-0 pe-md-3">
          <Link href="/">
            <img
              src="/favicon.png"
              width={32}
              height={32}
              alt="PewPew World"
              className="navbar-brand-image"
            />
          </Link>
        </h1>

        <div className="collapse navbar-collapse" id="navbar-menu">
          <div className="d-flex flex-column flex-md-row flex-fill align-items-stretch align-items-md-center">
            <ul className="navbar-nav">
              {navItems.map((item) => (
                <li
                  key={item.href}
                  className={`nav-item ${item.subitems ? "dropdown" : ""}`}
                >
                  <Link
                    className={`nav-link ${item.subitems ? "dropdown-toggle" : ""}`}
                    href={item.href}
                    {...(item.subitems ? { "data-bs-toggle": "dropdown" } : {})}
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      {item.icon}
                    </span>
                    <span className="nav-link-title">{item.label}</span>
                  </Link>
                  {item.subitems && (
                    <div className="dropdown-menu dropdown-menu-arrow">
                      {item.subitems.map((subitem) => (
                        <Link
                          key={subitem.href}
                          className="dropdown-item"
                          href={subitem.href}
                          target={
                            subitem.href.startsWith("http")
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            subitem.href.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                        >
                          {subitem.icon && (
                            <span className="me-2">{subitem.icon}</span>
                          )}
                          {subitem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          className="btn btn-icon nav-link"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <IconSun size={24} /> : <IconMoon size={24} />}
        </button>
      </div>
    </header>
  );
}
