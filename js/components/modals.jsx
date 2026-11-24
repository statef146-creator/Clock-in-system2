function useQR(text,size=440){
  const [src,setSrc]=useState(null);
  useEffect(()=>{let alive=true;
    if(window.QRCode&&text){QRCode.toDataURL(text,{width:size,margin:1,color:{dark:'#06202a',light:'#ffffff'}}).then(u=>{if(alive)setSrc(u);}).catch(()=>{});}
    return()=>{alive=false;};
  },[text,size]);
  return src;
}

function BadgeSheet({empId,onClose}){
  const {employees}=useApp();
  const emp=employees.find(e=>e.id===empId);
  const payload=`NYW|${emp.id}|${emp.badge_code}`;
  const qr=useQR(payload,440);
  return ReactDOM.createPortal(
    <div className="modal-wrap"><div className="scrim" onClick={onClose}/>
      <div className="sheet" role="dialog" aria-label="Employee badge" style={{position:'relative',zIndex:1}}>
        <div className="badge-paper">
          <div className="bh"><div className="drop"><Drop size={22}/></div><div><h2>NYEWASCO</h2><p>Nyeri Water & Sanitation Co. Ltd</p></div></div>
          <Avatar emp={emp} size={64}/>
          <h3>{emp.name}</h3><div className="role">{emp.role}</div><div className="dept">{emp.department} Department</div>
          {qr?<img src={qr} alt={'QR badge for '+emp.name}/>:<div className="empty" style={{color:'#5b7d8c'}}>Generating QR…</div>}
          <div className="bcode">{emp.id} · {emp.badge_code}</div>
          <div className="bfoot">Scan at the gate kiosk or supervisor console to verify identity. If found, return to NYEWASCO HQ, Nyeri. This badge remains property of the company.</div>
        </div>
        <div className="sheet-actions">
          <button className="btn pri grow" disabled={!qr} onClick={()=>{const a=document.createElement('a');a.href=qr;a.download=`${emp.id}-badge-qr.png`;a.click();}}><Icon name="dl" size={14}/>Download QR</button>
          <button className="btn grow" onClick={()=>window.print()}><Icon name="print" size={14}/>Print badge</button>
          <button className="btn ghost" onClick={onClose}><Icon name="x" size={14}/>Close</button>
        </div>
      </div>
    </div>,document.getElementById('print-root'));
}

