import HeaderMain from "@/components/Shared/HeaderMain";
import FeaturedMatchesSlider from "@/components/Pages/Home/FeaturedMatchesSlider";
import GameCategories from "@/components/Pages/Home/GameCategories";
import UpComingEvents from "@/components/Pages/Home/UpComingEvents";

export default function Home() {
  return (
    <>
      <HeaderMain />
      <div className="smartbet-home">
        <FeaturedMatchesSlider />
        <GameCategories />
        <UpComingEvents />
      </div>
    </>
  );
}
