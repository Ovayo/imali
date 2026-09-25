import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  X, 
  Calendar, 
  Coins, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle, 
  Share2, 
  Copy, 
  Check, 
  TrendingUp, 
  ChevronRight, 
  Info, 
  Percent, 
  Banknote,
  FileText,
  DollarSign,
  Plus,
  Minus,
  SlidersHorizontal,
  Table,
  AlertCircle
} from 'lucide-react';
import { BorrowerProfile, Language } from '../types';
import { DEFAULT_INTEREST_RATE, DEFAULT_PENALTY_RATE } from '../constants';

export interface LoanEmiCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrower?: (BorrowerProfile & { score?: number }) | null;
  defaultPrincipal?: number;
  defaultWeeks?: number;
  interestRate?: number;
  penaltyRate?: number;
  language?: Language;
  onApply?: (
    amount: number, 
    termWeeks: number, 
    dueDate: string, 
    estimatedInstallment: number, 
    frequency: 'weekly' | 'biweekly' | 'monthly'
  ) => void;
}

const PRINCIPAL_PRESETS = [500, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 20000];

const MILESTONE_AMOUNTS = [
  { val: 500, label: 'R 500' },
  { val: 2500, label: 'R 2.5k' },
  { val: 5000, label: 'R 5k' },
  { val: 10000, label: 'R 10k' },
  { val: 15000, label: 'R 15k' },
  { val: 20000, label: 'R 20k' },
];

const DURATION_PRESETS = [
  { weeks: 1, label: '1 Week', sublabel: '7 Days' },
  { weeks: 2, label: '2 Weeks', sublabel: '14 Days' },
  { weeks: 3, label: '3 Weeks', sublabel: '21 Days' },
  { weeks: 4, label: '4 Weeks', sublabel: '1 Month (Max)' },
];

const MILESTONE_WEEKS = [
  { val: 1, label: '1 Wk', sub: '7d' },
  { val: 2, label: '2 Wks', sub: '14d' },
  { val: 3, label: '3 Wks', sub: '21d' },
  { val: 4, label: '4 Wks', sub: '1 Mo Max' },
];

