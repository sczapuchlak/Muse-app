"use client";
import {createContext,useContext} from 'react';
import type {createMuseBrowserClient} from '@/lib/supabase/client';
import type {IdentityCard,MyIdentity} from '@/lib/social/identity';

export type StreamEnv={client:ReturnType<typeof createMuseBrowserClient>;me:MyIdentity;friends:IdentityCard[]};
export const StreamEnvContext=createContext<StreamEnv|null>(null);
export function useStreamEnv(){const env=useContext(StreamEnvContext);if(!env)throw Error('Stream needs its signed-in environment');return env;}
