import fs from 'fs';
import path from 'path';
const root=process.cwd(),web=path.join(root,'web');
fs.rmSync(web,{recursive:true,force:true});fs.mkdirSync(web,{recursive:true});
for(const entry of ['index.html','app-shell.html','pages','js','css','assets','manifest.webmanifest','sw.js']){
  const src=path.join(root,entry),dst=path.join(web,entry);
  if(!fs.existsSync(src))continue;
  const st=fs.statSync(src);if(st.isDirectory())fs.cpSync(src,dst,{recursive:true});else{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst)}
}
for(const base of [root,web]){
  const vendor=path.join(base,'vendor');fs.mkdirSync(vendor,{recursive:true});
  fs.copyFileSync(path.join(root,'node_modules/xlsx/dist/xlsx.full.min.js'),path.join(vendor,'xlsx.full.min.js'));
}
console.log('Prepared web assets in',web);
