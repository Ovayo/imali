import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Calendar, 
  Coins, 
  ArrowRight, 
  ShieldCheck, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Minus,
  Info,
  Banknote
} from 'lucide-react';
import { BorrowerProfile } from '../types';

interface LoanSimulationToolProps {
  borrower?: (BorrowerProfile & { score?: number }) | null;
  onApply?: (amount: number, termWeeks: number, dueDate: string) => void;
  defaultPrincipal?: number;
  defaultWeeks?: number;
  interestRate?: number;
  className?: string;
  isCompact?: boolean;
}

const PRINCIPAL_PRESETS = [500, 1000, 2500, 5000, 7500, 10000];
const TERM_PRESETS = [
  { weeks: 1, label: '1 Week', sublabel: '7 Days' },
  { weeks: 2, label: '2 Weeks', sublabel: '14 Days' },
  { weeks: 3, label: '3 Weeks', sublabel: '21 Days' },
  { weeks: 4, label: '4 Weeks', sublabel: '1 Month (Max)' },
];

export const LoanSimulationTool: React.FC<LoanSimulationToolProps> = ({
  borrower,
  onApply,
  defaultPrincipal = 2500,
  defaultWeeks = 4,
  interestRate = 30,
  className = '',
  isCompact = false
}) => {
  const [principal, setPrincipal] = useState<number>(defaultPrincipal);
  const [weeks, setWeeks] = useState<number>(defaultWeeks);
  const [activeFrequencyView, setActiveFrequencyView] = useState<'both' | 'weekly' | 'monthly'>('both');

  // Calculations
  const simulation = useMemo(() => {
    const safePrincipal = Math.max(200, Math.min(25000, principal || 0));
    const safeWeeks = Math.max(1, Math.min(4, weeks || 1));
    const totalInterest = Math.round(safePrincipal * (interestRate / 100));
    const totalRepayment = safePrincipal + totalInterest;

    // Weekly installment
    const weeklyAmount = Math.round(totalRepayment / safeWeeks);

    // Approximate calendar months
    const approxMonths = Math.max(1, Math.round(safeWeeks / 4.333));
    const monthlyAmount = Math.round(totalRepayment / approxMonths);

    // Estimated maturity date
    const targetDate = new Date(Date.now() + safeWeeks * 7 * 86400000);
    const dueDateISO = targetDate.toISOString().split('T')[0];
    const dueDateFormatted = targetDate.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // Affordability metrics if income is available
    const monthlyIncome = borrower?.monthlyIncome || 0;
    const debtRatio = monthlyIncome > 0 ? (monthlyAmount / monthlyIncome) * 100 : null;

    return {
      safePrincipal,
      safeWeeks,
      totalInterest,
      totalRepayment,
      weeklyAmount,
      monthlyAmount,
      approxMonths,
      dueDateISO,
      dueDateFormatted,
      debtRatio
    };
  }, [principal, weeks, interestRate, borrower?.monthlyIncome]);

  const handleAdjustPrincipal = (delta: number) => {
    setPrincipal(prev => Math.max(500, Math.min(20000, prev + delta)));
  };

  const handleAdjustWeeks = (delta: number) => {
    setWeeks(prev => Math.max(1, Math.min(4, prev + delta)));
  };

  const handleApplyClick = () => {
    if (onApply) {
      onApply(simulation.safePrincipal, simulation.safeWeeks, simulation.dueDateISO);
    }
  };

  return (
    <div 
      id="borrower-loan-simulation"
      className={`bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header Banner */}
      <div className="p-6 sm:p-8 border-b border-gray-100/80 bg-gradient-to-r from-slate-50/80 via-indigo-50/30 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <Calculator size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-gray-900 font-heading">
                Loan Simulation
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles size={11} /> Interactive
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Adjust principal and term to simulate your estimated weekly and monthly repayments.
            </p>
          </div>
        </div>

        {/* Frequency display toggle */}
        <div className="flex items-center self-start sm:self-auto bg-gray-100/80 p-1 rounded-xl border border-gray-200/60">
          <button
            type="button"
            onClick={() => setActiveFrequencyView('both')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${
              activeFrequencyView === 'both' 
                ? 'bg-white text-gray-900 shadow-xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Cycles
          </button>
          <button
            type="button"
            onClick={() => setActiveFrequencyView('weekly')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${
              activeFrequencyView === 'weekly' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setActiveFrequencyView('monthly')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${
              activeFrequencyView === 'monthly' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Main Simulation Body */}
      <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Inputs & Sliders */}
        <div className="lg:col-span-7 space-y-7">
          {/* Principal Amount Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Coins size={16} className="text-indigo-600" />
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Principal Amount
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjustPrincipal(-500)}
                  disabled={principal <= 500}
                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center font-bold text-xs disabled:opacity-40 transition-all active:scale-95"
                  title="Decrease by R500"
                >
                  <Minus size={13} />
                </button>
                <div className="px-3 py-1 rounded-xl bg-gray-50 border border-gray-200/80 min-w-[100px] text-right">
                  <span className="text-base sm:text-lg font-black font-mono text-gray-900">
                    R {principal.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdjustPrincipal(500)}
                  disabled={principal >= 20000}
                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center font-bold text-xs disabled:opacity-40 transition-all active:scale-95"
                  title="Increase by R500"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Range Slider */}
            <div className="relative py-1">
              <input
                type="range"
                min={500}
                max={15000}
                step={250}
                value={principal}
                onChange={e => setPrincipal(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${Math.min(100, Math.max(0, ((principal - 500) / (15000 - 500)) * 100))}%, #e2e8f0 ${Math.min(100, Math.max(0, ((principal - 500) / (15000 - 500)) * 100))}%, #e2e8f0 100%)`
                }}
                className="custom-range-slider"
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1.5">
                <span>Min: R 500</span>
                <span>R 5,000</span>
                <span>R 10,000</span>
                <span>Max: R 15,000</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {PRINCIPAL_PRESETS.map(amt => {
                const isSelected = principal === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPrincipal(amt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70'
                    }`}
                  >
                    R {amt.toLocaleString()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Term Duration Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-indigo-600" />
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                  Repayment Term
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjustWeeks(-1)}
                  disabled={weeks <= 1}
                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center font-bold text-xs disabled:opacity-40 transition-all active:scale-95"
                  title="Decrease term by 1 week"
                >
                  <Minus size={13} />
                </button>
                <div className="px-3 py-1 rounded-xl bg-gray-50 border border-gray-200/80 min-w-[100px] text-right">
                  <span className="text-base sm:text-lg font-black font-mono text-gray-900">
                    {weeks} {weeks === 1 ? 'Week' : 'Weeks'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdjustWeeks(1)}
                  disabled={weeks >= 4}
                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center font-bold text-xs disabled:opacity-40 transition-all active:scale-95"
                  title="Increase term by 1 week"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {/* Range Slider for Term */}
            <div className="relative py-1">
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={weeks}
                onChange={e => setWeeks(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${Math.min(100, Math.max(0, ((weeks - 1) / (4 - 1)) * 100))}%, #e2e8f0 ${Math.min(100, Math.max(0, ((weeks - 1) / (4 - 1)) * 100))}%, #e2e8f0 100%)`
                }}
                className="custom-range-slider"
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1.5">
                <span>1 Wk (7d)</span>
                <span>2 Wks (14d)</span>
                <span>3 Wks (21d)</span>
                <span>4 Wks (1 Mo Max)</span>
              </div>
            </div>

            {/* Quick Term Presets */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {TERM_PRESETS.map(preset => {
                const isSelected = weeks === preset.weeks;
                return (
                  <button
                    key={preset.weeks}
                    type="button"
                    onClick={() => setWeeks(preset.weeks)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200/70'
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className={`text-[10px] font-normal ${isSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                      ({preset.sublabel})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulated Repayments Card */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-indigo-950 text-white rounded-[2rem] p-6 sm:p-7 shadow-xl border border-slate-800 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-300">
                Simulated Repayments
              </span>
              <span className="text-[10px] font-bold text-slate-300 px-2 py-0.5 rounded-md bg-white/10">
                Fixed 30% Fee
              </span>
            </div>

            {/* Repayment Amounts: Weekly vs Monthly */}
            <div className="mt-5 space-y-3">
              {(activeFrequencyView === 'both' || activeFrequencyView === 'weekly') && (
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                        Weekly Installment
                      </p>
                      <p className="text-2xl sm:text-3xl font-black font-heading tabular-nums text-white mt-0.5">
                        R {simulation.weeklyAmount.toLocaleString()}
                        <span className="text-xs font-bold text-indigo-300 ml-1.5 tracking-normal">/ week</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                        {simulation.safeWeeks} {simulation.safeWeeks === 1 ? 'installment' : 'installments'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {(activeFrequencyView === 'both' || activeFrequencyView === 'monthly') && (
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                        Monthly Equivalent
                      </p>
                      <p className="text-2xl sm:text-3xl font-black font-heading tabular-nums text-white mt-0.5">
                        R {simulation.monthlyAmount.toLocaleString()}
                        <span className="text-xs font-bold text-indigo-300 ml-1.5 tracking-normal">/ month</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                        {simulation.approxMonths} {simulation.approxMonths === 1 ? 'cycle' : 'cycles'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Financial Breakdown Table */}
            <div className="mt-5 pt-4 border-t border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Principal Disbursed</span>
                <span className="font-mono font-bold text-white">R {simulation.safePrincipal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Fixed Interest (30%)</span>
                <span className="font-mono font-bold text-indigo-300">+ R {simulation.totalInterest.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Estimated Due Date</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Calendar size={12} className="text-indigo-400" />
                  {simulation.dueDateFormatted}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-white">
                <span className="font-black uppercase tracking-wider text-xs">Total Due</span>
                <span className="font-black font-mono text-lg text-emerald-400">
                  R {simulation.totalRepayment.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Affordability Context Badge */}
            {simulation.debtRatio !== null && (
              <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs">
                <CheckCircle2 size={15} className={simulation.debtRatio <= 35 ? 'text-emerald-400 shrink-0' : 'text-amber-400 shrink-0'} />
                <span className="text-[11px] text-slate-200">
                  Commitment is <strong className="text-white">{simulation.debtRatio.toFixed(0)}%</strong> of your recorded monthly income.
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          {onApply && (
            <button
              type="button"
              onClick={handleApplyClick}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-900/50 transition-all flex items-center justify-center gap-2"
            >
              <span>Apply for R {simulation.safePrincipal.toLocaleString()}</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanSimulationTool;
