import { MuseHeader } from "@/components/MuseHeader";
import { PrioritiesCard } from "@/components/PrioritiesCard";

export default function Home() {
  return (
    <main className="muse-page">
      <MuseHeader />

      <div className="daily-grid">
        <PrioritiesCard />
      </div>
    </main>
  );
}