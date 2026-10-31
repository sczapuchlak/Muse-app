type AuthError={status?:number;code?:string};
type Result={error:AuthError|null;data?:{user?:{id:string}|null}|null};
export type DeletionAdmin={deleteUser:(id:string,soft:boolean)=>Promise<Result>;getUserById:(id:string)=>Promise<Result>};
export function validDeletionConfirmation(value:unknown):value is {confirmation:'DELETE'}{
  return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===1&&(value as {confirmation?:unknown}).confirmation==='DELETE';
}
/** One Auth deletion transaction owns all database cascades. No piecemeal data deletion. */
export async function deleteConfirmedAccount(userId:string,admin:DeletionAdmin):Promise<void>{
  try{const result=await admin.deleteUser(userId,false);if(!result.error&&result.data?.user?.id===userId)return;}catch{ /* The response may be lost after commit; verify below. */ }
  try{const result=await admin.getUserById(userId);if(result.error?.status===404&&result.error.code==='user_not_found')return;}catch{ /* A failed verification is not proof of deletion. */ }
  throw Error('Account deletion was not confirmed. Your account may still exist. Retry or reload to check your session.');
}
