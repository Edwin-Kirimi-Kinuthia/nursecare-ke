"use client";
export default function OrderPagination({ page, total, onChange, size = 50 }: { page: number; total: number; onChange: (page: number) => void; size?: number }) {
  if (!total) return null;
  return <nav aria-label="Order pages" className="my-4 flex flex-wrap items-center justify-between gap-3 text-sm"><span>{page*size+1}–{Math.min((page+1)*size,total)} of {total} orders</span><div className="flex gap-2"><button className="button-secondary" disabled={page===0} onClick={()=>onChange(page-1)}>Previous orders</button><button className="button-secondary" disabled={(page+1)*size>=total} onClick={()=>onChange(page+1)}>Older orders</button></div></nav>;
}
