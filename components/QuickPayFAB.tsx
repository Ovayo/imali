import React from 'react';
import { Loan, RepaymentStatus } from '../types';
import { Zap, Smartphone, ArrowUpRight } from 'lucide-react';

interface QuickPayFABProps {
  loan: Loan;
  onQuickPay: (loan: Loan) => void;
  variant?: 'floating' | 'pill' | 'compact';
  className?: string;
}

export const QuickPayFAB: React.FC<QuickPayFABProps> = ({
  loan,
  onQuickPay,
  variant = 'floating',
  className = ''
}) => {
  // If the loan is already paid, no payment initiation is required
  if (loan.status === RepaymentStatus.PAID) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onQuickPay(loan);
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group/qp inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md hover:shadow-lg shadow-emerald-600/25 border border-emerald-400/40 transition-all active:scale-95 ${className}`}
        title={`Quick Pay via WhatsApp for Loan ${loan.id}`}
        aria-label={`Quick Pay via WhatsApp for Loan ${loan.id}`}
      >
        <Zap size={13} className="text-amber-300 fill-amber-300 animate-pulse shrink-0" />
        <span>Quick Pay</span>
        <ArrowUpRight size={12} className="opacity-80 group-hover/qp:translate-x-0.5 group-hover/qp:-translate-y-0.5 transition-transform shrink-0" />
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group/qp flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/35 border border-emerald-400/40 transition-all active:scale-95 ${className}`}
        title={`Quick Pay via WhatsApp for Loan ${loan.id}`}
        aria-label={`Quick Pay via WhatsApp for Loan ${loan.id}`}
      >
        <span className="p-1 rounded-lg bg-white/20 text-amber-300 flex items-center justify-center">
          <Zap size={13} className="fill-amber-300 animate-pulse" />
        </span>
        <span>Quick Pay</span>
        <Smartphone size={13} className="text-emerald-100 opacity-90 group-hover/qp:scale-110 transition-transform" />
      </button>
    );
  }

  // Floating Action Button Style (standard floating corner or embedded floating badge)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group/qp relative overflow-hidden inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:-translate-y-0.5 border border-emerald-400/40 active:scale-95 transition-all ${className}`}
      title={`Quick Pay via WhatsApp - Pre-filled repayment notice for ${loan.borrowerName} (${loan.id})`}
      aria-label={`Quick Pay via WhatsApp for ${loan.id}`}
    >
      <span className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center text-amber-300 shrink-0">
        <Zap size={13} className="fill-amber-300 animate-pulse" />
      </span>
      <span className="font-heading tracking-wide">Quick Pay</span>
      <Smartphone size={14} className="text-emerald-100 opacity-80 group-hover/qp:translate-x-0.5 transition-transform shrink-0" />
    </button>
  );
};

export default QuickPayFAB;
