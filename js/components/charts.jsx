if(window.Chart){Chart.defaults.color='#8fb3c4';Chart.defaults.borderColor='rgba(22,64,90,.6)';Chart.defaults.font.family="'JetBrains Mono',monospace";Chart.defaults.font.size=10;}

const TrendChart = memo(function TrendChart({data}){
  const cv=useRef(null),ch=useRef(null);
  const key=JSON.stringify(data);
  useEffect(()=>{
    if(!cv.current||!window.Chart)return;
    ch.current=new Chart(cv.current,{type:'bar',data:{labels:[],datasets:[]},options:{
      responsive:true,maintainAspectRatio:false,animation:{duration:500},
      scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,ticks:{stepSize:2},grid:{color:'rgba(22,64,90,.45)'}}},
      plugins:{legend:{position:'bottom',labels:{boxWidth:9,boxHeight:9,padding:10}},tooltip:{backgroundColor:'#0d2c40',borderColor:'#1d4d6b',borderWidth:1,titleColor:'#e9f7fc',bodyColor:'#8fb3c4'}}
    }});
    return()=>{if(ch.current){ch.current.destroy();ch.current=null;}};
  },[]);
  useEffect(()=>{
    const c=ch.current;if(!c)return;
    c.data.labels=data.labels;
    c.data.datasets=[
      {label:'On time',data:data.onTime,backgroundColor:C.green,borderRadius:3,barPercentage:.65},
      {label:'Late',data:data.late,backgroundColor:C.amber,borderRadius:3,barPercentage:.65},
      {label:'Field',data:data.field,backgroundColor:C.violet,borderRadius:3,barPercentage:.65},
      {label:'Absent',data:data.absent,backgroundColor:'rgba(255,84,104,.75)',borderRadius:3,barPercentage:.65},
    ];
    c.update();
  },[key]);
  return <div className="chartwrap"><canvas ref={cv}/></div>;
});

const DeptChart = memo(function DeptChart({data}){
  const cv=useRef(null),ch=useRef(null);
  const key=JSON.stringify(data);
  useEffect(()=>{
    if(!cv.current||!window.Chart)return;
    ch.current=new Chart(cv.current,{type:'doughnut',data:{labels:[],datasets:[]},options:{
      responsive:true,maintainAspectRatio:false,cutout:'64%',
      plugins:{legend:{position:'right',labels:{boxWidth:9,boxHeight:9,padding:9}},tooltip:{backgroundColor:'#0d2c40',borderColor:'#1d4d6b',borderWidth:1}}
    }});
    return()=>{if(ch.current){ch.current.destroy();ch.current=null;}};
  },[]);
  useEffect(()=>{
    const c=ch.current;if(!c)return;
    c.data.labels=data.labels;
    c.data.datasets=[{data:data.values,backgroundColor:data.labels.map(l=>DEPT_COLOR[l]||C.cyan),borderColor:'#0a2436',borderWidth:3,hoverOffset:7}];
    c.update();
  },[key]);
  return <div className="chartwrap"><canvas ref={cv}/></div>;
});