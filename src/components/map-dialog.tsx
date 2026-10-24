'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function MapDialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const dialog=useRef<HTMLDialogElement>(null),heading=useId();
  useEffect(()=>{const element=dialog.current;if(!element)return;element.showModal();return ()=>element.close();},[]);
  return <dialog ref={dialog} className="map-modal world-dialog" aria-labelledby={heading} onCancel={onClose} onClick={event=>{if(event.target!==event.currentTarget)return;const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)onClose();}}>
    <header><div><span className="eyebrow">MEU LUGAR NA IGREJA</span><h2 id={heading}>{title}</h2></div><button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20}/></button></header>
    <div className="map-modal-body">{children}</div>
  </dialog>;
}
