import {useEffect,useRef,useState} from 'react';
import {adminRequest} from './api.js';
import {createDashboardSync} from './dashboardSync.js';

export default function useDashboardSync({revision,onChange,onSnapshot,onExpired}){
  const latest=useRef({revision,onChange,onSnapshot,onExpired});latest.current={revision,onChange,onSnapshot,onExpired};
  const [status,setStatus]=useState('connecting');
  useEffect(()=>{
    const eligible=()=>!document.hidden&&navigator.onLine!==false;
    const sync=createDashboardSync({getRevision:()=>latest.current.revision,eligible,onStatus:setStatus,onExpired:()=>latest.current.onExpired(),request:(since,signal)=>adminRequest({view:'live',since:JSON.stringify(since)},null,{signal}),onChange:async result=>{if(result.requiresSnapshot){if(await latest.current.onSnapshot()===false)throw new Error('Snapshot unavailable');}else if(result.patch)latest.current.onChange(result.patch);}});
    const visibility=()=>eligible()?sync.wake():sync.pause(navigator.onLine===false?'offline':'paused');
    document.addEventListener('visibilitychange',visibility);window.addEventListener('online',visibility);window.addEventListener('offline',visibility);window.addEventListener('focus',visibility);sync.start();
    return()=>{sync.stop();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',visibility);window.removeEventListener('offline',visibility);window.removeEventListener('focus',visibility);};
  },[]);
  return status;
}
