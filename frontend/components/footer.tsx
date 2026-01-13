import React from "react";

// A premium styled footer component using Tabler classes and a glassmorphism effect
export default function Footer() {
  return (
    <footer
      className="footer footer-transparent py-4"
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="container-xl d-flex flex-column flex-md-row justify-content-between align-items-center">
        <div className="text-muted" style={{ fontSize: "0.9rem" }}>
          PewPew World v1.0.0 -{" "}
          <a
            href="https://github.com/artiekra/pewpew-world"
            target="_blank"
            className="hover:text-primary"
            style={{ color: "#7070ff" }}
          >
            GitHub
          </a>
        </div>

        <div className="d-flex gap-1">
          {/* <span className="badge bg-blue-lt text-blue-lt-fg"> */}
          created by{" "}
          <a
            href="https://artiekra.org"
            target="_blank"
            className="hover:text-primary"
            style={{ color: "#7070ff" }}
          >
            artiekra
          </a>{" "}
          :3
          {/* </span> */}
        </div>
      </div>
    </footer>
  );
}
