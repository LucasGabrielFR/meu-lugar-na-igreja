'use client';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { FormState } from '@/lib/types';
import { approveParticipation, rejectParticipation } from '@/app/actions';

export default function RequestReviewForm({id}:{id:number}) {
  const router=useRouter();
  const [approveState,approveAction,approving]=useActionState(approveParticipation,{} as FormState);
  const [rejectState,rejectAction,rejecting]=useActionState(rejectParticipation,{} as FormState);
  useEffect(()=>{if(approveState.success||rejectState.success)router.refresh();},[approveState.success,rejectState.success,router]);
  return <div className="request-review">
    <form action={approveAction}><input type="hidden" name="id" value={id}/><button className="primary-button" disabled={approving||rejecting}>{approving?'Publicando…':'Aprovar e publicar casa'}</button></form>
    <form action={rejectAction}><input type="hidden" name="id" value={id}/><button className="outline-button" disabled={approving||rejecting}>{rejecting?'Arquivando…':'Arquivar pedido'}</button></form>
    <div aria-live="polite">{approveState.error&&<p className="form-error" role="alert">{approveState.error}</p>}{rejectState.error&&<p className="form-error" role="alert">{rejectState.error}</p>}{approveState.success&&<p className="form-success" role="status">{approveState.success}</p>}{rejectState.success&&<p className="form-success" role="status">{rejectState.success}</p>}</div>
  </div>;
}
