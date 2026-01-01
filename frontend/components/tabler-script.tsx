"use client";

import { useEffect } from "react";

export default function TablerScript() {
  useEffect(() => {
    // @ts-ignore
    import("@tabler/core/dist/js/tabler.min.js");
  }, []);

  return null;
}
