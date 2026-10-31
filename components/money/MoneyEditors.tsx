import type { RecurringPayment } from "@/lib/recurring";
import { RecurringEditor } from "./RecurringEditor";
import type { Paycheck,Allocation,MoneyTransaction,CreditCard,MoneyBill,MoneyCategory,MoneyTag,AllocationGroup } from "@/lib/money";
import { PaycheckEditor,TemplateEditor } from "./PaycheckEditor";
import { AllocationEditor } from "./AllocationEditor";
import { TransactionEditor } from "./TransactionEditor";
import { CardEditor,PaymentEditor,BillEditor } from "./CardBillEditor";
import { CategoryEditor,TaxonomyEditor } from "./CategoryEditor";
export type MoneyEditorRequest=({kind:"recurring";initial?:RecurringPayment}|{kind:"paycheck";initial?:Paycheck;templateId?:string}|{kind:"allocation";initial?:Allocation}|{kind:"transaction";initial?:MoneyTransaction}|{kind:"card";initial?:CreditCard}|{kind:"payment";cardId?:string}|{kind:"bill";initial?:MoneyBill}|{kind:"category";initial?:MoneyCategory}|{kind:"tag";initial?:MoneyTag}|{kind:"group";initial?:AllocationGroup}|{kind:"template";paycheck:Paycheck})&{anchor:HTMLElement};
export type MoneyOpen=(request:MoneyEditorRequest)=>void;
export function MoneyEditors({editor,date,paycheckId,onClose,onSaved,onPaycheckSaved}:{editor:MoneyEditorRequest;date:string;paycheckId?:string;onClose:()=>void;onSaved:()=>void;onPaycheckSaved:(id:string)=>void}){
 const common={anchor:editor.anchor,onClose};
 switch(editor.kind){case "recurring":return <RecurringEditor {...common} initial={editor.initial} date={date}/>;case "paycheck":return <PaycheckEditor {...common} initial={editor.initial} templateId={editor.templateId} date={date} onSaved={onPaycheckSaved}/>;case "allocation":return paycheckId?<AllocationEditor {...common} initial={editor.initial} paycheckId={paycheckId} onSaved={onSaved}/>:null;case "transaction":return <TransactionEditor {...common} initial={editor.initial} date={date} onSaved={onSaved}/>;case "card":return <CardEditor {...common} date={date} initial={editor.initial}/>;case "payment":return <PaymentEditor {...common} cardId={editor.cardId} date={date} onSaved={onSaved}/>;case "bill":return <BillEditor {...common} initial={editor.initial} date={date}/>;case "category":return <CategoryEditor {...common} initial={editor.initial}/>;case "tag":return <TaxonomyEditor {...common} kind="tags" initial={editor.initial}/>;case "group":return <TaxonomyEditor {...common} kind="groups" initial={editor.initial}/>;case "template":return <TemplateEditor {...common} paycheck={editor.paycheck}/>;}
}
