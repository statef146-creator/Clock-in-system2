function GeoGauge({dist,radius,inside}){
  const f=Math.min(dist/(radius*1.5),1);
  const arcLen=Math.PI*84;
  const tickF=1/1.5,th=Math.PI*(1-tickF),tx=100+84*Math.cos(th),ty=100-84*Math.sin(th);
  const col=inside?C.green:C.red;
  return (
    <div className="gauge-wrap">
      <svg width="164" height="104" viewBox="0 0 200 118">
        <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={inside?C.green:C.amber}/><stop offset="100%" stopColor={col}/>
        </linearGradient></defs>
        <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="#16405a" strokeWidth="11" strokeLinecap="round"/>
        <path d="M 16 100 A 84 84 0 0 1 184 100" fill="none" stroke="url(#gg)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${f*arcLen} ${arcLen}`} style={{transition:'stroke-dasharray .5s cubic-bezier(.2,.8,.2,1)'}}/>
        <circle cx={tx} cy={ty} r="4.5" fill="#ffb224" stroke="#04121d" strokeWidth="2"/>
        <text x="100" y="78" textAnchor="middle" fill={col} fontFamily="JetBrains Mono" fontWeight="700" fontSize="30">{dist>9999?'—':Math.round(dist)}</text>
        <text x="100" y="98" textAnchor="middle" fill="#5f8496" fontFamily="JetBrains Mono" fontSize="11">metres to HQ</text>
      </svg>
      <div className="geostats">
        <div className="dist mono" style={{color:col}}>{inside?'IN ZONE':'OUT OF ZONE'}</div>
        <p>Fence radius <b className="mono" style={{color:C.cyan}}>{radius} m</b> · amber tick marks the boundary</p>
        <div className="passfail"><span className={'chip '+(inside?'ok':'bad')}><Icon name={inside?'check':'alert'} size={13}/> GEOFENCE {inside?'PASS':'FAIL'}</span></div>
      </div>
    </div>
  );
}

function VoicePanel({onCommand}){
  const {toast}=useApp();
  const [listening,setListening]=useState(false);
  const [transcript,setTranscript]=useState('');
  const recRef=useRef(null),toRef=useRef(null);
  const cmdRef=useRef(onCommand);cmdRef.current=onCommand;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  useEffect(()=>()=>{if(recRef.current){try{recRef.current.abort();}catch(e){}}clearTimeout(toRef.current);},[]);
  const start=()=>{
    if(!SR){toast('Voice needs Chrome or Edge — use the big button instead.','warn');return;}
    if(listening){try{recRef.current.stop();}catch(e){}return;}
    try{
      const rec=new SR();rec.lang='en-KE';rec.interimResults=true;rec.maxAlternatives=1;
      rec.onresult=ev=>{
        let txt=Array.from(ev.results).map(r=>r[0].transcript).join('');
        setTranscript(txt);
        const low=txt.toLowerCase();
        const isIn=/clock[\s-]?in|check[\s-]?in/.test(low),isOut=/clock[\s-]?out|check[\s-]?out/.test(low);
        if((isIn||isOut)&&ev.results[ev.results.length-1].isFinal){
          Sound.play('blip');cmdRef.current(isOut?'OUT':'IN');try{rec.stop();}catch(e){}
        }
      };
      rec.onerror=ev=>{setListening(false);if(ev.error==='not-allowed')toast('Microphone blocked — allow mic access in the browser.','bad');};
      rec.onend=()=>setListening(false);
      recRef.current=rec;rec.start();setListening(true);setTranscript('');
      toRef.current=setTimeout(()=>{try{rec.stop();}catch(e){}},9000);
    }catch(e){setListening(false);}
  };
  return (
    <div className="voice">
      <button className={'micbtn'+(listening?' listen':'')} onClick={start} aria-label="Voice clock-in"><Icon name="mic" size={22}/></button>
      <div className="vt">
        <b>{listening?'Listening… speak now':SR?'Voice command':'Voice unavailable in this browser'}</b>
        <span>{transcript?`“${transcript}”`:'Tap the mic, then say a command'}</span>
        <div className="cmdchips"><code>“clock in”</code><code>“clock out”</code></div>
        <div className={'wave'+(listening?' on':'')}><i/><i/><i/><i/><i/></div>
      </div>
    </div>
  );
}

