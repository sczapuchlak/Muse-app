import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Tables} from '@/lib/database.types';

export type BookJournalEntry=Tables<'book_journal_entries'>;
export type JournalDraft=Pick<BookJournalEntry,'id'|'book_id'|'book_title_snapshot'|'kind'|'body'|'personal_note'|'page_label'|'chapter'|'saved_on'|'cycle_id'|'session_id'>;

export async function readBookJournal(client:SupabaseClient<Database>,userId:string,bookId:string){
 const {data,error}=await client.from('book_journal_entries').select('*').eq('user_id',userId).eq('book_id',bookId).order('saved_on',{ascending:false}).order('created_at',{ascending:false});
 if(error)throw error;
 return data??[];
}

export async function saveBookJournalEntry(client:SupabaseClient<Database>,userId:string,draft:JournalDraft,revision=0){
 const body=draft.body.trim();
 if(!body||body.length>10000)throw Error('Write up to 10,000 characters.');
 if(!['quote','thought'].includes(draft.kind))throw Error('Choose a quote or thought.');
 const record={...draft,body,personal_note:draft.personal_note.trim(),page_label:draft.page_label.trim(),chapter:draft.chapter.trim(),book_title_snapshot:draft.book_title_snapshot.trim()};
 if(record.personal_note.length>5000||record.page_label.length>100||record.chapter.length>200)throw Error('A journal detail is too long.');
 const query=revision===0?client.from('book_journal_entries').insert({...record,user_id:userId}):client.from('book_journal_entries').update(record).eq('id',draft.id).eq('user_id',userId).eq('revision',revision);
 const {data,error}=await query.select('*').maybeSingle();
 if(error)throw error;
 if(!data)throw Error('This journal entry changed elsewhere. Reload before saving.');
 return data;
}

export async function deleteBookJournalEntry(client:SupabaseClient<Database>,userId:string,entry:Pick<BookJournalEntry,'id'|'revision'>){
 const {data,error}=await client.from('book_journal_entries').delete().eq('id',entry.id).eq('user_id',userId).eq('revision',entry.revision).select('id').maybeSingle();
 if(error)throw error;
 if(!data)throw Error('This journal entry changed elsewhere. Reload before deleting.');
}
