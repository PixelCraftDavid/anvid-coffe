// One tiny authenticated check per 8 seconds while visible/online. Topic data
// is fetched only after a committed revision changes. No idle annual queries.
export function createDashboardSync({request,getRevision,onChange,onStatus,onExpired,eligible,setTimer=setTimeout,clearTimer=clearTimeout,makeController=()=>new AbortController(),interval=8000}){
  let stopped=false,timer=null,timeout=null,controller=null,busy=false,failures=0;
  function cancelTimer(){if(timer!==null)clearTimer(timer);timer=null;}
  function schedule(delay=interval){cancelTimer();if(!stopped&&eligible())timer=setTimer(run,delay);}
  async function run(){
    if(stopped||busy||!eligible())return;
    const revision=getRevision();
    busy=true;const active=makeController();controller=active;
    timeout=setTimer(()=>active.abort(),12000);
    try{
      const result=revision?await request(revision,active.signal):{requiresSnapshot:true};
      if(stopped||active.signal.aborted||!eligible())return;
      await onChange(result);failures=0;onStatus('live');
    }catch(error){
      if(stopped||!eligible())return;
      if(error.status===401){stop();onExpired();return;}
      failures=Math.min(failures+1,5);onStatus('retry');
    }finally{
      clearTimer(timeout);timeout=null;controller=null;busy=false;
      schedule(Math.min(120000,interval*2**failures));
    }
  }
  function pause(status='paused'){cancelTimer();controller?.abort();onStatus(status);}
  function wake(){if(stopped)return;failures=0;if(eligible())schedule(0);}
  function stop(){stopped=true;cancelTimer();if(timeout!==null)clearTimer(timeout);controller?.abort();}
  return {start:wake,wake,pause,stop};
}
