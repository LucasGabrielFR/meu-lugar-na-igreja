'use client';
import { useActionState, type ReactNode } from 'react';
import type { FormState } from '@/lib/types';
export default function ActionForm({action,children,label='Salvar cadastro'}:{action:(state:FormState,data:FormData)=>Promise<FormState>;children:ReactNode;label?:string}) {
  const [state,formAction,pending]=useActionState(action,{});
  return <form action={formAction} className="data-form">{children}<button className="primary-button" disabled={pending}>{pending?'Salvando…':label}</button><div aria-live="polite">{state.error&&<p className="form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-success">{state.success}</p>}</div></form>;
}
