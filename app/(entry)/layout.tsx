import type {ReactNode} from "react";
import type {Metadata} from "next";
import {AuthAtmosphere} from "@/components/auth/AuthAtmosphere";
export const metadata:Metadata={
  title:"Welcome to Muse.",
  description:"For everything you are and everything you're becoming.",
};
export default function Layout({children}:{children:ReactNode}){return <AuthAtmosphere>{children}</AuthAtmosphere>;}
