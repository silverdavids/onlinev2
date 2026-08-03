import HeaderTwo from "@/components/Shared/HeaderTwo";
import TicketDetailsPage from "@/components/Tickets/TicketDetailsPage";
import { ProtectedRoute } from "@/src/auth/ProtectedRoute";

type Props = {
  params: {
    receiptId: string;
  };
};

export default function TicketDetailRoute({ params }: Props) {
  const receiptId = Number(params.receiptId);

  return (
    <ProtectedRoute>
      <HeaderTwo />
      <TicketDetailsPage receiptId={Number.isFinite(receiptId) ? receiptId : 0} />
    </ProtectedRoute>
  );
}
