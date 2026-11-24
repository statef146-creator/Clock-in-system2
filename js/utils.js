/* Shared helpers & constants */
const C = {cyan:'#19c8e6',green:'#35e08c',amber:'#ffb224',red:'#ff5468',blue:'#4f9dff',violet:'#c77dff',teal:'#0e7f96',muted:'#8fb3c4'};
const DEPT_COLOR = {Technical:C.cyan,Commercial:C.green,Finance:C.amber,ICT:C.blue,Administration:C.violet};
const STATUS_META = {
  ON_TIME:{label:'On time',cls:'ok',color:C.green},
  LATE:{label:'Late',cls:'warn',color:C.amber},
  FIELD:{label:'Field',cls:'field',color:C.violet},
  ABSENT:{label:'Absent',cls:'bad',color:C.red},
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);}));
const pad = n => String(n).padStart(2,'0');
const dateKey = d => {const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;};
const todayKey = () => dateKey(new Date());
const fmtTime = ts => {const d=new Date(ts);return `${pad(d.getHours())}:${pad(d.getMinutes())}`;};
const fmtDate = key => {const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});};
const fmtDateShort = key => {const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});};
const timeToMin = t => {const [h,m]=t.split(':').map(Number);return h*60+m;};
const minOfDay = ts => {const d=new Date(ts);return d.getHours()*60+d.getMinutes();};
const minToTime = m => `${pad(Math.floor(m/60)%24)}:${pad(m%60)}`;
const relTime = ts => {const s=Math.max(0,(Date.now()-new Date(ts))/1000);if(s<60)return 'just now';if(s<3600)return `${Math.floor(s/60)}m ago`;if(s<86400)return `${Math.floor(s/3600)}h ago`;return `${Math.floor(s/86400)}d ago`;};
const haversine = (a,b) => {const R=6371000,r=x=>x*Math.PI/180;const dLat=r(b.lat-a.lat),dLng=r(b.lng-a.lng);const h=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const initials = n => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
const rnd = (a,b)=>a+Math.random()*(b-a);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const load = (k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f;}catch(e){return f;}};
const save = (k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const download = (name,content,mime)=>{const b=new Blob([content],{type:mime});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),800);};
const TZ = (()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){return 'local';}})();