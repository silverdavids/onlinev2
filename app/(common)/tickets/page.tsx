import HeaderTwo from "@/components/Shared/HeaderTwo";
import TicketHistoryPage from "@/components/Tickets/TicketHistoryPage";
import { ProtectedRoute } from "@/src/auth/ProtectedRoute";

export default function TicketsPage() {
  return (
    <ProtectedRoute>
      <HeaderTwo />
      <TicketHistoryPage />
    </ProtectedRoute>
  );
}
