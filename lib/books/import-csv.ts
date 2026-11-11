/** Bounded CSV primitives for library portability. Parsing never writes user data. */
export const CSV_MAX_BYTES=10*1024*1024;
export const CSV_MAX_ROWS=25000;
export const CSV_MAX_COLUMNS=200;
export const CSV_MAX_CELL=50000;

export function parseLibraryCsv(text:string):string[][]{
 if(new TextEncoder().encode(text).length>CSV_MAX_BYTES)throw Error('The file is larger than 10 MB.');
 const input=text.replace(/^\uFEFF/,'');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,afterQuote=false;
 const field=()=>{if(cell.length>CSV_MAX_CELL)throw Error('A CSV field is too long.');row.push(cell);cell='';afterQuote=false;if(row.length>CSV_MAX_COLUMNS)throw Error('The CSV has too many columns.');};
 const line=()=>{field();if(row.some(value=>value.trim())){rows.push(row);if(rows.length>CSV_MAX_ROWS+1)throw Error('The CSV has too many rows.');}row=[];};
 for(let i=0;i<input.length;i++){
  const c=input[i];
  if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=c;}
  else if(c===',')field();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;line();}
  else if(c==='"'){if(cell||afterQuote)throw Error('Unexpected quote in CSV field.');quoted=true;}
  else {if(afterQuote)throw Error('Unexpected text after a quoted CSV field.');cell+=c;}
  if(cell.length>CSV_MAX_CELL)throw Error('A CSV field is too long.');
 }
 if(quoted)throw Error('A quoted CSV field is not closed.');
 if(row.length||cell||afterQuote)line();
 if(!rows.length)throw Error('The CSV is empty.');
 const width=rows[0].length;if(rows.some(r=>r.length!==width))throw Error('CSV rows have different numbers of columns.');
 return rows;
}

/** Spreadsheet applications may execute a formula even after leading whitespace or controls. */
export function csvCell(value:unknown):string{
 let s=value==null?'':String(value);
 if(/^[\s\u0000-\u001f]*[=+\-@]/u.test(s))s="'"+s;
 return `"${s.replace(/"/g,'""')}"`;
}
export function libraryCsv(rows:readonly (readonly unknown[])[]):string{return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
