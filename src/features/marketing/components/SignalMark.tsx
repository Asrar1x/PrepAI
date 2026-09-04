export function SignalMark({ label = 'PrepAI' }: { label?: string }) {
  return <span className="inline-flex items-center gap-2 font-black tracking-[-0.04em] text-inherit"><span aria-hidden="true" className="relative grid size-7 place-items-center overflow-hidden border border-current"><i className="absolute h-px w-10 rotate-[-35deg] bg-current" /><i className="absolute h-px w-8 rotate-[35deg] bg-current opacity-60" /><b className="relative size-1.5 bg-current" /></span>{label}</span>;
}
