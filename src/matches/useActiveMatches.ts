"use client";

import { useContext } from "react";
import { ActiveMatchesContext } from "@/src/matches/ActiveMatchesProvider";

export const useActiveMatches = () => {
  const context = useContext(ActiveMatchesContext);
  if (!context) {
    throw new Error("useActiveMatches must be used within ActiveMatchesProvider");
  }
  return context;
};
