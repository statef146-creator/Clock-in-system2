const TILES='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTR='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';
const officeIcon=()=>L.divIcon({className:'nyw-div',html:`<div class="fdot office"><svg width="16" height="16" viewBox="0 0 24 24" fill="#19c8e6"><path d="M12 2.7S6 9.2 6 13.5a6 6 0 0 0 12 0C18 9.2 12 2.7 12 2.7z"/></svg></div>`,iconSize:[34,34],iconAnchor:[17,17]});

const EmployeeMap = memo(function EmployeeMap(){
  const {settings,selfPos,gpsMode,setSelfPos}=useApp();
  const el=useRef(null),map=useRef(null),ly=useRef({});
  const dragCb=useRef(setSelfPos);dragCb.current=setSelfPos;
  useEffect(()=>{
    if(!el.current||map.current||!window.L)return;
    const m=L.map(el.current,{zoomControl:false}).setView([settings.lat,settings.lng],16);
    L.tileLayer(TILES,{attribution:ATTR,maxZoom:19}).addTo(m);
    L.control.zoom({position:'bottomright'}).addTo(m);
    ly.current.fence=L.circle([settings.lat,settings.lng],{radius:settings.radius,color:C.cyan,weight:1.5,dashArray:'6 5',fillColor:C.cyan,fillOpacity:.07}).addTo(m);
    ly.current.office=L.marker([settings.lat,settings.lng],{icon:officeIcon()}).addTo(m).bindTooltip('NYEWASCO HQ · Nyeri',{className:'nyw-tip',direction:'top',offset:[0,-16]});
    ly.current.line=L.polyline([],{color:C.green,weight:1.5,dashArray:'4 6',opacity:.7}).addTo(m);
    ly.current.acc=L.circle([settings.lat,settings.lng],{radius:20,color:C.blue,weight:1,fillOpacity:.08,opacity:.5}).addTo(m);
    ly.current.self=L.marker([settings.lat,settings.lng],{draggable:true,icon:L.divIcon({className:'nyw-div',html:'<div class="fdot self">ME</div>',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(m);
    ly.current.self.on('dragend',ev=>{const p=ev.target.getLatLng();dragCb.current({lat:p.lat,lng:p.lng,accuracy:12,source:'demo'});});
    map.current=m;
    const rs=()=>m.invalidateSize();window.addEventListener('resize',rs);
    return()=>{window.removeEventListener('resize',rs);m.remove();map.current=null;ly.current={};};
  },[]);
  useEffect(()=>{const m=map.current;if(!m)return;
    ly.current.fence.setLatLng([settings.lat,settings.lng]);ly.current.fence.setRadius(settings.radius);
    ly.current.office.setLatLng([settings.lat,settings.lng]);
  },[settings.lat,settings.lng,settings.radius]);
  useEffect(()=>{const m=map.current;if(!m||!selfPos)return;
    const ll=[selfPos.lat,selfPos.lng];
    ly.current.self.setLatLng(ll);ly.current.acc.setLatLng(ll);ly.current.acc.setRadius(selfPos.accuracy||15);
    const inside=haversine(selfPos,{lat:settings.lat,lng:settings.lng})<=settings.radius;
    ly.current.line.setLatLngs([ll,[settings.lat,settings.lng]]);ly.current.line.setStyle({color:inside?C.green:C.red});
    if(gpsMode==='demo'){if(ly.current.self.dragging)ly.current.self.dragging.enable();}
    else{if(ly.current.self.dragging)ly.current.self.dragging.disable();}
  },[selfPos,gpsMode,settings.lat,settings.lng,settings.radius]);
  return (
    <div className="mapbox" ref={el}>
      {gpsMode==='demo'&&<div className="demojumps">
        <button onClick={()=>useAppJump('in')}>⌖ Inside HQ</button>
        <button onClick={()=>useAppJump('out')}>⌖ Outside fence</button>
      </div>}
      <div className="gpstag mono" style={{color:gpsMode==='demo'?C.amber:C.green}}>{gpsMode==='demo'?'SIM GPS':'LIVE GPS'}</div>
    </div>
  );
  function useAppJump(w){/* placeholder replaced below */}
});

const FleetMap = memo(function FleetMap(){
  const {settings,positions,rows,openDrawer,panTarget,jumpSelf}=useApp();
  const el=useRef(null),map=useRef(null),markers=useRef({}),fence=useRef(null);
  const clickCb=useRef(openDrawer);clickCb.current=openDrawer;
  const rowsKey=rows.map(r=>r.emp.id+':'+r.status).join('|');
  useEffect(()=>{
    if(!el.current||map.current||!window.L)return;
    const m=L.map(el.current,{zoomControl:false}).setView([settings.lat,settings.lng],14);
    L.tileLayer(TILES,{attribution:ATTR,maxZoom:19}).addTo(m);
    L.control.zoom({position:'bottomright'}).addTo(m);
    fence.current=L.circle([settings.lat,settings.lng],{radius:settings.radius,color:C.cyan,weight:1.5,dashArray:'6 5',fillColor:C.cyan,fillOpacity:.06}).addTo(m);
    L.marker([settings.lat,settings.lng],{icon:officeIcon()}).addTo(m).bindTooltip('NYEWASCO HQ',{className:'nyw-tip',direction:'top',offset:[0,-16]});
    map.current=m;
    const rs=()=>m.invalidateSize();window.addEventListener('resize',rs);
    return()=>{window.removeEventListener('resize',rs);m.remove();map.current=null;markers.current={};};
  },[]);
  useEffect(()=>{if(!map.current)return;fence.current.setLatLng([settings.lat,settings.lng]);fence.current.setRadius(settings.radius);},[settings.lat,settings.lng,settings.radius]);
  useEffect(()=>{
    const m=map.current;if(!m)return;
    rows.forEach(r=>{
      const pos=positions[r.emp.id];if(!pos)return;
      const col=(STATUS_META[r.status]||STATUS_META.ABSENT).color;
      const html=`<div class="fdot" style="--ring:${col}">${initials(r.emp.name)}</div>`;
      const tip=`${r.emp.name} · ${(STATUS_META[r.status]||{}).label||'Absent'}${r.firstIn?' · in '+fmtTime(r.firstIn.ts):''}`;
      if(markers.current[r.emp.id]){
        markers.current[r.emp.id].setLatLng([pos.lat,pos.lng]);
        markers.current[r.emp.id].setIcon(L.divIcon({className:'nyw-div',html,iconSize:[34,34],iconAnchor:[17,17]}));
        markers.current[r.emp.id].setTooltipContent(tip);
      }else{
        const mk=L.marker([pos.lat,pos.lng],{icon:L.divIcon({className:'nyw-div',html,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(m);
        mk.bindTooltip(tip,{className:'nyw-tip',direction:'top',offset:[0,-16]});
        mk.on('click',()=>clickCb.current(r.emp.id));
        markers.current[r.emp.id]=mk;
      }
    });
  },[rowsKey,positions]);
  useEffect(()=>{if(map.current&&panTarget){map.current.panTo([panTarget.lat,panTarget.lng],{animate:true});}},[panTarget]);
  return <div className="mapbox fleetmap" ref={el}/>;
});