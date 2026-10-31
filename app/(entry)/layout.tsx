import type {ReactNode} from "react";
import {AuthAtmosphere} from "@/components/auth/AuthAtmosphere";
export default function Layout({children}:{children:ReactNode}){return <AuthAtmosphere>{children}</AuthAtmosphere>;}
