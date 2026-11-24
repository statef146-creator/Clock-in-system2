/* Seed data + Supabase schema */
const OFFICE = {lat:-0.4269,lng:36.9505};
const EMPLOYEES = [
  {id:'NYW-001',name:'Grace Wanjiku',role:'Process Engineer',department:'Technical'},
  {id:'NYW-002',name:'Peter Mwangi',role:'Meter Reader',department:'Commercial'},
  {id:'NYW-003',name:'Faith Njeri',role:'Accounts Officer',department:'Finance'},
  {id:'NYW-004',name:'David Kariuki',role:'Plumber',department:'Technical'},
  {id:'NYW-005',name:'Mercy Achieng',role:'Customer Care',department:'Commercial'},
  {id:'NYW-006',name:'Samuel Otieno',role:'Systems Administrator',department:'ICT'},
  {id:'NYW-007',name:'Jane Wambui',role:'HR Officer',department:'Administration'},
  {id:'NYW-008',name:'John Maina',role:'Field Technician',department:'Technical'},
  {id:'NYW-009',name:'Alice Nyambura',role:'Billing Clerk',department:'Commercial'},
  {id:'NYW-010',name:'Brian Ochieng',role:'Plant Operator',department:'Technical'},
].map(e=>({...e,badge_code:'NYW'+Math.random().toString(36).slice(2,8).toUpperCase(),color:DEPT_COLOR[e.department]}));
const FIELD_IDS = ['NYW-002','NYW-008'];
const DEFAULT_EMP = 'NYW-004';

function seedPositions(){
  const p={};
  EMPLOYEES.forEach(e=>{
    if(FIELD_IDS.includes(e.id)) p[e.id]={lat:OFFICE.lat+rnd(-.02,.02),lng:OFFICE.lng+rnd(-.02,.02),ts:Date.now(),accuracy:rnd(8,25)};
    else p[e.id]={lat:OFFICE.lat+rnd(-.001,.001),lng:OFFICE.lng+rnd(-.001,.001),ts:Date.now(),accuracy:rnd(5,15)};
  });
  return p;
}
function mkPunch(emp,type,date,hhmm,opts={}){
  const [y,m,d]=date.split('-').map(Number);const [hh,mm]=hhmm.split(':').map(Number);
  const ts=new Date(y,m-1,d,hh,mm,Math.floor(rnd(0,59))).toISOString();
  const field=opts.field||false;
  const pos=field?{lat:OFFICE.lat+rnd(-.02,.02),lng:OFFICE.lng+rnd(-.02,.02)}:{lat:OFFICE.lat+rnd(-.0012,.0012),lng:OFFICE.lng+rnd(-.0012,.0012)};
  return {id:uid(),employee_id:emp.id,type,ts,lat:pos.lat,lng:pos.lng,accuracy:rnd(5,20),
    method:opts.method||'GPS',status:type==='IN'?(field?'FIELD':(timeToMin(hhmm)>timeToMin('08:15')?'LATE':'ON_TIME')):'OUT',
    inside_fence:!field,note:opts.note||''};
}
function seedPunches(){
  const out=[];const now=new Date();
  for(let back=7;back>=1;back--){
    const d=new Date(now);d.setDate(d.getDate()-back);
    if(d.getDay()===0)continue;
    const key=dateKey(d);
    EMPLOYEES.forEach(e=>{
      if(Math.random()<.08)return;
      const field=FIELD_IDS.includes(e.id)&&Math.random()<.7;
      out.push(mkPunch(e,'IN',key,minToTime(Math.floor(rnd(465,516))),{field}));
      out.push(mkPunch(e,'OUT',key,minToTime(Math.floor(rnd(1005,1065))),{field}));
    });
  }
  const tk=todayKey();
  const inToday=[['NYW-001','07:52',false],['NYW-002','08:04',true],['NYW-003','08:22',false],['NYW-005','07:58',false],['NYW-006','08:09',false],['NYW-008','08:31',true],['NYW-010','07:47',false]];
  inToday.forEach(([id,t,f])=>{const e=EMPLOYEES.find(x=>x.id===id);out.push(mkPunch(e,'IN',tk,t,{field:f}));});
  return out;
}

const SQL_SCHEMA = `-- NYEWASCO StaffClock · Supabase schema
create table if not exists employees (
  id text primary key,
  name text not null,
  role text,
  department text,
  badge_code text unique,
  color text
);
create table if not exists punches (
  id uuid primary key default gen_random_uuid(),
  employee_id text references employees(id) on delete cascade,
  type text check (type in ('IN','OUT')),
  ts timestamptz not null default now(),
  lat double precision,
  lng double precision,
  accuracy double precision,
  method text,
  status text,
  inside_fence boolean,
  note text
);
alter table employees enable row level security;
alter table punches enable row level security;
-- Demo policies (open). Tighten with Supabase Auth before production.
create policy "read employees" on employees for select using (true);
create policy "read punches" on punches for select using (true);
create policy "write punches" on punches for insert with check (true);
create policy "edit punches" on punches for update using (true);
create policy "del punches" on punches for delete using (true);
create policy "seed employees" on employees for insert with check (true);
create policy "upsert employees" on employees for update using (true);
-- Enable realtime streaming of punches
alter publication supabase_realtime add table punches;`;