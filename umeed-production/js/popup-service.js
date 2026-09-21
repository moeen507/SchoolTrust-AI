function toast(message,type='info',ms=3000){
  const root=document.getElementById('toast-root');if(!root)return;
  const el=document.createElement('div');el.className='toast '+type;el.textContent=message;root.appendChild(el);
  setTimeout(()=>el.remove(),ms);
}
function modal({title,message,type='info',confirmText='OK',cancelText=null}){
  return new Promise(resolve=>{
    const root=document.getElementById('popup-root');
    const backdrop=document.createElement('div');backdrop.className='popup-backdrop';
    const popup=document.createElement('div');popup.className='popup';
    const h=document.createElement('h3');h.textContent=title;
    const p=document.createElement('p');p.textContent=message;
    const actions=document.createElement('div');actions.className='actions';
    const ok=document.createElement('button');ok.className='btn '+(type==='error'?'btn-red':'btn-gold');ok.textContent=confirmText;
    actions.appendChild(ok);
    let cancel=null;
    if(cancelText){cancel=document.createElement('button');cancel.className='btn btn-ghost';cancel.textContent=cancelText;actions.appendChild(cancel)}
    popup.append(h,p,actions);backdrop.appendChild(popup);root.appendChild(backdrop);
    const done=v=>{backdrop.remove();resolve(v)};ok.onclick=()=>done(true);if(cancel)cancel.onclick=()=>done(false);
  });
}
export const PopupService={
  success:m=>toast(m,'success'),warning:m=>toast(m,'warning'),error:m=>toast(m,'error'),info:m=>toast(m,'info'),
  confirm:(title,message,confirmText='Confirm')=>modal({title,message,type:'warning',confirmText,cancelText:'Cancel'}),
  alert:(title,message,type='info')=>modal({title,message,type})
};
