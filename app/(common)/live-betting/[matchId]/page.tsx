import LiveFixtureDetails from "@/components/Live/LiveFixtureDetails";
export default function Page({ params }: { params: { matchId: string } }) {
 return <LiveFixtureDetails matchId={params.matchId} />;
}
