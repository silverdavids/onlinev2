"use client";

import { useContext } from "react";
import { PrematchBetslipContext } from "@/src/betslip/PrematchBetslipProvider";

export { BOOKING_EXPIRY_MINUTES } from "@/src/betslip/PrematchBetslipProvider";

export const usePrematchBetslip = () => {
  const context = useContext(PrematchBetslipContext);
  if (!context) {
    throw new Error(
      "usePrematchBetslip must be used within PrematchBetslipProvider"
    );
  }
  return context;
};
