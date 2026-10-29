import type { ReactNode } from "react";

type MuseCardProps = {
  children: ReactNode;
  className?: string;
};

export function MuseCard({
  children,
  className = "",
}: MuseCardProps) {
  return (
    <section className={`muse-card ${className}`}>
      {children}
    </section>
  );
}