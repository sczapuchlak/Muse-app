import sharp from 'sharp';
const [dir,out,...names]=process.argv.slice(2);
const w=390,h=844,imgs=await Promise.all(names.map(n=>sharp(`${dir}/${n}.png`).resize(w,h,{fit:'cover',position:'top'}).png().toBuffer()));
await sharp({create:{width:w*imgs.length+10*(imgs.length-1),height:h,channels:3,background:'#222'}}).composite(imgs.map((input,i)=>({input,left:i*(w+10),top:0}))).png().toFile(out);
