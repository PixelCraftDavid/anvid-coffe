import {useEffect,useRef,useState} from 'react';
import {CameraOff} from 'lucide-react';

export default function CameraReader({onCode,onClose}) {
  const video=useRef(null),callback=useRef(onCode),closeCallback=useRef(onClose);
  callback.current=onCode;
  closeCallback.current=onClose;
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true,controls,detected=false;
    const element=video.current;
    const hidden=()=>{if(document.hidden){controls?.stop();closeCallback.current();}};
    document.addEventListener('visibilitychange',hidden);
    (async()=>{
      try{
        const {BrowserQRCodeReader}=await import('@zxing/browser');
        if(!active)return;
        const reader=new BrowserQRCodeReader();
        controls=await reader.decodeFromConstraints({video:{facingMode:{ideal:'environment'}},audio:false},element,(result,_,scan)=>{
          if(result && active && !detected){detected=true;scan.stop();callback.current(result.getText());}
        });
        if(!active)controls.stop();
      }catch{if(active)setError('No pudimos abrir la cámara. Permite el acceso o escribe el código del cupón.');}
    })();
    return()=>{active=false;document.removeEventListener('visibilitychange',hidden);controls?.stop();element?.srcObject?.getTracks?.().forEach(track=>track.stop());if(element)element.srcObject=null;};
  },[]);
  return <div className="camera-reader"><div className="camera-viewport"><video ref={video} muted playsInline autoPlay/><span className="camera-guide" aria-hidden="true"/>{!error&&<p>Coloca el QR dentro del recuadro</p>}</div>{error&&<p className="admin-error" role="alert">{error}</p>}<button type="button" className="admin-text-button" onClick={onClose}><CameraOff size={16}/> Cerrar cámara</button></div>;
}
