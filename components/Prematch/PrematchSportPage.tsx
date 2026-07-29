import PrematchBrowser from "@/components/Prematch/PrematchBrowser";
import HeaderMain from "@/components/Shared/HeaderMain";
import type { PrematchSportId } from "@/src/domain/sports";

type PrematchSportPageProps = {
  sportId: PrematchSportId;
  sportName: string;
};

export default function PrematchSportPage({
  sportId,
  sportName,
}: PrematchSportPageProps) {
  return (
    <>
      <HeaderMain />
      <PrematchBrowser
        title={`${sportName} Fixtures`}
        sportId={sportId}
      />
    </>
  );
}
