(()=>{try{
  const saved=localStorage.getItem('umeed:theme');
  const theme=(saved==='light'||saved==='dark')?saved:'dark';
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.colorScheme=theme;
}catch{document.documentElement.dataset.theme='dark'}})();