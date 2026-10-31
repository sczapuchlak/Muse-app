import type { ReactNode } from 'react';
import { MuseMantra } from './MuseMantra';
import { pageMantra } from '@/lib/page-header';
import { MuseHeaderFrame } from './MuseHeaderFrame';

/** One title and one supporting line; identity copy has a single shared source. */
export function MusePageHeader({ title, description, children, contextWidth }: {
  title: string;
  description?: string;
  children?: ReactNode;
  contextWidth?: 'standard' | 'wide';
}) {
  const fixedMantra = pageMantra(title);
  const support = fixedMantra
    ? <p className="muse-mantra muse-page-mantra">{fixedMantra}</p>
    : title === 'Insights'
      ? <MuseMantra module="insights" />
      : description ? <p className="muse-mantra muse-page-mantra">{description}</p> : null;

  return <MuseHeaderFrame contextWidth={contextWidth} title={<h1>{title}</h1>} mantra={support}>{children}</MuseHeaderFrame>;
}
