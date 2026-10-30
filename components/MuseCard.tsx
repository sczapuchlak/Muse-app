import type { ReactNode } from "react";

type MuseCardProps = {
  children: ReactNode;
  className?: string;
  id: string;
};

export function MuseCard({
  children,
  className = "",
  id,
}: MuseCardProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`muse-card ${className}`}>
      {children}
    </section>
  );
}
