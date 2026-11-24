function App(){
  const [view,setView]=useState('station');
  const [employees]=useState(EMPLOYEES);
  const [punches,setPunches]=useState(()=>load('nyw.punches.v1',null)||seedPunches());
  const [positions,setPositions]=useState(()=>load('nyw.positions.v1',null)||seedPositions());
  const [settings,setSettings]=useState(()=>({...{lat:OFFICE.lat,lng:OFFICE.lng,radius:250,shiftStart:'08:00',shiftEnd:'17:00',grace:15,simulate:true},...load('nyw.settings.v1',{})}));
  const [selectedEmp,setSelectedEmp]=useState(()=>load('nyw.emp',DEFAULT_EMP));
  const [selfPos,setSelfPos]=useState(()=>({lat:OFFICE.lat+0.0006,lng:OFFICE.lng+0.0004,accuracy:12,source:'demo'}));
  const [gpsMode,setGpsMode]=useState('live');
  const [fieldMode,setFieldMode]=useState(false);
  const [date,setDate]=useState(todayKey());
  const [filters,setFilters]=useState(()=>load('nyw.filters',{q:'',dept:'ALL',status:'ALL',sort:'name'}));
  const [selection,setSelection]=useState([]);
  const [drawer,setDrawer]=useState(null);
  const [modal,setModal]=useState(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [toasts,setToasts]=useState([]);
  const [mode,setMode]=useState('DEMO');
  const [creds,setCreds]=useState(()=>load('nyw.creds',{url:'',key:''}));
  const [queue,setQueue]=useState(()=>load('nyw.queue',[]));
  const [soundOn,setSoundOn]=useState(()=>load('nyw.sound',true));
  const [hintSeen,setHintSeen]=useState(()=>load('nyw.hint',false));
  const [panTarget,setPanTarget]=useState(null);
  const [online,setOnline]=useState(navigator.onLine);
  const clientRef=useRef(null),chanRef=useRef(null),toastTimers=useRef({});
  const stateRef=useRef({});stateRef.current={punches,settings,employees,selectedEmp,mode,queue};

  /* persistence */
  useEffect(()=>save('nyw.punches.v1',punches),[punches]);
  useEffect(()=>save('nyw.positions.v1',positions),[positions]);
  useEffect(()=>save('nyw.settings.v1',settings),[settings]);
  useEffect(()=>save('nyw.emp',selectedEmp),[selectedEmp]);
  useEffect(()=>save('nyw.filters',filters),[filters]);
  useEffect(()=>save('nyw.creds',creds),[creds]);
  useEffect(()=>save('nyw.queue',queue),[queue]);
  useEffect(()=>{save('nyw.sound',soundOn);Sound.setMuted(!soundOn);},[soundOn]);
  useEffect(()=>save('nyw.hint',hintSeen),[hintSeen]);
  useEffect(()=>{document.body.classList.toggle('locked',!!(drawer||modal||settingsOpen));},[drawer,modal,settingsOpen]);
  useEffect(()=>{const h=e=>{if(e.key==='Escape'){if(modal)setModal(null);else if(drawer)setDrawer(null);else if(settingsOpen)setSettingsOpen(false);}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[modal,drawer,settingsOpen]);
  useEffect(()=>{const on=()=>{setOnline(true);flushQueue();};const off=()=>setOnline(false);window.addEventListener('online',on);window.addEventListener('offline',off);return()=>{window.removeEventListener('online',on);window.removeEventListener('offline',off);};},[]);

  /* toasts */
  const toast=useCallback((msg,kind='info',action)=>{
    const id=uid();setToasts(t=>[...t.slice(-3),{id,msg,kind,action}]);
    toastTimers.current[id]=setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),action?6500:4200);
    return id;
  },[]);
  const dismissToast=id=>{clearTimeout(toastTimers.current[id]);setToasts(t=>t.filter(x=>x.id!==id));};

  /* geolocation */
  useEffect(()=>{
    if(gpsMode!=='live'||!navigator.geolocation){if(gpsMode==='live')setGpsMode('demo');return;}
    let got=false;
    const fallback=setTimeout(()=>{if(!got){setGpsMode('demo');toast('No GPS fix — switched to simulated location. Drag the ME marker to test.','warn');}},6000);
    const wid=navigator.geolocation.watchPosition(
      p=>{got=true;clearTimeout(fallback);setSelfPos({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,source:'live'});setPositions(ps=>({...ps,[stateRef.current.selectedEmp]:{lat:p.coords.latitude,lng:p.coords.longitude,ts:Date.now(),accuracy:p.coords.accuracy}}));},
      ()=>{clearTimeout(fallback);setGpsMode('demo');toast('GPS unavailable or denied — using simulated location.','warn');},
      {enableHighAccuracy:true,maximumAge:5000,timeout:8000}
    );
    return()=>{clearTimeout(fallback);navigator.geolocation.clearWatch(wid);};
  },[gpsMode]);
  useEffect(()=>{if(gpsMode==='demo'&&selfPos)setPositions(ps=>({...ps,[selectedEmp]:{lat:selfPos.lat,lng:selfPos.lng,ts:Date.now(),accuracy:selfPos.accuracy}}));},[selfPos,gpsMode,selectedEmp]);
  const jumpSelf=useCallback(where=>{
    const s=stateRef.current.settings;
    if(where==='in')setSelfPos({lat:s.lat+rnd(-.0006,.0006),lng:s.lng+rnd(-.0006,.0006),accuracy:10,source:'demo'});
    else setSelfPos({lat:s.lat+0.006+rnd(0,.003),lng:s.lng+0.005,accuracy:14,source:'demo'});
    setGpsMode('demo');
  },[]);

  /* derived rows */
  const myRows=useCallback(k=>{
    return employees.map(emp=>{
      const ps=punches.filter(p=>p.employee_id===emp.id&&dateKey(p.ts)===k).sort((a,b)=>new Date(a.ts)-new Date(b.ts));
      const firstIn=ps.find(p=>p.type==='IN')||null;
      const lastOut=[...ps].reverse().find(p=>p.type==='OUT')||null;
      const hours=firstIn&&lastOut?Math.max(0,(new Date(lastOut.ts)-new Date(firstIn.ts))/3600000):null;
      const status=!firstIn?'ABSENT':firstIn.status==='FIELD'?'FIELD':firstIn.status==='LATE'?'LATE':'ON_TIME';
      return {emp,punches:ps,firstIn,lastOut,hours,status};
    });
  },[employees,punches]);
  const rows=useMemo(()=>myRows(date),[myRows,date]);
  const stats=useMemo(()=>{
    const present=rows.filter(r=>r.status!=='ABSENT').length;
    const ins=rows.filter(r=>r.firstIn).map(r=>minOfDay(r.firstIn.ts));
    return {present,late:rows.filter(r=>r.status==='LATE').length,field:rows.filter(r=>r.status==='FIELD').length,
      absent:rows.filter(r=>r.status==='ABSENT').length,
      avgIn:ins.length?minToTime(Math.round(ins.reduce((a,b)=>a+b,0)/ins.length)):null,
      hours:+rows.reduce((a,r)=>a+(r.hours||0),0).toFixed(1)};
  },[rows]);
  const trend=useMemo(()=>{
    const labels=[],onTime=[],late=[],field=[],absent=[];
    for(let b=6;b>=0;b--){const d=new Date();d.setDate(d.getDate()-b);const k=dateKey(d);const rs=myRows(k);
      labels.push(d.toLocaleDateString('en-GB',{weekday:'short'}));
      onTime.push(rs.filter(r=>r.status==='ON_TIME').length);late.push(rs.filter(r=>r.status==='LATE').length);
      field.push(rs.filter(r=>r.status==='FIELD').length);absent.push(rs.filter(r=>r.status==='ABSENT').length);}
    return {labels,onTime,late,field,absent};
  },[myRows]);
  const deptData=useMemo(()=>{
    const labels=Object.keys(DEPT_COLOR);
    return {labels,values:labels.map(d=>rows.filter(r=>r.emp.department===d&&r.status!=='ABSENT').length)};
  },[rows]);
  const feed=useMemo(()=>punches.filter(p=>dateKey(p.ts)===todayKey()).sort((a,b)=>new Date(b.ts)-new Date(a.ts)).slice(0,9),[punches]);
  const livePositions=useMemo(()=>{
    if(mode!=='LIVE')return positions;
    const out={...positions};
    punches.forEach(p=>{if(p.lat!=null){const cur=out[p.employee_id];if(!cur||new Date(p.ts)>new Date(cur.ts))out[p.employee_id]={lat:p.lat,lng:p.lng,ts:new Date(p.ts).getTime(),accuracy:p.accuracy};}});
    return out;
  },[mode,positions,punches]);

  /* punch engine */
  const mergePunch=(list,row)=>{
    const clean=list.filter(p=>p.id!==row.id&&!(String(p.id).startsWith('tmp-')&&p.employee_id===row.employee_id&&p.type===row.type&&p.ts===row.ts));
    return [...clean,row];
  };
  const pushInsert=async row=>{
    const cl=clientRef.current;if(!cl)return;
    try{
      const {error}=await cl.from('punches').insert(row);
      if(error)throw error;
      setPunches(ps=>mergePunch(ps,row));
    }catch(e){
      setQueue(q=>[...q,{kind:'insert',row}]);
      toast('Saved locally — will sync to Supabase when reachable.','warn');
    }
  };
  const flushQueue=async()=>{
    const cl=clientRef.current;const q=stateRef.current.queue;if(!cl||q.length===0)return;
    const remaining=[];
    for(const op of q){
      try{
        if(op.kind==='insert'){const {error}=await cl.from('punches').insert(op.row);if(error)throw error;}
        if(op.kind==='update'){const {error}=await cl.from('punches').update(op.patch).eq('id',op.id);if(error)throw error;}
        if(op.kind==='delete'){const {error}=await cl.from('punches').delete().in('id',op.ids);if(error)throw error;}
      }catch(e){remaining.push(op);}
    }
    setQueue(remaining);
    if(remaining.length===0&&q.length>0)toast(`Synced ${q.length} queued change${q.length>1?'s':''} to Supabase.`,'ok');
  };
  useEffect(()=>{if(mode==='LIVE')flushQueue();},[mode,online]);

  const buildRow=(empId,type,opts)=>{
    const s=stateRef.current.settings;
    const pos=opts.pos||null;
    const dist=pos?haversine(pos,{lat:s.lat,lng:s.lng}):null;
    const inside=dist!=null?dist<=s.radius:true;
    const ts=opts.ts||new Date().toISOString();
    const late=minOfDay(ts)>timeToMin(s.shiftStart)+s.grace;
    const status=type==='OUT'?'OUT':(opts.field||!inside)?'FIELD':late?'LATE':'ON_TIME';
    return {id:opts.id||uid(),employee_id:empId,type,ts,lat:pos?pos.lat:null,lng:pos?pos.lng:null,
      accuracy:pos?(pos.accuracy||15):null,method:opts.method||'GPS',status,inside_fence:inside,note:opts.note||''};
  };
  const doPunch=useCallback((empId,type,opts)=>{
    const st=stateRef.current;
    const pos=opts.pos;
    const s=st.settings;
    const inside=pos?haversine(pos,{lat:s.lat,lng:s.lng})<=s.radius:true;
    if(type==='IN'&&!inside&&!opts.field&&opts.method!=='MANUAL'){toast('Geofence FAIL — you are outside the HQ zone.','bad');Sound.play('fail');return false;}
    const row=buildRow(empId,type,opts);
    setPunches(ps=>mergePunch(ps,row));
    if(pos)setPositions(ps=>({...ps,[empId]:{lat:pos.lat,lng:pos.lng,ts:Date.now(),accuracy:pos.accuracy}}));
    const emp=st.employees.find(e=>e.id===empId);
    if(st.mode==='LIVE')pushInsert(row);
    Sound.play(type==='IN'?'in':'out');
    toast(`${emp.name.split(' ')[0]} clocked ${type==='IN'?'in':'out'} at ${fmtTime(row.ts)} · ${row.status==='FIELD'?'FIELD DUTY':row.status==='LATE'?'LATE':'ON TIME'} · ${opts.method}`,'ok');
    return true;
  },[]);
  const addManual=useCallback((empId,type,day,time,note)=>{
    const [y,m,d]=day.split('-').map(Number);const [hh,mm]=time.split(':').map(Number);
    const ts=new Date(y,m-1,d,hh,mm).toISOString();
    const last=stateRef.current.punches.filter(p=>p.employee_id===empId).slice(-1)[0];
    doPunch(empId,type,{method:'MANUAL',ts,note,pos:last&&last.lat!=null?{lat:last.lat,lng:last.lng,accuracy:last.accuracy}:null,field:false,id:uid()});
  },[doPunch]);
  const updatePunch=useCallback((id,patch)=>{
    setPunches(ps=>ps.map(p=>p.id===id?{...p,...patch}:p));
    const st=stateRef.current;
    if(st.mode==='LIVE'&&clientRef.current){
      if(String(id).startsWith('tmp-')){setQueue(q=>[...q,{kind:'update',id,patch}]);return;}
      clientRef.current.from('punches').update(patch).eq('id',id).then(({error})=>{if(error){setQueue(q=>[...q,{kind:'update',id,patch}]);toast('Edit queued for sync.','warn');}});
    }
  },[]);
  const deletePunches=useCallback(ids=>{
    const snapshot=stateRef.current.punches.filter(p=>ids.includes(p.id));
    if(snapshot.length===0)return;
    setPunches(ps=>ps.filter(p=>!ids.includes(p.id)));
    const st=stateRef.current;
    if(st.mode==='LIVE'&&clientRef.current){
      clientRef.current.from('punches').delete().in('id',ids).then(({error})=>{if(error)setQueue(q=>[...q,{kind:'delete',ids}]);});
    }
    toast(`Deleted ${snapshot.length} punch${snapshot.length>1?'es':''}.`,'warn',{label:'Undo',fn:()=>{
      setPunches(ps=>{let out=ps;snapshot.forEach(r=>{out=mergePunch(out,r);});return out;});
      if(stateRef.current.mode==='LIVE'&&clientRef.current)clientRef.current.from('punches').insert(snapshot).then(()=>{});
      toast('Restored.','ok');
    }});
  },[]);

  /* supabase */
  const connect=useCallback(async()=>{
    if(!window.supabase){toast('Supabase library failed to load — check your internet connection.','bad');return;}
    if(!/^https:\/\/.+\.supabase\.(co|in)/.test(creds.url.trim())||creds.key.trim().length<20){toast('Enter a valid project URL and anon key from Supabase → Settings → API.','warn');return;}
    try{
      const cl=window.supabase.createClient(creds.url.trim(),creds.key.trim());
      const {data:emps,error:e1}=await cl.from('employees').select('*').order('id');
      if(e1)throw e1;
      const since=new Date();since.setDate(since.getDate()-8);
      const {data:pns,error:e2}=await cl.from('punches').select('*').gte('ts',since.toISOString()).order('ts');
      if(e2)throw e2;
      clientRef.current=cl;
      if(pns&&pns.length)setPunches(pns);
      if(!emps||emps.length===0)toast('Connected ✓ — employees table is empty. Use “Push demo data” to seed it.','info');
      else toast(`Connected ✓ — ${emps.length} employees, ${pns?pns.length:0} punches loaded.`,'ok');
      chanRef.current=cl.channel('nyw-punches').on('postgres_changes',{event:'*',schema:'public',table:'punches'},payload=>{
        if(payload.eventType==='INSERT'){setPunches(ps=>mergePunch(ps,payload.new));Sound.play('live');}
        if(payload.eventType==='UPDATE'){setPunches(ps=>ps.map(p=>p.id===payload.new.id?payload.new:p));}
        if(payload.eventType==='DELETE'){setPunches(ps=>ps.filter(p=>p.id!==payload.old.id));}
      }).subscribe();
      setMode('LIVE');setSettingsOpen(false);
    }catch(e){
      toast('Connection failed: '+(e.message||'check URL, key and that the SQL schema has been run.'),'bad');
    }
  },[creds]);
  const disconnect=useCallback(()=>{
    if(chanRef.current&&clientRef.current){try{clientRef.current.removeChannel(chanRef.current);}catch(e){}}
    chanRef.current=null;clientRef.current=null;setMode('DEMO');toast('Disconnected — back to demo mode.','info');
  },[]);
  const refreshLive=useCallback(async()=>{
    const cl=clientRef.current;if(!cl)return;
    const since=new Date();since.setDate(since.getDate()-8);
    const {data,error}=await cl.from('punches').select('*').gte('ts',since.toISOString()).order('ts');
    if(error){toast('Refresh failed: '+error.message,'bad');return;}
    setPunches(data||[]);toast('Refreshed from Supabase.','ok');
  },[]);
  const pushDemo=useCallback(async()=>{
    const cl=clientRef.current;if(!cl)return;
    const st=stateRef.current;
    try{
      const {error:e1}=await cl.from('employees').upsert(st.employees);
      if(e1)throw e1;
      const rows=st.punches.filter(p=>!String(p.id).startsWith('tmp-'));
      const {error:e2}=await cl.from('punches').upsert(rows);
      if(e2)throw e2;
      toast(`Pushed ${st.employees.length} employees & ${rows.length} punches to Supabase.`,'ok');
    }catch(e){toast('Push failed: '+e.message,'bad');}
  },[]);

  /* demo simulation */
  useEffect(()=>{
    if(mode!=='DEMO'||!settings.simulate)return;
    const drift=setInterval(()=>{
      setPositions(ps=>{const out={...ps};FIELD_IDS.forEach(id=>{const p=out[id];if(p)out[id]={...p,lat:p.lat+rnd(-.0007,.0007),lng:p.lng+rnd(-.0007,.0007),ts:Date.now()};});return out;});
    },8000);
    const act=setInterval(()=>{
      const st=stateRef.current;const tk=todayKey();
      const candidates=st.employees.filter(e=>e.id!==st.selectedEmp&&!st.punches.some(p=>p.employee_id===e.id&&p.type==='IN'&&dateKey(p.ts)===tk));
      if(candidates.length===0)return;
      const emp=pick(candidates);
      const field=FIELD_IDS.includes(emp.id);
      const pos=field?{lat:st.settings.lat+rnd(-.02,.02),lng:st.settings.lng+rnd(-.02,.02),accuracy:rnd(8,20)}:{lat:st.settings.lat+rnd(-.001,.001),lng:st.settings.lng+rnd(-.001,.001),accuracy:rnd(5,15)};
      const row=buildRow(emp.id,'IN',{method:'GPS',pos,field});
      setPunches(ps=>mergePunch(ps,row));
      setPositions(ps=>({...ps,[emp.id]:{lat:pos.lat,lng:pos.lng,ts:Date.now(),accuracy:pos.accuracy}}));
      Sound.play('live');
      toast(`Live · ${emp.name} clocked in (${row.status==='FIELD'?'field':row.status.toLowerCase().replace('_',' ')}).`,'info');
    },32000);
    return()=>{clearInterval(drift);clearInterval(act);};
  },[mode,settings.simulate]);

  /* csv */
  const exportCSV=useCallback((rs,label)=>{
    const esc=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`;
    const head=['Employee ID','Name','Department','Role','Date','First In','Last Out','Hours','Status','Methods','Latitude','Longitude','Inside Fence'];
    const lines=[head.join(',')];
    rs.forEach(r=>{
      const pos=livePositions[r.emp.id]||{};
      lines.push([r.emp.id,r.emp.name,r.emp.department,r.emp.role,date,
        r.firstIn?fmtTime(r.firstIn.ts):'',r.lastOut?fmtTime(r.lastOut.ts):'',
        r.hours!=null?r.hours.toFixed(2):'',(STATUS_META[r.status]||{}).label,
        [...new Set(r.punches.map(p=>p.method))].join(' / '),
        pos.lat!=null?pos.lat.toFixed(6):'',pos.lng!=null?pos.lng.toFixed(6):'',
        r.punches.length?(r.punches[0].inside_fence?'YES':'NO'):''].map(esc).join(','));
    });
    download(`nyewasco-attendance-${label||date}.csv`,'\uFEFF'+lines.join('\r\n'),'text/csv;charset=utf-8');
    toast(`Exported ${rs.length} records to CSV.`,'ok');
  },[date,livePositions]);

  const resetDemo=useCallback(()=>{
    ['nyw.punches.v1','nyw.positions.v1','nyw.queue'].forEach(k=>localStorage.removeItem(k));
    setPunches(seedPunches());setPositions(seedPositions());setQueue([]);setSelection([]);
    toast('Demo data reset & re-seeded.','ok');
  },[]);

  const ctx={
    employees,punches,positions:livePositions,settings,setSettings,selectedEmp,setSelectedEmp,
    selfPos,setSelfPos,gpsMode,setGpsMode,fieldMode,setFieldMode,jumpSelf,
    date,setDate,filters,setFilters,selection,setSelection,rows,stats,trend,deptData,feed,myRows,
    doPunch,addManual,updatePunch,deletePunches,exportCSV,
    drawer,openDrawer:id=>setDrawer(id),closeDrawer:()=>setDrawer(null),
    modal,openModal:m=>setModal(m),closeModal:()=>setModal(null),
    settingsOpen,openSettings:()=>setSettingsOpen(true),closeSettings:()=>setSettingsOpen(false),
    toast,mode,connect,disconnect,pushDemo,refreshLive,creds,setCreds,queue,
    soundOn,setSoundOn,hintSeen,setHintSeen,panTarget,setPanTarget,resetDemo,online,
  };

  return (
    <Ctx.Provider value={ctx}>
      <header>
        <div className="brand">
          <div className="drop"><Drop size={21}/></div>
          <div><h1>Staff<em>Clock</em> · NYEWASCO</h1><div className="flag"><i/><i/><i/></div><small>Nyeri Water & Sanitation</small></div>
        </div>
        <nav className="tabs">
          <button className={view==='station'?'on':''} onClick={()=>setView('station')}><Icon name="clock" size={14}/><span className="tl">Clock Station</span></button>
          <button className={view==='supervisor'?'on':''} onClick={()=>setView('supervisor')}><Icon name="users" size={14}/><span className="tl">Supervisor</span></button>
        </nav>
        <div className="hspace"/>
        <div className={'led '+(mode==='LIVE'?(online?'live':'off'):'demo')} title={mode==='LIVE'?'Connected to Supabase realtime':'Local demo dataset'}><i/>{mode==='LIVE'?(online?'LIVE':'OFFLINE'):'DEMO'}</div>
        <button className="icobtn" onClick={()=>setSoundOn(s=>!s)} aria-label={soundOn?'Mute sounds':'Unmute sounds'} title={soundOn?'Sound on':'Sound muted'} style={{color:soundOn?C.cyan:undefined}}><Icon name={soundOn?'vol':'volx'} size={17}/></button>
        <button className="icobtn" onClick={()=>setSettingsOpen(true)} aria-label="Settings"><Icon name="gear" size={17}/></button>
        <LiveClock/>
      </header>
      <div id="app-shell">
        {view==='station'?<EmployeeView key="station"/>:<SupervisorView key="supervisor"/>}
        <footer>
          <span><b style={{color:C.cyan}}>StaffClock</b> for NYEWASCO · Nyeri County</span><span className="fdotsep"/>
          <span>{mode==='LIVE'?'Synced to Supabase in realtime':'Demo data lives on this device — add Supabase keys in Settings to go live'}</span>
          <span className="fdotsep"/>
          <span>Kenya DPA 2019: attendance & GPS are personal data — obtain staff consent before deployment.</span>
        </footer>
      </div>
      {drawer&&<EmployeeDrawer/>}
      {settingsOpen&&<SettingsDrawer/>}
      {modal&&modal.type==='badge'&&<BadgeSheet empId={modal.empId} onClose={()=>setModal(null)}/>}
      {modal&&modal.type==='report'&&<ReportSheet onClose={()=>setModal(null)}/>}
      {modal&&modal.type==='manual'&&<ManualModal onClose={()=>setModal(null)}/>}
      <div className="toasts">
        {toasts.map(t=>(
          <div key={t.id} className={'toast '+t.kind}>
            <Icon name={t.kind==='ok'?'check':t.kind==='bad'?'alert':t.kind==='warn'?'alert':'radio'} size={15} style={{color:t.kind==='ok'?C.green:t.kind==='bad'?C.red:t.kind==='warn'?C.amber:C.cyan,flex:'none'}}/>
            <span className="tmsg">{t.msg}</span>
            {t.action&&<button className="tact" onClick={()=>{t.action.fn();dismissToast(t.id);}}><Icon name="undo" size={11}/> {t.action.label}</button>}
            <button className="tx" onClick={()=>dismissToast(t.id)} aria-label="Dismiss"><Icon name="x" size={13}/></button>
          </div>))}
      </div>
    </Ctx.Provider>
  );
}