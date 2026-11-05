import {connection} from 'next/server';
import {Suspense,type ReactNode} from 'react';
import {requireUser} from '@/lib/auth/user';
import {AuthSessionBoundary} from '@/components/auth/AuthSessionBoundary';
import {AppearanceBridge} from '@/components/atelier/AppearanceBridge';

/** The full-screen studio wears the person's applied theme for its own chrome; the preview frames are isolated. */
async function Studio({children}:{children:ReactNode}){
 await connection();const user=await requireUser();
 return <AuthSessionBoundary userId={user.id}><AppearanceBridge userId={user.id}/>{children}</AuthSessionBoundary>;
}
export default function Layout({children}:{children:ReactNode}){return <Suspense fallback={<main className="muse-page" role="status" aria-busy="true">Opening the atelier…</main>}><Studio>{children}</Studio></Suspense>;}