export const LoanEmiCalculatorModal: React.FC<LoanEmiCalculatorModalProps> = ({
  isOpen,
  onClose,
  borrower,
  defaultPrincipal = 2500,
  defaultWeeks = 4,
  interestRate = DEFAULT_INTEREST_RATE,
  penaltyRate = DEFAULT_PENALTY_RATE,
  language = Language.EN,
  onApply
}) => {
  const [principal, setPrincipal] = useState<number>(defaultPrincipal);
  const [weeks, setWeeks] = useState<number>(defaultWeeks);
  const [customInterestRate, setCustomInterestRate] = useState<number>(interestRate);
  const [paymentFrequency, setPaymentFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [activeTab, setActiveTab] = useState<'calculator' | 'schedule' | 'penalties'>('calculator');
  const [simulatedOverdueWeeks, setSimulatedOverdueWeeks] = useState<number>(1);
  const [includePenaltiesInSchedule, setIncludePenaltiesInSchedule] = useState<boolean>(true);
  const [copiedQuote, setCopiedQuote] = useState<boolean>(false);
  const [copiedSchedule, setCopiedSchedule] = useState<boolean>(false);
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState<number>(borrower?.monthlyIncome || 0);

  // Sync state if default values change when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrincipal(defaultPrincipal);
      setWeeks(defaultWeeks);
      setCustomInterestRate(interestRate);
      if (borrower?.monthlyIncome) {
        setMonthlyIncomeInput(borrower.monthlyIncome);
      }
    }
  }, [isOpen, defaultPrincipal, defaultWeeks, interestRate, borrower?.monthlyIncome]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Core Financial & EMI Calculations
  const calc = useMemo(() => {
    const safePrincipal = Math.max(200, Math.min(30000, Number(principal) || 0));
    const safeWeeks = Math.max(1, Math.min(4, Number(weeks) || 1));
    const safeRate = Math.max(0, Math.min(100, Number(customInterestRate) || 0));

    // Base micro-lending total interest (fixed term rate)
    const totalInterest = Math.round(safePrincipal * (safeRate / 100));
    const totalRepayment = safePrincipal + totalInterest;

    // Number of installments based on frequency
    let numInstallments = safeWeeks; // weekly default
    if (paymentFrequency === 'biweekly') {
      numInstallments = Math.max(1, Math.round(safeWeeks / 2));
    } else if (paymentFrequency === 'monthly') {
      numInstallments = Math.max(1, Math.round(safeWeeks / 4.333));
    }

    const installmentAmount = Math.max(1, Math.round(totalRepayment / numInstallments));
    const principalPortionPerInstallment = Math.round(safePrincipal / numInstallments);
    const interestPortionPerInstallment = installmentAmount - principalPortionPerInstallment;

    // Weekly & Monthly comparisons
    const weeklyEquivalent = Math.round(totalRepayment / safeWeeks);
    const approxMonths = Math.max(1, Math.round(safeWeeks / 4.333));
    const monthlyEquivalent = Math.round(totalRepayment / approxMonths);

    // Estimated maturity date
    const maturityDate = new Date(Date.now() + safeWeeks * 7 * 86400000);
    const dueDateISO = maturityDate.toISOString().split('T')[0];
    const dueDateFormatted = maturityDate.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // Affordability metrics
    const effectiveMonthlyCost = paymentFrequency === 'monthly' 
      ? installmentAmount 
      : weeklyEquivalent * 4.333;
    const debtRatio = monthlyIncomeInput > 0 ? (effectiveMonthlyCost / monthlyIncomeInput) * 100 : null;

    // Penalty calculations
    // Base penalty: 5% per week of overdue on principal (standard micro-lending contract)
    const weeklyPenaltyAmount = Math.round(safePrincipal * (penaltyRate / 100));
    const simulatedPenaltyFee = weeklyPenaltyAmount * simulatedOverdueWeeks;
    // In Duplum Rule: Total penalty + interest cannot exceed 100% of original principal in South Africa
    const maxTotalFeesCap = safePrincipal;
    const isCapReached = (totalInterest + simulatedPenaltyFee) >= maxTotalFeesCap;
    const cappedSimulatedPenaltyFee = Math.min(simulatedPenaltyFee, Math.max(0, maxTotalFeesCap - totalInterest));
    const totalWithSimulatedPenalty = totalRepayment + cappedSimulatedPenaltyFee;

    // 1. Generate detailed Week-by-Week Amortization Schedule
    const weekByWeekSchedule = [];
    const baseWeeklyPrincipal = Math.floor(safePrincipal / safeWeeks);
    const baseWeeklyInterest = Math.floor(totalInterest / safeWeeks);
    let runningPrincipalBal = safePrincipal;
    let runningTotalBal = totalRepayment;

    for (let w = 1; w <= safeWeeks; w++) {
      const isLastWeek = w === safeWeeks;
      const principalPortion = isLastWeek 
        ? runningPrincipalBal 
        : baseWeeklyPrincipal;
      const interestPortion = isLastWeek
        ? totalInterest - baseWeeklyInterest * (safeWeeks - 1)
        : baseWeeklyInterest;
      const penaltyPortion = 0;
      const totalDue = principalPortion + interestPortion;
      
      runningPrincipalBal = Math.max(0, runningPrincipalBal - principalPortion);
      runningTotalBal = Math.max(0, runningTotalBal - totalDue);

      const weekDueDate = new Date(Date.now() + w * 7 * 86400000);

      weekByWeekSchedule.push({
        weekNumber: w,
        dueDateFormatted: weekDueDate.toLocaleDateString('en-ZA', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        principalPortion,
        interestPortion,
        penaltyPortion,
        totalDue,
        remainingPrincipal: runningPrincipalBal,
        remainingTotalBalance: runningTotalBal,
        isOverdue: false,
        status: isLastWeek ? 'Final Maturity' : 'Active Term'
      });
    }

    // Append simulated overdue penalty weeks if enabled
    let totalSimulatedPenaltiesInSchedule = 0;
    if (includePenaltiesInSchedule && simulatedOverdueWeeks > 0) {
      let cumulativePenalty = 0;
      for (let ow = 1; ow <= simulatedOverdueWeeks; ow++) {
        const potentialPenalty = weeklyPenaltyAmount;
        // In Duplum check: total interest + cumulative penalties cannot exceed principal cap
        const remainingCap = Math.max(0, maxTotalFeesCap - totalInterest - cumulativePenalty);
        const thisPenalty = Math.min(potentialPenalty, remainingCap);
        cumulativePenalty += thisPenalty;

        const overdueDueDate = new Date(Date.now() + (safeWeeks + ow) * 7 * 86400000);
        
        weekByWeekSchedule.push({
          weekNumber: safeWeeks + ow,
          dueDateFormatted: overdueDueDate.toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          principalPortion: 0,
          interestPortion: 0,
          penaltyPortion: thisPenalty,
          totalDue: thisPenalty,
          remainingPrincipal: safePrincipal,
          remainingTotalBalance: cumulativePenalty,
          isOverdue: true,
          status: `Late (+${ow} wk) • ${penaltyRate}% Penalty`
        });
      }
      totalSimulatedPenaltiesInSchedule = cumulativePenalty;
    }

    // 2. Generate standard payment frequency schedule (weekly, biweekly, monthly)
    const scheduleItems = [];
    const intervalDays = paymentFrequency === 'weekly' ? 7 : paymentFrequency === 'biweekly' ? 14 : 30;
    let runningBalance = totalRepayment;

    for (let i = 1; i <= numInstallments; i++) {
      const installmentDueDate = new Date(Date.now() + i * intervalDays * 86400000);
      const isLast = i === numInstallments;
      const currentInstallment = isLast ? runningBalance : installmentAmount;
      runningBalance = Math.max(0, runningBalance - currentInstallment);

      scheduleItems.push({
        installmentNumber: i,
        dueDate: installmentDueDate.toLocaleDateString('en-ZA', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        amount: currentInstallment,
        principalPortion: isLast ? safePrincipal - principalPortionPerInstallment * (numInstallments - 1) : principalPortionPerInstallment,
        interestPortion: isLast ? totalInterest - interestPortionPerInstallment * (numInstallments - 1) : interestPortionPerInstallment,
        remainingBalance: runningBalance
      });
    }

    const totalAmortizedPrincipal = safePrincipal;
    const totalAmortizedInterest = totalInterest;
    const totalAmortizedPayable = totalRepayment + totalSimulatedPenaltiesInSchedule;

    return {
      safePrincipal,
      safeWeeks,
      safeRate,
      totalInterest,
      totalRepayment,
      numInstallments,
      installmentAmount,
      principalPortionPerInstallment,
      interestPortionPerInstallment,
      weeklyEquivalent,
      monthlyEquivalent,
      approxMonths,
      dueDateISO,
      dueDateFormatted,
      debtRatio,
      effectiveMonthlyCost,
      weeklyPenaltyAmount,
      simulatedPenaltyFee,
      cappedSimulatedPenaltyFee,
      totalWithSimulatedPenalty,
      isCapReached,
      scheduleItems,
      weekByWeekSchedule,
      totalSimulatedPenaltiesInSchedule,
      totalAmortizedPrincipal,
      totalAmortizedInterest,
      totalAmortizedPayable
    };
  }, [principal, weeks, customInterestRate, paymentFrequency, penaltyRate, simulatedOverdueWeeks, monthlyIncomeInput, includePenaltiesInSchedule]);

  // Copy or Share breakdown
  const handleCopyQuote = () => {
    const summary = `📊 IMALI LOAN EMI ESTIMATE
• Principal: R ${calc.safePrincipal.toLocaleString()}
• Term: ${calc.safeWeeks} Weeks (~${calc.approxMonths} Month(s))
• Total Interest (${calc.safeRate}%): R ${calc.totalInterest.toLocaleString()}
• Total Repayment: R ${calc.totalRepayment.toLocaleString()}
• Installment: R ${calc.installmentAmount.toLocaleString()} (${paymentFrequency.toUpperCase()} × ${calc.numInstallments})
• Due Date: ${calc.dueDateFormatted}
⚠️ Penalty Structure: ${penaltyRate}%/week overdue after 3-day grace period.`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summary);
      setCopiedQuote(true);
      setTimeout(() => setCopiedQuote(false), 2500);
    }
  };

  const handleCopySchedule = () => {
    let text = `📅 IMALI WEEK-BY-WEEK AMORTIZATION SCHEDULE\n`;
    text += `Borrower: ${borrower?.name || 'Community Member'}\n`;
    text += `Principal: R ${calc.safePrincipal.toLocaleString()} | Interest (${calc.safeRate}%): R ${calc.totalInterest.toLocaleString()} | Duration: ${calc.safeWeeks} Weeks\n`;
    text += `Base Repayment: R ${calc.totalRepayment.toLocaleString()}\n`;
    if (includePenaltiesInSchedule && calc.totalSimulatedPenaltiesInSchedule > 0) {
      text += `Simulated Penalties (${simulatedOverdueWeeks} wks overdue @ ${penaltyRate}%/wk): +R ${calc.totalSimulatedPenaltiesInSchedule.toLocaleString()}\n`;
      text += `Grand Total Due: R ${calc.totalAmortizedPayable.toLocaleString()}\n`;
    }
    text += `------------------------------------------------------------------------------------------\n`;
    text += `Week | Due Date    | Principal   | Interest    | Penalty     | Installment | Balance\n`;
    text += `------------------------------------------------------------------------------------------\n`;
    calc.weekByWeekSchedule.forEach(row => {
      const wkStr = (row.isOverdue ? `Late+${row.weekNumber - calc.safeWeeks}` : `Wk ${row.weekNumber}`).padEnd(5);
      const dateStr = row.dueDateFormatted.padEnd(11);
      const prinStr = `R ${row.principalPortion.toLocaleString()}`.padStart(11);
      const intStr = `R ${row.interestPortion.toLocaleString()}`.padStart(11);
      const penStr = `R ${row.penaltyPortion.toLocaleString()}`.padStart(11);
      const dueStr = `R ${row.totalDue.toLocaleString()}`.padStart(11);
      const balStr = `R ${row.remainingTotalBalance.toLocaleString()}`.padStart(11);
      text += `${wkStr} | ${dateStr} | ${prinStr} | ${intStr} | ${penStr} | ${dueStr} | ${balStr}\n`;
    });
    text += `------------------------------------------------------------------------------------------\n`;
    text += `NCA In Duplum rule: Total fees & penalties are legally capped at 100% of principal.\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedSchedule(true);
      setTimeout(() => setCopiedSchedule(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const summary = `*IMALI MICRO-LENDING: LOAN ESTIMATE*
📌 *Principal:* R ${calc.safePrincipal.toLocaleString()}
⏱️ *Duration:* ${calc.safeWeeks} Weeks (${calc.numInstallments} ${paymentFrequency} installments)
💰 *Estimated Installment:* R ${calc.installmentAmount.toLocaleString()} / ${paymentFrequency === 'monthly' ? 'month' : paymentFrequency === 'biweekly' ? '2 weeks' : 'week'}
🏷️ *Total Interest (${calc.safeRate}%):* R ${calc.totalInterest.toLocaleString()}
💵 *Total Repayment:* R ${calc.totalRepayment.toLocaleString()}
📅 *Maturity Date:* ${calc.dueDateFormatted}

⚖️ *Penalty Policy:*
• 3 calendar days grace period post due date.
• ${penaltyRate}% late fee per week overdue (R ${calc.weeklyPenaltyAmount}/wk).
• National Credit Act compliant.`;

    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, '_blank');
  };

  const handleApplyNow = () => {
    if (onApply) {
      onApply(
        calc.safePrincipal, 
        calc.safeWeeks, 
        calc.dueDateISO, 
        calc.installmentAmount, 
        paymentFrequency
      );
    }
    onClose();
  };

  if (!isOpen) return null;

  const principalPercent = Math.min(100, Math.max(0, ((calc.safePrincipal - 300) / (20000 - 300)) * 100));
  const weeksPercent = Math.min(100, Math.max(0, ((calc.safeWeeks - 1) / (4 - 1)) * 100));

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      {/* Dark backdrop */}
      <motion.div 
        key="emi-backdrop"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-gray-950/75 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <motion.div 
        key="emi-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.85 }}
        className="bg-white w-full max-w-4xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[94vh] mt-auto sm:my-auto border border-gray-100"
      >
        {/* Mobile Pull Handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="p-5 sm:p-7 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
            <Calculator size={160} />
          </div>

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Calculator size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight font-heading">
                  Loan EMI Calculator
                </h3>
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  Prospective Borrower
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1.5 font-medium">
                <span>Plan your microloan installments & understand the penalty fee structure upfront</span>
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="p-2 sm:p-2.5 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors relative z-10 active:scale-95"
            title="Close calculator"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-8 border-b border-gray-100 bg-gray-50/80 flex items-center gap-2 sm:gap-4 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`py-3.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'calculator' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Calculator size={16} />
            <span>Installment Estimator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`py-3.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'schedule' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Table size={16} />
            <span>Week-by-Week Amortization</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded font-mono font-bold">
              {calc.safeWeeks} Wks
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('penalties')}
            className={`py-3.5 px-3 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'penalties' 
                ? 'border-amber-600 text-amber-600' 
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <ShieldAlert size={16} />
            <span>Penalty Fee Structure</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-mono font-bold">5%/wk</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 md:p-8 overflow-y-auto space-y-7 custom-scrollbar flex-1 bg-[#fafaf9]">
          
          {/* TAB 1: CALCULATOR & INSTALLMENT ESTIMATOR */}
          {activeTab === 'calculator' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
              {/* Left Column: Interactive Controls */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Loan Amount (Principal) Range Slider Card */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                          <Banknote size={16} className="text-indigo-600" />
                          Loan Amount (Principal)
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                          R 300 – R 20,000
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">Drag the range slider or use steppers to fine-tune</p>
                    </div>

                    {/* Numeric display with +/- stepper buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setPrincipal(prev => Math.max(300, prev - 500))}
                        className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-black active:scale-95 transition-all"
                        title="Decrease R 500"
                        aria-label="Decrease loan amount by 500 Rand"
                      >
                        <Minus size={13} />
                      </button>

                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-black text-gray-400 font-heading pointer-events-none">R</span>
                        <input
                          type="number"
                          min="300"
                          max="20000"
                          step="100"
                          value={calc.safePrincipal}
                          onChange={(e) => setPrincipal(Number(e.target.value) || 0)}
                          className="w-28 sm:w-32 pl-6 pr-2.5 py-1 text-right font-black text-lg sm:text-xl text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-heading"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setPrincipal(prev => Math.min(20000, prev + 500))}
                        className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-black active:scale-95 transition-all"
                        title="Increase R 500"
                        aria-label="Increase loan amount by 500 Rand"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Range Slider with Interactive Dynamic Track Fill */}
                  <div className="space-y-2 pt-1">
                    <div className="relative flex items-center px-1">
                      <input 
                        type="range" 
                        min="300" 
                        max="20000" 
                        step="100" 
                        value={calc.safePrincipal}
                        onChange={(e) => setPrincipal(Number(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${principalPercent}%, #e2e8f0 ${principalPercent}%, #e2e8f0 100%)`
                        }}
                        className="custom-range-slider"
                        aria-label="Loan Amount Range Slider"
                      />
                    </div>

                    {/* Clickable Milestone Markers Along Slider */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 px-1 pt-1">
                      {MILESTONE_AMOUNTS.map((m) => {
                        const isSelected = calc.safePrincipal === m.val;
                        const isPast = calc.safePrincipal >= m.val;
                        return (
                          <button
                            key={m.val}
                            type="button"
                            onClick={() => setPrincipal(m.val)}
                            className={`flex flex-col items-center gap-1 group transition-all ${
                              isSelected ? 'text-indigo-600 font-black scale-105' : isPast ? 'text-gray-700' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              isSelected ? 'bg-indigo-600 ring-2 ring-indigo-200' : isPast ? 'bg-indigo-400' : 'bg-gray-200'
                            }`} />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="space-y-1.5 pt-1 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Popular Amounts:</span>
                    <div className="flex flex-wrap gap-2">
                      {PRINCIPAL_PRESETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPrincipal(amt)}
                          className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${
                            calc.safePrincipal === amt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          R {amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Repayment Period Range Slider Card */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                          <Clock size={16} className="text-indigo-600" />
                          Repayment Period
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                          1 to 4 Weeks (Max 1 Month)
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">Policy Limit: Microloan terms are strictly capped up to 1 month</p>
                    </div>

                    {/* Numeric display with +/- stepper buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setWeeks(prev => Math.max(1, prev - 1))}
                        disabled={calc.safeWeeks <= 1}
                        className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-black active:scale-95 transition-all disabled:opacity-40"
                        title="Decrease 1 Week"
                        aria-label="Decrease term by 1 week"
                      >
                        <Minus size={13} />
                      </button>

                      <div className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-center min-w-[95px]">
                        <span className="block text-base sm:text-lg font-black text-gray-900 font-heading leading-tight">
                          {calc.safeWeeks} {calc.safeWeeks === 1 ? 'Week' : 'Weeks'}
                        </span>
                        <span className="block text-[10px] font-bold text-indigo-600 leading-tight">
                          {calc.safeWeeks === 4 ? '1 Month (Max)' : `${calc.safeWeeks * 7} Days`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setWeeks(prev => Math.min(4, prev + 1))}
                        disabled={calc.safeWeeks >= 4}
                        className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-black active:scale-95 transition-all disabled:opacity-40"
                        title="Increase 1 Week"
                        aria-label="Increase term by 1 week"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Range Slider with Interactive Dynamic Track Fill */}
                  <div className="space-y-2 pt-1">
                    <div className="relative flex items-center px-1">
                      <input 
                        type="range" 
                        min="1" 
                        max="4" 
                        step="1" 
                        value={calc.safeWeeks}
                        onChange={(e) => setWeeks(Number(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${weeksPercent}%, #e2e8f0 ${weeksPercent}%, #e2e8f0 100%)`
                        }}
                        className="custom-range-slider"
                        aria-label="Repayment Period Range Slider (Max 1 Month)"
                      />
                    </div>

                    {/* Clickable Milestone Markers Along Slider */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 px-1 pt-1">
                      {MILESTONE_WEEKS.map((m) => {
                        const isSelected = calc.safeWeeks === m.val;
                        const isPast = calc.safeWeeks >= m.val;
                        return (
                          <button
                            key={m.val}
                            type="button"
                            onClick={() => setWeeks(m.val)}
                            className={`flex flex-col items-center gap-1 group transition-all ${
                              isSelected ? 'text-indigo-600 font-black scale-105' : isPast ? 'text-gray-700' : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              isSelected ? 'bg-indigo-600 ring-2 ring-indigo-200' : isPast ? 'bg-indigo-400' : 'bg-gray-200'
                            }`} />
                            <span className="leading-none">{m.label}</span>
                            <span className={`text-[8px] leading-none ${isSelected ? 'text-indigo-500 font-bold' : 'text-gray-300'}`}>{m.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration Presets */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-gray-100">
                    {DURATION_PRESETS.map((p) => (
                      <button
                        key={p.weeks}
                        type="button"
                        onClick={() => setWeeks(p.weeks)}
                        className={`p-2 sm:p-2.5 rounded-2xl text-center border transition-all active:scale-95 ${
                          calc.safeWeeks === p.weeks
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        <span className="block text-xs font-black">{p.label}</span>
                        <span className={`block text-[9px] ${calc.safeWeeks === p.weeks ? 'text-indigo-200' : 'text-gray-400'}`}>
                          {p.sublabel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Installment Frequency Toggle */}
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <Calendar size={15} className="text-indigo-600" />
                        Installment Frequency (Payment Cycle)
                      </label>
                      <p className="text-[11px] text-gray-400">Choose how frequently you will make payments</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentFrequency('weekly')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        paymentFrequency === 'weekly'
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-black shadow-sm ring-2 ring-indigo-600/20'
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600 font-bold'
                      }`}
                    >
                      <span className="block text-xs uppercase tracking-wider">Weekly</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">Every 7 Days</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentFrequency('biweekly')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        paymentFrequency === 'biweekly'
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-black shadow-sm ring-2 ring-indigo-600/20'
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600 font-bold'
                      }`}
                    >
                      <span className="block text-xs uppercase tracking-wider">Bi-Weekly</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">Every 14 Days</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentFrequency('monthly')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        paymentFrequency === 'monthly'
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-black shadow-sm ring-2 ring-indigo-600/20'
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600 font-bold'
                      }`}
                    >
                      <span className="block text-xs uppercase tracking-wider">Monthly (EMI)</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">Every 30 Days</span>
                    </button>
                  </div>
                </div>

                {/* 4. Affordability Check (Optional Income Input) */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <ShieldCheck size={15} className="text-emerald-600" />
                      Borrower Monthly Income Check
                    </span>
                    <p className="text-[11px] text-gray-400">Verifies debt-to-income affordability ratio</p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-gray-400">R</span>
                    <input 
                      type="number"
                      min="0"
                      step="500"
                      value={monthlyIncomeInput || ''}
                      placeholder="e.g. 7500"
                      onChange={(e) => setMonthlyIncomeInput(Number(e.target.value) || 0)}
                      className="w-full sm:w-32 px-3 py-2 text-xs font-black rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Calculated Results & Summary Card */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Highlight Result Card */}
                <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-[2.25rem] p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
                    <Coins size={140} />
                  </div>

                  <div className="relative z-10 space-y-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300">
                          Estimated Installment
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase">
                          {paymentFrequency}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-black tracking-tight font-heading text-white">
                          R {calc.installmentAmount.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-indigo-200">
                          / {paymentFrequency === 'monthly' ? 'month' : paymentFrequency === 'biweekly' ? '2 wks' : 'week'}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-200/80 mt-1">
                        Payable across <strong>{calc.numInstallments}</strong> installments of R {calc.installmentAmount.toLocaleString()}
                      </p>
                    </div>

                    {/* Breakdown Bars */}
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300 font-medium">Principal Amount:</span>
                        <span className="font-black text-white">R {calc.safePrincipal.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-300 font-medium">Interest ({calc.safeRate}%):</span>
                          <span className="text-[9px] bg-indigo-500/40 text-indigo-200 px-1.5 py-0.5 rounded">Fixed</span>
                        </div>
                        <span className="font-black text-emerald-400">+ R {calc.totalInterest.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10">
                        <span className="text-white font-black uppercase tracking-wider">Total Repayment:</span>
                        <span className="font-black text-lg text-white">R {calc.totalRepayment.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300 font-medium">Estimated Due Date:</span>
                        <span className="font-bold text-indigo-200 font-mono">{calc.dueDateFormatted}</span>
                      </div>
                    </div>

                    {/* Affordability Badge if income entered */}
                    {calc.debtRatio !== null && (
                      <div className={`p-3 rounded-2xl border text-xs flex items-center gap-3 ${
                        calc.debtRatio <= 25 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                          : calc.debtRatio <= 40
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}>
                        <ShieldCheck size={18} className="shrink-0" />
                        <div>
                          <div className="font-black uppercase text-[10px] tracking-wider">
                            Affordability: {calc.debtRatio.toFixed(1)}% of Income
                          </div>
                          <div className="text-[11px] opacity-90">
                            {calc.debtRatio <= 25 && 'Very safe — well within responsible borrowing bounds.'}
                            {calc.debtRatio > 25 && calc.debtRatio <= 40 && 'Moderate commitment — plan household expenses carefully.'}
                            {calc.debtRatio > 40 && 'High debt burden — consider lowering the principal or extending duration.'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quick Penalty Highlight */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className="text-amber-400" />
                        <div>
                          <span className="block font-black text-amber-300 text-[11px] uppercase tracking-wide">
                            Penalty Fee Rule
                          </span>
                          <span className="text-[10px] text-gray-300">
                            {penaltyRate}% per week overdue after 3-day grace
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('penalties')}
                        className="text-[10px] font-black uppercase text-amber-300 hover:text-white underline underline-offset-2 flex items-center gap-0.5"
                      >
                        View Details <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Actions for Prospective Borrowers */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleApplyNow}
                    className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Apply With This Calculation</span>
                    <ArrowRight size={18} />
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors"
                    >
                      <Share2 size={14} />
                      <span>WhatsApp Quote</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyQuote}
                      className="py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors"
                    >
                      {copiedQuote ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copiedQuote ? 'Copied!' : 'Copy Summary'}</span>
                    </button>
                  </div>
                </div>

                {/* Week-by-Week Amortization Preview Card */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider flex items-center gap-1.5">
                        <Table size={14} className="text-indigo-600" />
                        Week-by-Week Amortization Preview
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        {calc.safeWeeks} weekly payments of ~R {calc.weeklyEquivalent.toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('schedule')}
                      className="text-xs font-black text-indigo-600 hover:text-indigo-800 uppercase flex items-center gap-1 group"
                    >
                      <span>Full Schedule ({calc.safeWeeks} Wks)</span>
                      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Compact Preview Table */}
                  <div className="border border-gray-100 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        <tr>
                          <th className="py-2 px-3">Week</th>
                          <th className="py-2 px-3">Principal</th>
                          <th className="py-2 px-3">Interest</th>
                          <th className="py-2 px-3">Installment</th>
                          <th className="py-2 px-3 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {calc.weekByWeekSchedule.filter(w => !w.isOverdue).map((item) => (
                          <tr key={item.weekNumber} className={`hover:bg-gray-50/50 ${item.weekNumber === calc.safeWeeks ? 'bg-indigo-50/30 font-semibold' : ''}`}>
                            <td className="py-2 px-3 font-mono font-bold text-gray-700">
                              Wk {item.weekNumber} {item.weekNumber === calc.safeWeeks ? '(Final)' : ''}
                            </td>
                            <td className="py-2 px-3 text-gray-600">R {item.principalPortion.toLocaleString()}</td>
                            <td className="py-2 px-3 text-emerald-600 font-medium">R {item.interestPortion.toLocaleString()}</td>
                            <td className="py-2 px-3 font-bold text-indigo-600">R {item.totalDue.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-mono text-gray-500">R {item.remainingTotalBalance.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED PENALTY FEE STRUCTURE & SIMULATOR */}
          {activeTab === 'penalties' && (
            <div className="space-y-6">
              {/* Introduction Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
                    <ShieldAlert size={24} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base sm:text-lg font-black uppercase text-amber-950 tracking-tight">
                      Penalty Fee Structure & Overdue Policy
                    </h4>
                    <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
                      At imali, we believe in 100% financial transparency. Before taking out a microloan, understand exactly how late payment penalties work and how they are calculated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Penalty Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rule 1: Weekly Penalty Rate */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm">
                    {penaltyRate}%
                  </div>
                  <h5 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                    Weekly Penalty Rate
                  </h5>
                  <p className="text-xs text-gray-500 leading-normal">
                    A fixed <strong>{penaltyRate}% per week</strong> is charged on the original principal amount (R {calc.weeklyPenaltyAmount}/week) for every week the loan remains past its scheduled due date.
                  </p>
                </div>

                {/* Rule 2: 3-Day Grace Period */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Clock size={18} />
                  </div>
                  <h5 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                    3-Day Grace Period
                  </h5>
                  <p className="text-xs text-gray-500 leading-normal">
                    Borrowers are granted a <strong>72-hour grace period</strong> post maturity date. If paid within 3 days, <strong>zero penalties</strong> are applied to the account.
                  </p>
                </div>

                {/* Rule 3: NCA In Duplum Protection */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <h5 className="text-xs font-black uppercase text-gray-900 tracking-wider">
                    In Duplum Cap
                  </h5>
                  <p className="text-xs text-gray-500 leading-normal">
                    In adherence to South African credit law, total accumulated interest and penalties can <strong>never exceed 100%</strong> of the original borrowed principal (Cap: R {calc.safePrincipal.toLocaleString()}).
                  </p>
                </div>
              </div>

              {/* Interactive Late Payment Simulator ("What if I'm late?") */}
              <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-200/80 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                  <div>
                    <h5 className="text-sm font-black uppercase text-gray-900 tracking-wider flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-500" />
                      Interactive Overdue Penalty Simulator
                    </h5>
                    <p className="text-xs text-gray-500">
                      Simulate the financial impact of late payment on your R {calc.safePrincipal.toLocaleString()} loan
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 w-fit">
                    Test Scenarios
                  </span>
                </div>

                {/* Overdue Duration Selector */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-700">
                      Simulated Overdue Duration:
                    </label>
                    <span className="text-sm font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                      {simulatedOverdueWeeks} Week{simulatedOverdueWeeks > 1 ? 's' : ''} Late ({simulatedOverdueWeeks * 7} Days)
                    </span>
                  </div>

                  <input 
                    type="range" 
                    min="1" 
                    max="6" 
                    step="1" 
                    value={simulatedOverdueWeeks}
                    onChange={(e) => setSimulatedOverdueWeeks(Number(e.target.value))}
                    className="w-full h-2.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-amber-600 focus:outline-none"
                  />

                  <div className="grid grid-cols-6 gap-1 text-center">
                    {[1, 2, 3, 4, 5, 6].map((wk) => (
                      <button
                        key={wk}
                        type="button"
                        onClick={() => setSimulatedOverdueWeeks(wk)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
                          simulatedOverdueWeeks === wk 
                            ? 'bg-amber-600 text-white shadow-sm' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        +{wk} Wk
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulator Result Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Repayment</span>
                    <div className="text-xl font-black text-gray-800">
                      R {calc.totalRepayment.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-gray-500">Principal + {calc.safeRate}% interest</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                      Late Penalty Added
                    </span>
                    <div className="text-xl font-black text-amber-600">
                      + R {calc.cappedSimulatedPenaltyFee.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-amber-700">
                      {simulatedOverdueWeeks} wk(s) × R {calc.weeklyPenaltyAmount}/wk
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      New Total Due
                    </span>
                    <div className="text-xl font-black text-amber-300">
                      R {calc.totalWithSimulatedPenalty.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-gray-300">
                      {calc.isCapReached ? 'Capped by In Duplum law' : 'Base + accumulated penalty'}
                    </span>
                  </div>
                </div>

                {/* Important Tips to Avoid Penalties */}
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 sm:p-5 space-y-3">
                  <h6 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-600" />
                    How to Avoid Penalty Charges
                  </h6>
                  <ul className="text-xs text-indigo-900/80 space-y-1.5 list-disc pl-4 font-medium">
                    <li>
                      <strong>Communicate Early:</strong> Message the lender on WhatsApp at least 48 hours prior if you foresee cash flow difficulty to arrange a scheduled rollover.
                    </li>
                    <li>
                      <strong>Make Partial Payments:</strong> Even a partial repayment demonstrates good faith and reduces the outstanding balance subject to future penalty calculations.
                    </li>
                    <li>
                      <strong>Set Calendar Reminders:</strong> Note your due date of <strong>{calc.dueDateFormatted}</strong> to align with your payday or wage disbursement.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEEK-BY-WEEK AMORTIZATION TABLE */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              {/* Summary KPIs Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Borrowed Principal</span>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 font-heading">
                    R {calc.safePrincipal.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-indigo-600 font-bold">100% Cash Disbursed</span>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Interest ({calc.safeRate}%)</span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 font-heading">
                    R {calc.totalInterest.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium">Fixed across {calc.safeWeeks} weeks</span>
                </div>

                <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm space-y-1 ${
                  includePenaltiesInSchedule && calc.totalSimulatedPenaltiesInSchedule > 0 
                    ? 'bg-amber-50/70 border-amber-200' 
                    : 'bg-white border-gray-100'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest block text-gray-400">
                    Calculated Penalties
                  </span>
                  <div className={`text-xl sm:text-2xl font-black font-heading ${
                    includePenaltiesInSchedule && calc.totalSimulatedPenaltiesInSchedule > 0 
                      ? 'text-amber-600' 
                      : 'text-gray-400'
                  }`}>
                    {includePenaltiesInSchedule && calc.totalSimulatedPenaltiesInSchedule > 0 
                      ? `+ R ${calc.totalSimulatedPenaltiesInSchedule.toLocaleString()}` 
                      : 'R 0'}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">
                    {includePenaltiesInSchedule && calc.totalSimulatedPenaltiesInSchedule > 0 
                      ? `${simulatedOverdueWeeks} week(s) simulated` 
                      : `${penaltyRate}%/wk overdue rule`}
                  </span>
                </div>

                <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Total Amortized Due</span>
                  <div className="text-xl sm:text-2xl font-black text-amber-300 font-heading">
                    R {calc.totalAmortizedPayable.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-gray-300 font-medium">
                    ~R {calc.weeklyEquivalent.toLocaleString()}/wk base
                  </span>
                </div>
              </div>

              {/* Controls Bar: Late Penalty Toggle & Actions */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={includePenaltiesInSchedule}
                      onChange={(e) => setIncludePenaltiesInSchedule(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="text-xs font-black uppercase tracking-wider text-gray-800">
                      Simulate Late Payment Penalties ({penaltyRate}%/wk)
                    </span>
                  </label>

                  {includePenaltiesInSchedule && (
                    <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Overdue:</span>
                      {[1, 2, 3, 4, 6].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setSimulatedOverdueWeeks(w)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                            simulatedOverdueWeeks === w
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          +{w}w
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    type="button"
                    onClick={handleCopySchedule}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors active:scale-95"
                    title="Copy formatted amortization table"
                  >
                    {copiedSchedule ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedSchedule ? 'Table Copied!' : 'Copy Table'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors active:scale-95"
                    title="Share quote to WhatsApp"
                  >
                    <Share2 size={14} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Full Week-by-Week Amortization Table */}
              <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/90 text-[10px] font-black uppercase tracking-wider text-gray-500">
                        <th className="py-3.5 px-3 sm:px-4">Week</th>
                        <th className="py-3.5 px-3 sm:px-4">Due Date</th>
                        <th className="py-3.5 px-3 sm:px-4 text-right">Principal</th>
                        <th className="py-3.5 px-3 sm:px-4 text-right">Interest</th>
                        <th className="py-3.5 px-3 sm:px-4 text-right">Penalty</th>
                        <th className="py-3.5 px-3 sm:px-4 text-right font-black text-indigo-700">Total Installment</th>
                        <th className="py-3.5 px-3 sm:px-4 text-right">Remaining Principal</th>
                        <th className="py-3.5 px-3 sm:px-4 text-right">Remaining Balance</th>
                        <th className="py-3.5 px-3 sm:px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {calc.weekByWeekSchedule.map((row) => (
                        <tr 
                          key={row.weekNumber} 
                          className={`transition-colors ${
                            row.isOverdue 
                              ? 'bg-amber-50/60 hover:bg-amber-50' 
                              : row.status === 'Final Maturity' 
                              ? 'bg-indigo-50/40 hover:bg-indigo-50/60 font-semibold' 
                              : 'hover:bg-gray-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 sm:px-4 font-mono font-black text-gray-700">
                            {row.isOverdue ? (
                              <span className="text-amber-700 font-bold">Overdue +{row.weekNumber - calc.safeWeeks}</span>
                            ) : (
                              `Week ${row.weekNumber}`
                            )}
                          </td>
                          <td className="py-3 px-3 sm:px-4 font-bold text-gray-900 whitespace-nowrap">
                            {row.dueDateFormatted}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right font-medium text-gray-700">
                            {row.principalPortion > 0 ? `R ${row.principalPortion.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right font-medium text-emerald-600">
                            {row.interestPortion > 0 ? `R ${row.interestPortion.toLocaleString()}` : '—'}
                          </td>
                          <td className={`py-3 px-3 sm:px-4 text-right font-bold ${
                            row.penaltyPortion > 0 ? 'text-amber-600 font-mono' : 'text-gray-300'
                          }`}>
                            {row.penaltyPortion > 0 ? `+ R ${row.penaltyPortion.toLocaleString()}` : 'R 0'}
                          </td>
                          <td className={`py-3 px-3 sm:px-4 text-right font-black text-sm font-heading ${
                            row.isOverdue ? 'text-amber-700' : 'text-indigo-600'
                          }`}>
                            R {row.totalDue.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right font-mono font-medium text-gray-600">
                            R {row.remainingPrincipal.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right font-mono font-bold text-gray-800">
                            R {row.remainingTotalBalance.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                            {row.isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertCircle size={10} />
                                Overdue Penalty
                              </span>
                            ) : row.status === 'Final Maturity' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={10} />
                                Final Settlement
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                Active Term
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100/90 font-black text-xs border-t-2 border-gray-300">
                        <td colSpan={2} className="py-3.5 px-3 sm:px-4 uppercase tracking-wider text-gray-800">
                          Grand Totals
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right text-gray-900">
                          R {calc.totalAmortizedPrincipal.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right text-emerald-700">
                          R {calc.totalAmortizedInterest.toLocaleString()}
                        </td>
                        <td className={`py-3.5 px-3 sm:px-4 text-right font-mono ${
                          calc.totalSimulatedPenaltiesInSchedule > 0 ? 'text-amber-700' : 'text-gray-400'
                        }`}>
                          {calc.totalSimulatedPenaltiesInSchedule > 0 
                            ? `+ R ${calc.totalSimulatedPenaltiesInSchedule.toLocaleString()}` 
                            : 'R 0'}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right text-indigo-700 text-sm font-heading font-black">
                          R {calc.totalAmortizedPayable.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-gray-400">
                          R 0
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-right font-mono text-emerald-600">
                          R 0
                        </td>
                        <td className="py-3.5 px-3 sm:px-4 text-center">
                          <span className="text-[10px] text-emerald-700 font-bold uppercase">Settled</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Informational Protection Banner */}
              <div className="p-4 sm:p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-3 text-xs text-indigo-950">
                <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <span className="font-black uppercase tracking-wider block">
                    National Credit Act In Duplum Protection & 72-Hour Grace Period
                  </span>
                  <p className="text-indigo-900/80">
                    Under South African credit regulations, accumulated interest plus late penalties can legally never exceed the original loan principal amount (Cap: <strong>R {calc.safePrincipal.toLocaleString()}</strong>). Furthermore, imali provides an automatic 3-day grace period post maturity before late fees begin accruing.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500 text-center sm:text-left">
            <span>Calculations for prospective community borrowers • </span>
            <span className="font-bold text-gray-700">NCR Compliant Cap</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 font-black text-xs uppercase tracking-wider text-gray-600 transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleApplyNow}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Apply Now</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoanEmiCalculatorModal;
