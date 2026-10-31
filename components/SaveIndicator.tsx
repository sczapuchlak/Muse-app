import './SaveIndicator.css';
/** Paint only: the owning store remains responsible for acknowledgment and recovery. */
export function SaveIndicator({label,loaded,pending=false,saving=false,drafting=false,refreshing=false,error=''}:{label:string;loaded:boolean;pending?:boolean;saving?:boolean;drafting?:boolean;refreshing?:boolean;error?:string}){
 const state=error?'error':!loaded?'loading':pending||saving?'saving':drafting?'pending':refreshing?'loading':'saved';
 return <span className="muse-save-indicator" data-state={state}><i aria-hidden="true"/>{error||`${label}: ${state==='saved'?'All changes saved':state==='loading'?'Loading…':state==='pending'?'Unsaved edits':'Saving…'}`}</span>;
}
