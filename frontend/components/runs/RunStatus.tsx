"use client";
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string,{bg:string,color:string,label:string}> = {
    queued:{bg:'#F3F4F6',color:'#374151',label:'Queued'},
    running:{bg:'#FEF3C7',color:'#92400E',label:'Running'},
    succeeded:{bg:'#ECFDF5',color:'#065F46',label:'Succeeded'},
    failed:{bg:'#FEF2F2',color:'#991B1B',label:'Failed'}
  };
  const s = map[status] || map.queued;
  return <span className="rounded-full px-2 py-0.5 text-xs" style={{background:s.bg,color:s.color}}>{s.label}</span>;
}

