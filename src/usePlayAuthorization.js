import {useEffect,useRef,useState} from 'react';
import {createDashboardSync} from './admin/dashboardSync.js';
import {loadAuthorization} from './coffeeApi.js';

export default function usePlayAuthorization(waiting,onState){
  const latest=useRef(onState);latest.current=onState;const [status,setStatus]=useState('live');
  useEffect(()=>{
    if(waiting?.status!=='pending')return;
    const eligible=()=>!document.hidden&&navigator.onLine!==false,code=waiting.code;
    const sync=createDashboardSync({interval:5000,getRevision:()=>code,eligible,onStatus:setStatus,onExpired:()=>{},request:(_,signal)=>loadAuthorization(signal),onChange:state=>{if(state.request?.code===code)latest.current(state);else latest.current({request:{code,status:'expired'},purchase:null,coupon:null});}});
    const update=()=>eligible()?sync.wake():sync.pause(navigator.onLine===false?'offline':'paused');
    document.addEventListener('visibilitychange',update);window.addEventListener('online',update);window.addEventListener('offline',update);sync.start();
    return()=>{sync.stop();document.removeEventListener('visibilitychange',update);window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[waiting?.code,waiting?.status]);
  return status;
}
