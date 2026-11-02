import type {FortuneKind} from '@/lib/whimsy/fortunes';

export function FortuneResultActions({kind,busy,saved,onAnother,onSave,onCopy,onShare,onNewQuestion}:{kind:FortuneKind;busy:boolean;saved:boolean;onAnother:()=>void;onSave:()=>void;onCopy:()=>void;onShare:()=>void;onNewQuestion?:()=>void}){
 return <div className="muse-fortune-actions">
  <button className="muse-button" type="button" disabled={busy} onClick={onAnother}>{kind==='cookie'?'Another Cookie':kind==='oracle'?'Ask Again':kind==='prophecy'?'Another Prophecy':'Another Curiosity'}</button>
  <button className="muse-button button-primary muse-fortune-save" type="button" disabled={busy||saved} onClick={onSave}>{saved?'Saved':'Save to Collection'}</button>
  <button className="muse-button button-ghost" type="button" disabled={busy} onClick={onCopy}>Copy</button>
  <button className="muse-button button-ghost" type="button" disabled={busy} onClick={onShare}>Share</button>
  {kind==='oracle'&&<button className="text-button" type="button" disabled={busy} onClick={onNewQuestion}>New question</button>}
 </div>;
}