function ReportSheet({onClose}){
  const app=useApp();
  const {employees,date,settings,mode,exportCSV,myRows}=app;
  const [range,setRange]=useState('daily');
  const days=useMemo(()=>{const arr=[];const [y,m,d]=date.split('-').map(Number);for(let b=6;b>=0;b--){const x=new Date(y,m-1,d-b);arr.push(dateKey(x));}return arr;},[date]);
  const rowsFor=k=>myRows(k);
  const dailyRows=rowsFor(date);
  const summary=(rs)=>{
    const present=rs.filter(r=>r.status!=='ABSENT').length;
    return {present,late:rs.filter(r=>r.status==='LATE').length,field:rs.filter(r=>r.status==='FIELD').length,absent:rs.filter(r=>r.status==='ABSENT').length,onTime:rs.filter(r=>r.status==='ON_TIME').length,total:rs.length};
  };
  const s=summary(dailyRows);
  const pct=s.total?Math.round(s.present/s.total*100):0;
  const deptAgg=Object.keys(DEPT_COLOR).map(dep=>{const rs=dailyRows.filter(r=>r.emp.department===dep);return {dep,...summary(rs)};});
  const exceptions=dailyRows.filter(r=>r.status!=='ON_TIME');
  const weekly=days.map(k=>({k,...summary(rowsFor(k)),avg:(()=>{const ins=rowsFor(k).filter(r=>r.firstIn).map(r=>minOfDay(r.firstIn.ts));return ins.length?minToTime(Math.round(ins.reduce((a,b)=>a+b,0)/ins.length)):'—';})()}));
  const perEmp=employees.map(e=>{
    let present=0,late=0,hours=0;
    days.forEach(k=>{const r=rowsFor(k).find(x=>x.emp.id===e.id);if(r&&r.status!=='ABSENT'){present++;if(r.status==='LATE')late++;if(r.hours)hours+=r.hours;}});
    return {e,present,late,hours};
  });
  const gen=new Date().toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const exportRange=()=>{
    if(range==='daily'){exportCSV(dailyRows);return;}
    let all=[];days.forEach(k=>{all=all.concat(rowsFor(k));});exportCSV(all,'weekly');
  };
  return ReactDOM.createPortal(
    <div className="modal-wrap"><div className="scrim" onClick={onClose}/>
      <div className="sheet wide" role="dialog" aria-label="Attendance report" style={{position:'relative',zIndex:1}}>
        <div className="rtoggle">
          <button className={range==='daily'?'on':''} onClick={()=>setRange('daily')}>Daily report</button>
          <button className={range==='weekly'?'on':''} onClick={()=>setRange('weekly')}>7-day report</button>
        </div>
        <div className="report-paper">
          <div className="rh">
            <div className="drop"><Drop size={26}/></div>
            <div><h2>NYEWASCO</h2><p>Nyeri Water & Sanitation Company Ltd · Human Resource Department</p><p style={{fontWeight:700,color:'#0a5d78',marginTop:2}}>{range==='daily'?'DAILY ATTENDANCE REPORT':'WEEKLY ATTENDANCE REPORT'}</p></div>
            <div className="rmeta">REF: NYW/HR/ATT/{date.replace(/-/g,'')}<br/>Generated {gen}<br/>Source: {mode==='LIVE'?'SUPABASE LIVE':'DEMO DATASET'}</div>
          </div>
          {range==='daily'?<React.Fragment>
            <div className="summary"><b>{fmtDate(date)}.</b> {s.present} of {s.total} staff reported for duty ({pct}% attendance) — {s.onTime} on time, {s.late} late (after {minToTime(timeToMin(settings.shiftStart)+settings.grace)}), {s.field} on field duty and {s.absent} absent. Shift window {settings.shiftStart}–{settings.shiftEnd}; geofence {settings.radius} m around HQ.</div>
            <h3>Department summary</h3>
            <table><thead><tr><th>Department</th><th>Staff</th><th>Present</th><th>On time</th><th>Late</th><th>Field</th><th>Absent</th></tr></thead>
              <tbody>{deptAgg.map(d=><tr key={d.dep}><td>{d.dep}</td><td>{d.total}</td><td>{d.present}</td><td>{d.onTime}</td><td>{d.late}</td><td>{d.field}</td><td>{d.absent}</td></tr>)}</tbody></table>
            <h3>Full attendance register</h3>
            <table><thead><tr><th>ID</th><th>Name</th><th>Dept</th><th>First in</th><th>Last out</th><th>Hours</th><th>Status</th><th>Method</th></tr></thead>
              <tbody>{dailyRows.map(r=><tr key={r.emp.id}><td>{r.emp.id}</td><td>{r.emp.name}</td><td>{r.emp.department}</td><td>{r.firstIn?fmtTime(r.firstIn.ts):'—'}</td><td>{r.lastOut?fmtTime(r.lastOut.ts):'—'}</td><td>{r.hours!=null?r.hours.toFixed(1):'—'}</td><td className={'rs '+r.status}>{(STATUS_META[r.status]||{}).label}</td><td>{[...new Set(r.punches.map(p=>p.method))].join(', ')||'—'}</td></tr>)}</tbody></table>
            <h3>Exceptions & remarks</h3>
            {exceptions.length===0?<p style={{color:'#5b7d8c'}}>No exceptions — all staff reported on time.</p>:
              <table><thead><tr><th>Employee</th><th>Exception</th><th>Detail</th></tr></thead>
                <tbody>{exceptions.map(r=><tr key={r.emp.id}><td>{r.emp.name}</td><td className={'rs '+r.status}>{(STATUS_META[r.status]||{}).label}</td><td>{r.status==='ABSENT'?'No clock-in recorded for this date.':r.status==='FIELD'?'Clocked in off-site — field duty (GPS tagged).':`Arrived ${fmtTime(r.firstIn.ts)}, beyond the ${settings.grace}-minute grace.`}</td></tr>)}</tbody></table>}
          </React.Fragment>:<React.Fragment>
            <div className="summary"><b>Period: {fmtDateShort(days[0])} — {fmtDateShort(days[6])}.</b> Average daily attendance {Math.round(weekly.reduce((a,w)=>a+(w.total?w.present/w.total:0),0)/7*100)}%. Total late arrivals {weekly.reduce((a,w)=>a+w.late,0)}, field deployments {weekly.reduce((a,w)=>a+w.field,0)} across the period.</div>
            <h3>Day-by-day breakdown</h3>
            <table><thead><tr><th>Date</th><th>Present</th><th>On time</th><th>Late</th><th>Field</th><th>Absent</th><th>Avg check-in</th></tr></thead>
              <tbody>{weekly.map(w=><tr key={w.k}><td>{fmtDateShort(w.k)}</td><td>{w.present}/{w.total}</td><td>{w.onTime}</td><td>{w.late}</td><td>{w.field}</td><td>{w.absent}</td><td>{w.avg}</td></tr>)}</tbody></table>
            <h3>Per-employee summary</h3>
            <table><thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Days present</th><th>Late count</th><th>Total hours</th></tr></thead>
              <tbody>{perEmp.map(p=><tr key={p.e.id}><td>{p.e.id}</td><td>{p.e.name}</td><td>{p.e.department}</td><td>{p.present} / 7</td><td>{p.late}</td><td>{p.hours.toFixed(1)}</td></tr>)}</tbody></table>
          </React.Fragment>}
          <div className="sigs"><div>Prepared by · HR Officer</div><div>Verified by · Technical Manager</div><div>Date & official stamp</div></div>
          <div className="rfoot">Generated by StaffClock · NYEWASCO. Attendance and location data are personal data under the Kenya Data Protection Act (2019) — handle per company retention policy. {mode==='LIVE'?'Figures read live from Supabase.':'Figures from the on-device demo dataset.'}</div>
        </div>
        <div className="sheet-actions">
          <button className="btn pri grow" onClick={()=>window.print()}><Icon name="print" size={14}/>Print / Save PDF</button>
          <button className="btn grow" onClick={exportRange}><Icon name="dl" size={14}/>Export CSV</button>
          <button className="btn ghost" onClick={onClose}><Icon name="x" size={14}/>Close</button>
        </div>
      </div>
    </div>,document.getElementById('print-root'));
}

