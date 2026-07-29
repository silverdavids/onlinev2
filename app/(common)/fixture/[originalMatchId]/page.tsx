import PrematchFixtureDetails from "@/components/Prematch/PrematchFixtureDetails";
import HeaderMain from "@/components/Shared/HeaderMain";

export default function FixtureDetailsPage({
  params,
}: {
  params: { originalMatchId: string };
}) {
  return (
    <>
      <HeaderMain />
      <PrematchFixtureDetails originalMatchId={params.originalMatchId} />
    </>
  );
}
