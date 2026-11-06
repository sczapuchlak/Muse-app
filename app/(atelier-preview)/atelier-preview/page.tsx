import type {Metadata} from 'next';
import {AtelierPreview} from '@/components/atelier/AtelierPreview';
export const metadata:Metadata={title:'Theme Atelier preview',robots:{index:false}};
export default function Page(){return <AtelierPreview/>;}