function EmployeeView(){
  const app=useApp();
  const {employees,selectedEmp,setSelectedEmp,punches,settings,selfPos,gpsMode,setGpsMode,fieldMode,setFieldMode,doPunch,myRows,queue,openModal,hintSeen,setHintSeen,jumpSelf}=app;
  const emp=employees.find(e=>e.id===selectedEmp)||employees[0];
  const tk=todayKey();
  const myToday=useMemo(()=>punches.filter(p=>p.employee_id===emp.id&&dateKey(p.ts)===tk).sort((a,b)=>new Date(a.ts)-new Date(b.ts)),[punches,emp.id,tk]);
  const last=myToday[myToday.length-1];
  const nextType=last&&last.type==='IN'?'OUT':'IN';
  const dist=selfPos?haversine(selfPos,{lat:settings.lat,lng:settings.lng}):null;
  const inside=dist!=null&&dist<=settings.radius;
  const canPunch=selfPos&&(nextType==='OUT'||inside||fieldMode);
  const [burst,setBurst]=useState(0);
  const week=useMemo(()=>{
    const days=[];const now=new Date();
    for(let b=4;b>=0;b--){const d=new Date(now);d.setDate(d.getDate()-b);const k=dateKey(d);
      const row=myRows(k).find(r=>r.emp.id===emp.id);
      days.push({k,label:d.toLocaleDateString('en-GB',{weekday:'short'}),status:row?row.status:'ABSENT'});}
    return days;
  },[punches,emp.id]);
  const fire=(type,method)=>{
    const ok=doPunch(emp.id,type,{method,pos:selfPos,field:fieldMode&&!inside});
    if(ok)setBurst(b=>b+1);
  };
  const btnLabel=!selfPos?'LOCATING YOU…':nextType==='IN'?(canPunch?'CLOCK IN':'OUTSIDE GEOFENCE — CLOCK IN LOCKED'):'CLOCK OUT';
  return (
    <div className="view">
      {!hintSeen&&<div className="hintchip"><Icon name="pin" size={15} style={{color:C.cyan,flex:'none'}}/>
        <span><b style={{color:C.cyan}}>Try it:</b> in SIM GPS mode, drag the <b>ME</b> marker across the dashed fence and watch validation flip — then clock in.</span>
        <button onClick={()=>setHintSeen(true)} aria-label="Dismiss hint"><Icon name="x" size={14}/></button>
      </div>}
      <div className="station">
        <div>
          <div className="card" style={{animationDelay:'.05s'}}>
            <div className="card-h"><Icon name="clock" size={16} style={{color:C.cyan}}/><h3>Clock Station</h3><span className="sub mono">SHIFT {settings.shiftStart}–{settings.shiftEnd}</span></div>
            <div className="card-b">
              <label className="lbl">Clocking as</label>
              <div className="frow">
                <Avatar emp={emp}/>
                <select className="inp grow" value={emp.id} onChange={e=>setSelectedEmp(e.target.value)} aria-label="Select employee">
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
                </select>
              </div>
              <div style={{marginTop:14}}><LiveClock big/></div>
              <div className="dateline">{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {TZ.replace('_',' ')}</div>
              <div className="shiftrow">
                {myToday.length===0?<span className="chip mut">Not clocked in yet</span>:
                  <React.Fragment>
                    <StatusChip status={myToday.find(p=>p.type==='IN')?.status==='FIELD'?'FIELD':(minOfDay(myToday.find(p=>p.type==='IN').ts)>timeToMin(settings.shiftStart)+settings.grace?'LATE':'ON_TIME')}/>
                    <span className="chip info">In {fmtTime(myToday.find(p=>p.type==='IN').ts)}</span>
                    {last.type==='OUT'&&<span className="chip warn">Out {fmtTime(last.ts)}</span>}
                  </React.Fragment>}
                {queue.length>0&&<span className="chip warn"><Icon name="wifi" size={12}/>{queue.length} pending sync</span>}
              </div>
              <GeoGauge dist={dist==null?0:dist} radius={settings.radius} inside={!!inside}/>
              <button className={'punchbtn'+(nextType==='OUT'?' out':'')} disabled={!canPunch} onClick={()=>fire(nextType,'GPS')}>
                <span style={{display:'inline-flex',alignItems:'center',gap:10}}><Icon name={nextType==='IN'?'in':'out'} size={22}/>{btnLabel}</span>
                {burst>0&&<span key={burst}>
                  <span className="ripple"/>
                  <span className="droplets">{[...Array(9)].map((_,i)=><i key={i} style={{'--dx':`${rnd(-90,90)}px`,'--dy':`${rnd(-90,-30)}px`,animationDelay:`${i*.02}s`}}/>)}</span>
                </span>}
              </button>
              <div className="hintline">{nextType==='IN'&&!inside&&!fieldMode?'Move inside the fence or enable Field mode below.':`Next action: ${nextType==='IN'?'start shift':'end shift'} · GPS-tagged & timestamped`}</div>
              <div className="fieldrow">
                <Icon name="truck" size={20} style={{color:C.violet,flex:'none'}}/>
                <div className="t"><b>Field work mode</b><span>For meter readers & repair crews outside HQ</span></div>
                <Switch on={fieldMode} onChange={setFieldMode} label="Field work mode"/>
              </div>
              <VoicePanel onCommand={t=>{
                if(t!==nextType){app.toast(`Already ${t==='IN'?'clocked in':'clocked out'} — say “${nextType==='IN'?'clock in':'clock out'}”.`,'warn');Sound.play('fail');return;}
                if(!canPunch){app.toast('Geofence FAIL — clock-in blocked outside the zone.','bad');Sound.play('fail');return;}
                fire(t,'VOICE');
              }}/>
              <div className="frow" style={{marginTop:14,marginBottom:0}}>
                <button className="btn sm grow" onClick={()=>openModal({type:'badge',empId:emp.id})}><Icon name="qr" size={14}/> My QR badge</button>
                <div className="seg" style={{flex:1}}>
                  <button className={gpsMode==='live'?'on':''} onClick={()=>setGpsMode('live')}>Live GPS</button>
                  <button className={gpsMode==='demo'?'on':''} onClick={()=>setGpsMode('demo')}>Sim GPS</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="card" style={{animationDelay:'.12s'}}>
            <div className="card-h"><Icon name="pin" size={16} style={{color:C.cyan}}/><h3>Live Geofence Map</h3><span className="sub mono">{selfPos?`${selfPos.lat.toFixed(5)}, ${selfPos.lng.toFixed(5)}`:'acquiring…'}</span></div>
            <EmployeeMap/>
            <div className="telemetry mono">
              <span>ACC <b>±{selfPos?Math.round(selfPos.accuracy||0):'—'} m</b></span>
              <span>DIST <b>{dist!=null?Math.round(dist):'—'} m</b></span>
              <span>FENCE <b>{settings.radius} m</b></span>
              <span>MODE <b>{gpsMode==='demo'?'SIMULATED':'DEVICE GPS'}</b></span>
              <span style={{marginLeft:'auto',color:inside?C.green:C.red}}>{inside?'● VALIDATED':'● OUT OF RANGE'}</span>
            </div>
          </div>
          <div className="card" style={{marginTop:16,animationDelay:'.2s'}}>
            <div className="card-h"><Icon name="radio" size={16} style={{color:C.green}}/><h3>Today's Punches</h3><span className="sub">{myToday.length} events</span></div>
            <div className="card-b" style={{paddingTop:8,paddingBottom:10}}>
              {myToday.length===0?<div className="empty">No punches yet today. Your timeline will appear here the moment you clock in.</div>:
                <ul className="timeline">{myToday.slice().reverse().map(p=>(
                  <li key={p.id}>
                    <div className={'tl-ic '+p.type.toLowerCase()}><Icon name={p.type==='IN'?'in':'out'} size={15}/></div>
                    <div className="tt"><b>{p.type==='IN'?'Clocked in':'Clocked out'} {p.status==='FIELD'&&<span className="chip field" style={{marginLeft:6}}>FIELD</span>}{p.status==='LATE'&&<span className="chip warn" style={{marginLeft:6}}>LATE</span>}</b>
                      <span>{p.method} · {p.inside_fence?'inside HQ fence':'off-site'} · ±{Math.round(p.accuracy||0)} m{p.note?` · ${p.note}`:''}</span></div>
                    <div className="tm mono">{fmtTime(p.ts)}</div>
                  </li>))}
                </ul>}
              <label className="lbl" style={{marginTop:12}}>Last 5 days</label>
              <div className="weekstrip">{week.map(w=>(
                <div className="wd" key={w.k} title={`${fmtDateShort(w.k)} — ${(STATUS_META[w.status]||{}).label}`}>
                  <span>{w.label}</span><i style={{background:(STATUS_META[w.status]||STATUS_META.ABSENT).color,boxShadow:`0 0 7px ${(STATUS_META[w.status]||STATUS_META.ABSENT).color}`}}/>
                </div>))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}