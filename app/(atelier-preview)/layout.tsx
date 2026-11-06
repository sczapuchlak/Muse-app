import {connection} from 'next/server';
import {Suspense,type ReactNode} from 'react';
import {requireUser} from '@/lib/auth/user';

/** The preview stage: signed-in only, no personal data, no appearance bridge (its theme comes from the studio). */
async function Stage({children}:{children:ReactNode}){await connection();await requireUser();return <>{children}</>;}
export default function Layout({children}:{children:ReactNode}){return <Suspense fallback={null}><Stage>{children}</Stage></Suspense>;}
