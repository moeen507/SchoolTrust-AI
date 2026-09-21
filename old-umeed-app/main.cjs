const {app,BrowserWindow,shell,dialog}=require('electron');
const path=require('path');
let mainWindow;
function createWindow(){
  mainWindow=new BrowserWindow({
    width:1440,height:900,minWidth:1024,minHeight:700,
    backgroundColor:'#0A0C10',
    show:false,
    autoHideMenuBar:true,
    webPreferences:{
      preload:path.join(__dirname,'preload.cjs'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true
    }
  });
  mainWindow.loadFile(path.join(__dirname,'www','index.html'));
  mainWindow.once('ready-to-show',()=>mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({url})=>{
    if(/^https?:\/\//i.test(url)){shell.openExternal(url);return {action:'deny'}}
    return {action:'allow'};
  });
  mainWindow.webContents.on('will-navigate',(event,url)=>{
    if(/^https?:\/\//i.test(url)&&!url.includes('jqgwsgprqxfnvrmkpgyy.supabase.co')){
      event.preventDefault();shell.openExternal(url);
    }
  });
}
app.whenReady().then(()=>{createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
process.on('uncaughtException',e=>{dialog.showErrorBox('UMEED Fee Ledger',String(e&&e.stack||e))});
