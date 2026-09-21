function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
export const ExportService={
  csv(rows,name){
    const data=rows.length?rows:[{}],keys=[...new Set(data.flatMap(r=>Object.keys(r)))],q=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    const csv=[keys.map(q).join(','),...data.map(r=>keys.map(k=>q(r[k])).join(','))].join('\n');
    download(new Blob([csv],{type:'text/csv;charset=utf-8'}),name);
  },
  json(data,name){download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),name)}
};
