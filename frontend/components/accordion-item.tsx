"use client";

import { ReactNode } from "react";
import { IconPlus } from "@tabler/icons-react";

interface AccordionItemProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function AccordionItem({
  id,
  title,
  children,
  defaultOpen = false,
}: AccordionItemProps) {
  const collapseId = `collapse${id.charAt(0).toUpperCase() + id.slice(1)}`;
  const headingId = `heading${id.charAt(0).toUpperCase() + id.slice(1)}`;

  return (
    <div className="accordion-item">
      <h3 className="accordion-header" id={headingId}>
        <button
          className={`accordion-button ${defaultOpen ? "" : "collapsed"}`}
          type="button"
          data-bs-toggle="collapse"
          data-bs-target={`#${collapseId}`}
          aria-expanded={defaultOpen ? "true" : "false"}
          aria-controls={collapseId}
        >
          {title}
          <div className="accordion-button-toggle accordion-button-toggle-plus">
            <IconPlus size={28} stroke={1.5} className="icon icon-1" />
          </div>
        </button>
      </h3>
      <div
        id={collapseId}
        className={`accordion-collapse collapse ${defaultOpen ? "show" : ""}`}
        aria-labelledby={headingId}
        data-bs-parent="#accordion"
      >
        <div className="accordion-body">{children}</div>
      </div>
    </div>
  );
}
