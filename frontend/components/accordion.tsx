"use client";

import { ReactNode } from "react";
import AccordionItem from "./accordion-item";

interface AccordionProps {
  id: string;
  children: ReactNode;
}

export default function Accordion({ id, children }: AccordionProps) {
  return (
    <div className="accordion mt-4" id={id}>
      {children}
    </div>
  );
}

export { AccordionItem };
