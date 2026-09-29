import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Loan } from '../types';
import { UserCircle, ShieldCheck, Sparkles, X, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoanApprovalCelebrationProps {
  loan: Loan;
  onClose: () => void;
  autoCloseMs?: number;
}

export const triggerSubtleConfetti = () => {
  try {
    // Initial center burst
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#10B981', '#059669', '#34D399', '#F59E0B', '#4F46E5'],
      ticks: 220,
      gravity: 1.1,
      scalar: 0.95,
      shapes: ['circle', 'square'],
      zIndex: 99999
    });

    // Secondary dual corner accents
    setTimeout(() => {
      confetti({
        particleCount: 25,
        angle: 55,
        spread: 50,
        origin: { x: 0.15, y: 0.75 },
        colors: ['#10B981', '#F59E0B', '#34D399'],
        ticks: 180,
        scalar: 0.85,
        zIndex: 99999
      });
      confetti({
        particleCount: 25,
        angle: 125,
        spread: 50,
        origin: { x: 0.85, y: 0.75 },
        colors: ['#10B981', '#4F46E5', '#6EE7B7'],
        ticks: 180,
        scalar: 0.85,
        zIndex: 99999
      });
    }, 180);
  } catch (err) {
    console.debug('Confetti animation suppressed or unsupported:', err);
  }
};

export const LoanApprovalCelebration: React.FC<LoanApprovalCelebrationProps> = ({
  loan,
  onClose,
  autoCloseMs = 4500
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Trigger confetti upon mount
    triggerSubtleConfetti();

    // Progress bar and auto-close
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoCloseMs) * 100);
      setProgress(remaining);
      if (elapsed >= autoCloseMs) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [autoCloseMs, onClose]);

  return (
    <div 
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-gray-950/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-emerald-100 max-w-sm sm:max-w-md w-full p-6 sm:p-8 text-center overflow-hidden animate-pop-bounce"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner glows */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100 rounded-full blur-2xl pointer-events-none opacity-70" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-100 rounded-full blur-2xl pointer-events-none opacity-60" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          title="Dismiss celebration"
        >
          <X size={18} />
        </button>

        {/* Animated Checkmark SVG */}
        <div className="relative mx-auto mb-4 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-50 rounded-full scale-110 animate-pulse pointer-events-none" />
          <svg
            className="w-20 h-20 sm:w-24 sm:h-24 text-emerald-600 drop-shadow-md"
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Circle that draws itself */}
            <circle
              className="animate-check-circle text-emerald-500"
              cx="26"
              cy="26"
              r="23"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Inner check tick that draws itself */}
            <path
              className="animate-check-tick text-emerald-600"
              d="M15 27.5L22.5 35L37 19"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {/* Sparkle icon badge */}
          <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1 rounded-full shadow-md animate-bounce">
            <Sparkles size={14} />
          </div>
        </div>

        {/* Milestone Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-widest mb-2">
          <ShieldCheck size={12} className="text-emerald-600" />
          <span>Milestone Achieved</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-gray-950 font-heading tracking-tight">
          Loan Approved!
        </h3>
        <p className="text-xs font-semibold text-gray-500 mt-1">
          Disbursement authorized for this borrower
        </p>

        {/* Borrower & Loan Details Card */}
        <div className="mt-5 p-4 bg-gray-50/80 rounded-2xl border border-gray-100 text-left">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center text-gray-400 shrink-0">
              {loan.profilePhoto ? (
                <img src={loan.profilePhoto} alt={loan.borrowerName} className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={28} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Borrower</p>
              <p className="text-sm font-black text-gray-900 truncate font-heading">{loan.borrowerName}</p>
              <p className="text-[11px] font-medium text-gray-500 font-mono">ID: {loan.idNumber}</p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200/70 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block">Approved Sum</span>
              <span className="text-base font-black text-emerald-600 font-mono">
                R {loan.amountLoaned.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 block">Total Due</span>
              <span className="text-base font-black text-gray-900 font-mono">
                R {loan.totalRepayment.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button & Auto-close timer */}
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>Continue To Vault</span>
          </button>
        </div>

        {/* Micro progress bar */}
        <div className="w-full bg-gray-100 h-1 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
