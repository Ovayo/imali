import React from 'react';
import { 
  CheckCircle2, Clock, Camera, FileText, Home, 
  Briefcase, ShieldCheck, AlertCircle, ArrowRight, Sparkles 
} from 'lucide-react';

export interface KycStep {
  id: 'document' | 'photo' | 'residence' | 'income';
  label: string;
  shortLabel: string;
  description: string;
  isComplete: boolean;
  required: boolean;
  actionLabel?: string;
  onAction?: () => void;
  statusText?: string;
}

interface KycProgressBarProps {
  steps: KycStep[];
  variant?: 'header' | 'detailed' | 'card';
  overallVerified?: boolean;
  onNavigateToKycTab?: () => void;
  onOpenPhotoCapture?: () => void;
  className?: string;
}

export const KycProgressBar: React.FC<KycProgressBarProps> = ({
  steps,
  variant = 'detailed',
  overallVerified = false,
  onNavigateToKycTab,
  onOpenPhotoCapture,
  className = ''
}) => {
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.isComplete).length;
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const isAllComplete = overallVerified || completedSteps === totalSteps;

  // Status color styles
  const getProgressColor = () => {
    if (isAllComplete) return 'from-emerald-500 via-teal-500 to-emerald-600';
    if (percentage >= 50) return 'from-indigo-500 via-blue-500 to-indigo-600';
    return 'from-amber-500 via-orange-500 to-amber-600';
  };

  const getStepIcon = (id: KycStep['id']) => {
    switch (id) {
      case 'document':
        return <FileText size={14} />;
      case 'photo':
        return <Camera size={14} />;
      case 'residence':
        return <Home size={14} />;
      case 'income':
        return <Briefcase size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  // Header banner variant (embedded directly in the dark dossier top banner)
  if (variant === 'header') {
    return (
      <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isAllComplete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
              <ShieldCheck size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">KYC Verification Status</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isAllComplete 
                    ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' 
                    : percentage >= 50
                    ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                    : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                }`}>
                  {isAllComplete ? '100% Fully Verified' : `${percentage}% Incomplete`}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/80 font-medium">
                {completedSteps} of {totalSteps} verification checkpoints completed
              </p>
            </div>
          </div>

          {onNavigateToKycTab && !isAllComplete && (
            <button
              type="button"
              onClick={onNavigateToKycTab}
              className="text-[11px] font-black text-indigo-200 hover:text-white uppercase tracking-wider flex items-center gap-1 transition-colors self-end sm:self-auto bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl"
            >
              Verify Missing Steps <ArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Visual Progress Bar Track */}
        <div className="space-y-2">
          <div className="h-2.5 w-full bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-700 ease-out shadow-sm relative overflow-hidden`}
              style={{ width: `${Math.max(percentage, 5)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Micro Step Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors ${
                  step.isComplete 
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30' 
                    : 'bg-white/5 text-gray-300 border border-white/10'
                }`}
              >
                <span className="shrink-0">{getStepIcon(step.id)}</span>
                <span className="truncate">{step.shortLabel}</span>
                {step.isComplete ? (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0 ml-auto" />
                ) : (
                  <Clock size={12} className="text-amber-400 shrink-0 ml-auto" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Overview Card variant
  if (variant === 'card') {
    return (
      <div className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              isAllComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">KYC Verification Progress</h4>
              <p className="text-[11px] text-gray-500">Regulatory compliance & biometric check</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-sm font-black ${
              isAllComplete ? 'text-emerald-600' : 'text-indigo-600'
            }`}>
              {percentage}%
            </span>
            <span className="text-[10px] text-gray-400 block font-bold">
              {completedSteps}/{totalSteps} Steps
            </span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/60">
          <div 
            className={`h-full rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-700 ease-out`}
            style={{ width: `${Math.max(percentage, 5)}%` }}
          />
        </div>

        {/* Step List with action */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {steps.map(step => (
            <div 
              key={step.id} 
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                step.isComplete 
                  ? 'bg-emerald-50/50 border-emerald-200/60 text-emerald-900' 
                  : 'bg-gray-50 border-gray-100 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {getStepIcon(step.id)}
                <span className="font-bold truncate">{step.shortLabel}</span>
              </div>
              {step.isComplete ? (
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              ) : (
                <span className="text-[10px] font-black uppercase text-amber-600 shrink-0">Pending</span>
              )}
            </div>
          ))}
        </div>

        {onNavigateToKycTab && (
          <button
            type="button"
            onClick={onNavigateToKycTab}
            className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border border-gray-200"
          >
            Review KYC Documents & Photos <ArrowRight size={13} />
          </button>
        )}
      </div>
    );
  }

  // Detailed Interactive variant (used in the KYC Verification tab)
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner Card with Visual Progress */}
      <div className="bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/30 p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
              isAllComplete ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-gray-900">
                  Know-Your-Customer (KYC) Progress Tracker
                </h3>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  isAllComplete 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {isAllComplete ? 'Fully Verified' : `${completedSteps}/${totalSteps} Checkpoints Done`}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Tracks South African identity document validation, biometric webcam face confirmation, and proof of address.
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-white p-3 rounded-2xl border border-indigo-50 shrink-0">
            <span className={`text-2xl sm:text-3xl font-black ${
              isAllComplete ? 'text-emerald-600' : 'text-indigo-600'
            }`}>
              {percentage}%
            </span>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Completion</p>
          </div>
        </div>

        {/* Big Visual Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/80 shadow-inner">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${getProgressColor()} transition-all duration-700 ease-out relative overflow-hidden shadow-sm`}
              style={{ width: `${Math.max(percentage, 6)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer-slide" />
            </div>
          </div>

          {/* Step Timeline Pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
            {steps.map((step, idx) => (
              <div 
                key={step.id}
                className={`p-3 rounded-2xl border transition-all ${
                  step.isComplete 
                    ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    step.isComplete 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    Step 0{idx + 1}
                  </span>
                  {step.isComplete ? (
                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600">
                      <CheckCircle2 size={13} /> Done
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-black text-amber-600">
                      <Clock size={13} /> Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg ${step.isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {getStepIcon(step.id)}
                  </span>
                  <p className="text-xs font-black uppercase tracking-tight truncate">{step.shortLabel}</p>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{step.statusText || step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KycProgressBar;
