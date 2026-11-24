const LiveClock = ({big}) => {
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const t=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(t);},[]);
  const t=`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  if(big)return <div className="bigclock mono">{t.slice(0,5)}<small>:{pad(now.getSeconds())}</small></div>;
  return <div className="hclock mono">{t}<small>{TZ.split('/').pop().replace('_',' ')}</small></div>;
};
const Switch = ({on,onChange,label}) => <button type="button" role="switch" aria-checked={on} aria-label={label} className={'switch'+(on?' on':'')} onClick={()=>onChange(!on)}/>;
const StatusChip = ({status}) => {const m=STATUS_META[status]||STATUS_META.ABSENT;return <span className={'chip '+m.cls}>{m.label}</span>;};
const Avatar = ({emp,size}) => <div className="avatar" style={{background:`linear-gradient(135deg,${emp.color},#0e7f96)`,width:size,height:size,fontSize:size?size*.32:undefined}}>{initials(emp.name)}</div>;