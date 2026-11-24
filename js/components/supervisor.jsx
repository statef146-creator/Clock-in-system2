function SupervisorView(){
  const app=useApp();
  const {employees,punches,rows,stats,date,setDate,filters,setFilters,selection,setSelection,exportCSV,openModal,openDrawer,deletePunches,trend,deptData,feed,mode,settings}=app;
  const filtered=useMemo(()=>{
    let r=rows;
    if(filters.q){const q=filters.q.toLowerCase();r=r.filter(x=>x.emp.name.toLowerCase().includes(q)||x.emp.id.toLowerCase().includes(q)||x.emp.role.toLowerCase().includes(q));}
    if(filters.dept!=='ALL')r=r.filter(x=>x.emp.department===filters.dept);
    if(filters.status!=='ALL')r=r.filter(x=>x.status===filters.status);
    const s=filters.sort;
    r=r.slice().sort((a,b)=>{
      if(s==='name')return a.emp.name.localeCompare(b.emp.name);
      if(s==='time')return (a.firstIn?new Date(a.firstIn.ts):Infinity)-(b.firstIn?new Date(b.firstIn.ts):Infinity);
      if(s==='status')return a.status.localeCompare(b.status);
      if(s==='dept')return a.emp.department.localeCompare(b.emp.department);
      return 0;
    });
    return r;
  },[rows,filters]);
  const allSel=filtered.length>0&&filtered.every(r=>selection.includes(r.emp.id));
  const toggleAll=()=>setSelection(allSel?[]:filtered.map(r=>r.emp.id));
  const toggleOne=id=>setSelection(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const bulkDelete=()=>{
    const ids=punches.filter(p=>selection.includes(p.employee_id)&&dateKey(p.ts)===date).map(p=>p.id);
    if(ids.length===0){app.toast('No punches to delete for the selected staff on this date.','warn');return;}
    deletePunches(ids);setSelection([]);
  };
  const statCards=[
    {v:stats.present,l:'Present',c:C.green,i:'users'},
    {v:stats.late,l:'Late arrivals',c:C.amber,i:'alert'},
    {v:stats.field,l:'On field duty',c:C.violet,i:'truck'},
    {v:stats.absent,l:'Absent',c:C.red,i:'x'},
    {v:stats.avgIn||'—',l:'Avg check-in',c:C.cyan,i:'clock'},
    {v:stats.hours+'h',l:'Hours logged',c:C.blue,i:'gauge'},
  ];
  return (
    <div className="view">
      <div className="stats">
        {statCards.map((s,i)=>(
          <div className="card stat" key={s.l} style={{'--sc':s.c,animationDelay:`${i*.05}s`}}>
            <div className="sv mono">{s.v}</div><div className="sl">{s.l}</div><Icon name={s.i} size={22} className="si"/>
          </div>))}
      </div>
      <div className="supgrid">
        <div className="card" style={{animationDelay:'.1s'}}>
          <div className="card-h"><Icon name="pin" size={16} style={{color:C.cyan}}/><h3>Live Staff Map</h3><span className="sub">{mode==='LIVE'?'streaming from Supabase':'simulated telemetry'} · click a marker</span></div>
          <FleetMap/>
          <div className="legend">
            {Object.entries(STATUS_META).map(([k,m])=><span key={k}><i style={{background:m.color}}/>{m.label}</span>)}
            <span style={{marginLeft:'auto'}}><i style={{background:C.cyan}}/>HQ geofence · {settings.radius} m</span>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card chartcard" style={{animationDelay:'.16s'}}>
            <div className="card-h"><Icon name="gauge" size={15} style={{color:C.green}}/><h3>7-Day Attendance</h3></div>
            <TrendChart data={trend}/>
          </div>
          <div className="card chartcard" style={{animationDelay:'.22s'}}>
            <div className="card-h"><Icon name="users" size={15} style={{color:C.violet}}/><h3>Present by Department</h3><span className="sub">{fmtDateShort(date)}</span></div>
            <DeptChart data={deptData}/>
          </div>
        </div>
      </div>
      <div className="supbottom">
        <div className="card tablecard" style={{animationDelay:'.26s'}}>
          <div className="toolbar">
            <input type="date" className="inp mono" value={date} max={todayKey()} onChange={e=>{setDate(e.target.value);setSelection([]);}} aria-label="Attendance date"/>
            <div className="search"><Icon name="search" size={14}/><input className="inp" placeholder="Search name, ID, role…" value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))}/></div>
            <select className="inp" value={filters.dept} onChange={e=>setFilters(f=>({...f,dept:e.target.value}))} aria-label="Department filter">
              <option value="ALL">All departments</option>{Object.keys(DEPT_COLOR).map(d=><option key={d}>{d}</option>)}
            </select>
            <select className="inp" value={filters.sort} onChange={e=>setFilters(f=>({...f,sort:e.target.value}))} aria-label="Sort">
              <option value="name">Sort · Name A–Z</option><option value="time">Sort · Earliest in</option><option value="status">Sort · Status</option><option value="dept">Sort · Department</option>
            </select>
            <button className="btn sm" onClick={()=>openModal({type:'manual'})}><Icon name="plus" size={14}/> Manual entry</button>
            <button className="btn sm" onClick={()=>exportCSV(filtered)}><Icon name="dl" size={14}/> CSV</button>
            <button className="btn sm pri" onClick={()=>openModal({type:'report'})}><Icon name="file" size={14}/> Generate report</button>
          </div>
          <div className="chipsrow">
            {[['ALL','All staff'],['ON_TIME','On time'],['LATE','Late'],['FIELD','Field'],['ABSENT','Absent']].map(([k,l])=>(
              <button key={k} className={'fchip'+(filters.status===k?' on':'')} onClick={()=>setFilters(f=>({...f,status:k}))}>{l}{k!=='ALL'&&<span className="mono" style={{marginLeft:5,opacity:.7}}>{rows.filter(r=>k==='ABSENT'?r.status==='ABSENT':r.status===k).length}</span>}</button>))}
            {selection.length>0&&<div className="bulkbar">
              <b>{selection.length} selected</b>
              <button className="btn sm" onClick={()=>exportCSV(filtered.filter(r=>selection.includes(r.emp.id)))}><Icon name="dl" size={12}/>Export</button>
              <button className="btn sm danger" onClick={bulkDelete}><Icon name="trash" size={12}/>Delete punches</button>
              <button className="btn sm ghost" onClick={()=>setSelection([])}>Clear</button>
            </div>}
          </div>
          <div className="table-scroll">
            <table className="att">
              <thead><tr>
                <th style={{width:34}}><input type="checkbox" className="cb" checked={allSel} onChange={toggleAll} aria-label="Select all"/></th>
                <th>Employee</th><th>Department</th><th>First in</th><th>Last out</th><th>Hours</th><th>Status</th><th>Method</th><th style={{width:80}}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan="9"><div className="empty">No records match these filters.</div></td></tr>}
                {filtered.map(r=>(
                  <tr key={r.emp.id} className={selection.includes(r.emp.id)?'sel':''} onClick={()=>openDrawer(r.emp.id)}>
                    <td onClick={e=>e.stopPropagation()}><input type="checkbox" className="cb" checked={selection.includes(r.emp.id)} onChange={()=>toggleOne(r.emp.id)} aria-label={'Select '+r.emp.name}/></td>
                    <td><div className="empcell"><Avatar emp={r.emp}/><div><b>{r.emp.name}</b><span>{r.emp.id} · {r.emp.role}</span></div></div></td>
                    <td><span className="chip mut" style={{borderColor:r.emp.color+'55',color:r.emp.color}}>{r.emp.department}</span></td>
                    <td className="mono" style={{color:r.firstIn?C.cyan:'var(--dim)'}}>{r.firstIn?fmtTime(r.firstIn.ts):'—'}</td>
                    <td className="mono" style={{color:r.lastOut?C.amber:'var(--dim)'}}>{r.lastOut?fmtTime(r.lastOut.ts):'—'}</td>
                    <td className="mono">{r.hours!=null?r.hours.toFixed(1):'—'}</td>
                    <td><StatusChip status={r.status}/></td>
                    <td><div className="meths">{[...new Set(r.punches.map(p=>p.method))].map(m=><span key={m} title={m}><Icon name={m==='VOICE'?'mic':m==='MANUAL'?'edit':m==='QR'?'qr':'pin'} size={13}/></span>)}</div></td>
                    <td onClick={e=>e.stopPropagation()}><div className="rowacts">
                      <button title="View detail" onClick={()=>openDrawer(r.emp.id)}><Icon name="eye" size={14}/></button>
                      <button title="Delete day punches" className="del" onClick={()=>{const ids=r.punches.map(p=>p.id);if(ids.length)deletePunches(ids);else app.toast('Nothing to delete — no punches on this date.','warn');}}><Icon name="trash" size={14}/></button>
                    </div></td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card feed" style={{animationDelay:'.32s'}}>
          <div className="card-h"><span className="livedot"/><h3>Live Punch Feed</h3><span className="sub">today</span></div>
          {feed.length===0?<div className="empty">Waiting for activity…</div>:
            <ul>{feed.map(p=>{const e=employees.find(x=>x.id===p.employee_id);if(!e)return null;return (
              <li key={p.id}>
                <Avatar emp={e}/>
                <div className="ft"><b>{e.name}</b><span>{p.method} · {relTime(p.ts)}{p.status==='FIELD'?' · field':''}</span></div>
                <span className={'fm '+p.type}>{p.type} {fmtTime(p.ts)}</span>
              </li>);})}
            </ul>}
        </div>
      </div>
    </div>
  );
}