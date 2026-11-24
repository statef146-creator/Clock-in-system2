/* WebAudio feedback chimes */
const Sound = (()=>{let ctx=null,muted=false;
  const ensure=()=>{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(AC)ctx=new AC();}if(ctx&&ctx.state==='suspended')ctx.resume();return ctx;};
  const note=(f,t0,dur,type='sine',vol=.16)=>{const c=ctx;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.015);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+dur+.05);};
  return {
    setMuted(m){muted=m;},
    play(kind){if(muted)return;try{const c=ensure();if(!c)return;const t=c.currentTime;
      if(kind==='in'){note(660,t,.16);note(880,t+.11,.22);}
      else if(kind==='out'){note(523,t,.14);note(392,t+.1,.22);}
      else if(kind==='fail'){note(160,t,.22,'square',.09);}
      else if(kind==='blip'){note(980,t,.09,'sine',.1);}
      else if(kind==='live'){note(740,t,.1,'sine',.07);}
    }catch(e){}}
  };
})();