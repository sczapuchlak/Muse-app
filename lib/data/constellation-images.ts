import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {BoardImage} from '@/lib/constellation-board';
export const boardImageBucket='constellation-images';
/**
 * Prepare and upload a private image as WebP. Safari can't encode WebP (canvas.toBlob quietly returns PNG), so
 * `allowJpeg` uploads a JPEG there instead (Bucket List). Constellation cards validate WebP paths on the server, so
 * without it the person gets a clear message rather than a failed upload.
 */
export async function uploadBoardImage(userId:string,cardId:string,file:File,{allowJpeg=false}:{allowJpeg?:boolean}={}):Promise<BoardImage>{
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||file.size>8388608||!file.size)throw Error('Choose a PNG, JPEG, WebP or GIF image under 8 MB.');
 const bitmap=await createImageBitmap(file);try{
 if(bitmap.width*bitmap.height>40000000)throw Error('Choose an image under 40 megapixels.');
 const encode=async(max:number,type:'image/webp'|'image/jpeg')=>{const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');if(!context)throw Error('Image preparation is unavailable.');context.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image preparation failed.')),type,type==='image/jpeg'?.88:.85));return {blob,width:canvas.width,height:canvas.height};};
 const webp=(await encode(16,'image/webp')).blob.type==='image/webp';
 if(!webp&&!allowJpeg)throw Error('This browser can’t prepare images for Constellations yet. Try Chrome or Firefox for photos here.');
 const type=webp?'image/webp' as const:'image/jpeg' as const,ext=webp?'webp':'jpg';
 const image=await encode(1600,type),thumb=await encode(400,type),digest=async(blob:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join(''),hash=await digest(image.blob),id=`${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`,path=`${userId}/${cardId}/${id}.${ext}`,thumbnailPath=`${userId}/${cardId}/${id}.thumb.${ext}`,storage=createMuseBrowserClient().storage.from(boardImageBucket);
 const uploadOrVerify=async(name:string,blob:Blob)=>{const result=await storage.upload(name,blob,{contentType:type,upsert:false});if(!result.error)return;const existing=await storage.download(name);if(existing.error||!existing.data||await digest(existing.data)!==await digest(blob))throw Error('Image upload was not confirmed. Retry the same image.');};
 await uploadOrVerify(path,image.blob);try{await uploadOrVerify(thumbnailPath,thumb.blob);}catch{await storage.remove([path]);throw Error('Thumbnail upload failed. Please retry.');}
 return {id,path,thumbnailPath,name:file.name.slice(0,200),alt:file.name.slice(0,200),width:image.width,height:image.height,mime:type};
 }finally{bitmap.close();}
}
export async function boardImageUrl(path:string){const {data,error}=await createMuseBrowserClient().storage.from(boardImageBucket).createSignedUrl(path,300);if(error)throw Error('Image could not load. Retry.');return data.signedUrl;}
export async function removeBoardImages(images:BoardImage[]){if(!images.length)return;const {error}=await createMuseBrowserClient().storage.from(boardImageBucket).remove(images.flatMap(i=>[i.path,i.thumbnailPath]));if(error)throw Error('Image cleanup was not confirmed.');}