function ManualModal({onClose}){
  const {employees,addManual,date}=useApp();
  const [emp,setEmp]=useState(employees[0].id);
  const [type,setType]=useState('IN');
  const [time,setTime]=useState(fmtTime(Date.now()));
  const [note,setNote]=useState('');
  return (
    <div className="modal-wrap"><div className="scrim" onClick={onClose}/>
      <div className="modal" role="dialog" aria-label="Manual entry" style={{position:'relative',zIndex:1}}>
        <div className="modal-h"><Icon name="plus" size={16} style={{color:C.cyan}}/><h3>Manual punch entry</h3><button className="icobtn" onClick={onClose} aria-label="Close"><Icon name="x" size={15}/></button></div>
        <div className="modal-b">
          <label className="lbl">Employee</label>
          <select className="inp" value={emp} onChange={e=>setEmp(e.target.value)} style={{marginBottom:11}}>{employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.id}</option>)}</select>
          <div className="frow">
            <div className="grow"><label className="lbl">Type</label><select className="inp" value={type} onChange={e=>setType(e.target.value)}><option>IN</option><option>OUT</option></select></div>
            <div className="grow"><label className="lbl">Time · {fmtDateShort(date)}</label><input type="time" className="inp mono" value={time} onChange={e=>setTime(e.target.value)}/></div>
          </div>
          <label className="lbl">Reason / note</label>
          <input className="inp" placeholder="e.g. Device failure, approved off-site duty" value={note} onChange={e=>setNote(e.target.value)} style={{marginBottom:14}}/>
          <button className="btn pri" style={{width:'100%'}} onClick={()=>{if(!time)return;addManual(emp,type,date,time,note||'Manual entry');onClose();}}><Icon name="check" size={14}/>Record entry</button>
        </div>
      </div>
    </div>
  );
}