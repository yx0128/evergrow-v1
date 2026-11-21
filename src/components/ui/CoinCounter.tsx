import { Coins } from 'lucide-react';

export function CoinCounter({ coins }: { coins: number }) {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-30">
      <div
        className="glass-pill pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-2 text-ink shadow-float"
        title="Coins earned from completed tasks"
      >
        <Coins size={15} className="text-gold-deep" />
        <span
          key={coins}
          className="animate-coin-pop font-display text-[15px] font-semibold tabular-nums leading-none text-ink"
        >
          {coins.toLocaleString()}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink-soft/50">
          coins
        </span>
      </div>
    </div>
  );
}
