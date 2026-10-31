import Link from "next/link";
import { navigation, type NavItem } from "@/lib/navigation";
import { MuseCard } from "./MuseCard";
import { MusePageHeader } from "./MusePageHeader";
import { SharedDateNavigator } from "./SharedDateNavigator";
import { CardHeading } from "./CardHeading";

export function ModulePlaceholder({ item }: { item: NavItem }) {
  return <main className="muse-page muse-module-page">
    <MusePageHeader title={item.label} description={item.description}>{item.id==="insights"&&<SharedDateNavigator/>}</MusePageHeader>
    <MuseCard id={`module-${item.id}`}>
      <CardHeading id={`module-${item.id}`} title="Coming soon" icon={item.icon} />
      <p className="card-description">{item.description}</p>
      <Link href="/" className="muse-button muse-edge">Back to Daily Edit</Link>
    </MuseCard>
  </main>;
}

/** Only fixed, dedicated routes use this presentation; it does not consume URL params. */
export function PendingModule({ id }: { id: string }) {
  const item = navigation.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown Muse destination: ${id}`);
  return <ModulePlaceholder item={item} />;
}
