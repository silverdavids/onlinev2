import React from "react";
import HeaderTwo from "@/components/Shared/HeaderTwo";
import ShopDeposit from "@/components/Pages/Deposit/ShopDeposit";
import { ProtectedRoute } from "@/src/auth/ProtectedRoute";

export default function DepositPage() {
  return (
    <ProtectedRoute>
      <HeaderTwo />
      <ShopDeposit />
    </ProtectedRoute>
  );
}
