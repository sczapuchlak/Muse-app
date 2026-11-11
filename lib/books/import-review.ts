import type {ImportPlanRow} from './import-plan';
import type {BookCandidate} from './metadata';
import {candidateFields,metadataSource,queryIsbn} from './metadata';

export type ReviewIssue={key:string;type:'identity'|'status'|'history'|'isbn'|'metadata'|'series'|'information';required:boolean;message:string};
/** Optional catalog gaps never block otherwise valid source data. Counts reflect unresolved decisions only. */
export function importReviewIssues(item:ImportPlanRow):ReviewIssue[]{
 const issues:ReviewIssue[]=[];
 if(item.kind==='review')issues.push({key:'identity',type:'identity',required:true,message:item.reason??'Choose a Muse book or skip this row.'});
 for(const message of item.conflicts){
  const type=/status needs review|Status .*needs review/i.test(message)?'status':/reading date needs review|Finish date needs review|Choose an existing read/i.test(message)?'history':/ISBN/i.test(message)?'isbn':'information';
  issues.push({key:type==='information'?message:type,type,required:type==='status'||type==='history',message});
 }
 if(item.seriesNote&&!item.series)issues.push({key:'series',type:/metadata|provider|lookup/i.test(item.seriesNote)?'metadata':'series',required:false,message:item.seriesNote});
 return issues.filter(i=>!item.resolvedIssues?.includes(i.key));
}
export const unresolvedImportIssues=(item:ImportPlanRow)=>item.skip?[]:importReviewIssues(item).filter(i=>i.required);
/** The source observation stays immutable; selected editions affect only explicitly reviewed metadata. */
export function selectImportEdition(item:ImportPlanRow,candidate:BookCandidate):ImportPlanRow{
 const fields=candidateFields(candidate),sourceRow=item.sourceRow??item.row;
 const savedIsbn=item.book?.isbn?queryIsbn(item.book.isbn):undefined,chosenIsbn=queryIsbn(fields.isbn??'');
 const incompatible=!!savedIsbn&&savedIsbn!==chosenIsbn;
 const metadata=incompatible?{description:candidate.description,coverUrl:candidate.coverUrl,genre:candidate.genres.join(', ')}:{...item.metadata,...fields,totalPages:candidate.pageCount,format:candidate.format,metadataSource:metadataSource(candidate)};
 const row={...item.row,...(!item.book?{title:candidate.title,author:candidate.authors.join(', '),isbn:queryIsbn(fields.isbn??'')??item.row.isbn,pages:candidate.pageCount,publisher:candidate.publisher,publishedDate:candidate.publishedDate,coverUrl:candidate.coverUrl,description:candidate.description,format:candidate.format}:{})};
 return {...item,row,sourceRow,metadata,metadataAddition:true,series:undefined,seriesNote:incompatible?'Muse ISBN identifies another edition; only work-level gaps can be filled. Existing edition preserved.':'Edition selected. Review an existing series installment if applicable.',resolvedIssues:[...item.resolvedIssues??[],'isbn','metadata']};
}
