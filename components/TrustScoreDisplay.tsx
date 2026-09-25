import * as React from 'react';
import { Star, ShieldCheck, AlertCircle, ShieldAlert } from 'lucide-react';

export interface TrustScoreTier {
  tier: 'A+' | 'B' | 'C' | 'D';
  label: string;
  description: string;
  colorName: 'emerald' | 'indigo' | 'amber' | 'rose';
  textLight: string;
  bgLight: string;
  borderLight: string;
  textDark: string;
  bgDark: string;
  borderDark: string;
  barGradient: string;
  dotColor: string;
  glowClass: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const getTrustScoreTier = (score: number): TrustScoreTier => {
  if (score >= 750) {
    return {
      tier: 'A+',
      label: 'Excellent',
      description: 'Prime Credit Tier',
      colorName: 'emerald',
      textLight: 'text-emerald-700',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200',
      textDark: 'text-emerald-300',
      bgDark: 'bg-emerald-500/20',
      borderDark: 'border-emerald-400/40',
      barGradient: 'from-emerald-500 via-teal-400 to-emerald-300',
      dotColor: 'bg-emerald-500',
      glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.45)]',
      icon: Star
    };
  }
  if (score >= 680) {
    return {
      tier: 'B',
      label: 'Good',
      description: 'Solid Credit Health',
      colorName: 'indigo',
      textLight: 'text-indigo-700',
      bgLight: 'bg-indigo-50',
      borderLight: 'border-indigo-200',
      textDark: 'text-indigo-300',
      bgDark: 'bg-indigo-500/20',
      borderDark: 'border-indigo-400/40',
      barGradient: 'from-indigo-500 via-indigo-400 to-blue-400',
      dotColor: 'bg-indigo-500',
      glowClass: 'shadow-[0_0_15px_rgba(99,102,241,0.45)]',
      icon: ShieldCheck
    };
  }
  if (score >= 500) {
    return {
      tier: 'C',
      label: 'Fair',
      description: 'Moderate Credit Risk',
      colorName: 'amber',
      textLight: 'text-amber-700',
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-200',
      textDark: 'text-amber-300',
      bgDark: 'bg-amber-500/20',
      borderDark: 'border-amber-400/40',
      barGradient: 'from-amber-500 via-amber-400 to-yellow-300',
      dotColor: 'bg-amber-500',
      glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.45)]',
      icon: AlertCircle
    };
  }
  return {
    tier: 'D',
    label: 'Risk',
    description: 'High Risk Tier',
    colorName: 'rose',
    textLight: 'text-rose-700',
    bgLight: 'bg-rose-50',
    borderLight: 'border-rose-200',
    textDark: 'text-rose-300',
    bgDark: 'bg-rose-500/20',
    borderDark: 'border-rose-400/40',
    barGradient: 'from-rose-500 via-rose-400 to-pink-500',
    dotColor: 'bg-rose-500',
    glowClass: 'shadow-[0_0_15px_rgba(244,63,94,0.45)]',
    icon: ShieldAlert
  };
};

export interface TrustScoreDisplayProps {
  score: number;
  variant?: 'hero' | 'card' | 'compact' | 'badge-only';
  showProgressBar?: boolean;
  showMinMax?: boolean;
  className?: string;
}

export const TrustScoreDisplay: React.FC<TrustScoreDisplayProps> = ({
  score,
  variant = 'card',
  showProgressBar = true,
  showMinMax = true,
  className = ''
}) => {
  const minScore = 300;
  const maxScore = 850;
  const clampedScore = Math.min(maxScore, Math.max(minScore, score));
  const percentage = Math.min(100, Math.max(0, Math.round(((clampedScore - minScore) / (maxScore - minScore)) * 100)));

  const tier = getTrustScoreTier(score);
  const TierIcon = tier.icon;

  // Variant: Badge Only
  if (variant === 'badge-only') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider transition-transform hover:scale-105 ${tier.bgLight} ${tier.textLight} ${tier.borderLight} ${tier.glowClass} ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${tier.dotColor}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${tier.dotColor}`} />
        </span>
        <TierIcon size={12} />
        <span>Tier {tier.tier} • {tier.label}</span>
      </div>
    );
  }

  // Variant: Compact (for borrower list cards or compact slots)
  if (variant === 'compact') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Trust Score</span>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${tier.bgLight} ${tier.textLight} ${tier.borderLight}`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${tier.dotColor}`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${tier.dotColor}`} />
            </span>
            <span>{tier.tier} ({tier.label})</span>
          </div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-base font-black text-gray-900">{score}</span>
          <span className="text-[10px] font-bold text-gray-400">/ 850</span>
        </div>
        {showProgressBar && (
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden p-0.5 relative">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tier.barGradient} transition-all duration-1000 ease-out relative overflow-hidden`}
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer-slide" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant: Hero Banner (Dark Theme in Borrower Dashboard)
  if (variant === 'hero') {
    return (
      <div className={`flex flex-col items-center sm:items-start min-w-[220px] ${className}`}>
        <div className="flex items-center justify-between w-full mb-1.5 gap-2">
          <p className="text-[10px] uppercase font-black tracking-widest text-indigo-300">Trust Score</p>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase backdrop-blur-md transition-all hover:scale-105 ${tier.bgDark} ${tier.textDark} ${tier.borderDark} ${tier.glowClass}`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${tier.dotColor}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${tier.dotColor}`} />
            </span>
            <TierIcon size={12} />
            <span>Tier {tier.tier} • {tier.label}</span>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-2 w-full">
          <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{score}</p>
          <p className="text-xs text-indigo-200/70 font-bold">/ 850</p>
          <span className={`text-[10px] font-black uppercase tracking-wider ml-auto hidden sm:inline-block px-2 py-0.5 rounded-md border ${tier.bgDark} ${tier.textDark} ${tier.borderDark}`}>
            {tier.description}
          </span>
        </div>

        {showProgressBar && (
          <div className="w-full space-y-1.5">
            <div className="w-full h-3 bg-black/50 border border-white/10 rounded-full overflow-hidden p-0.5 relative shadow-inner">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tier.barGradient} transition-all duration-1000 ease-out relative overflow-hidden`}
                style={{ width: `${percentage}%` }}
              >
                <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer-slide" />
              </div>
            </div>
            {showMinMax && (
              <div className="flex justify-between text-[9px] font-bold text-indigo-200/70 px-0.5">
                <span>300 (Risk)</span>
                <span className="font-extrabold text-white">{percentage}% Rating</span>
                <span>850 (Prime)</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Variant: Card (Used in Dashboard Summary Cards)
  return (
    <div className={`w-full space-y-3 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Trust Score</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 tracking-tight">{score}</span>
            <span className="text-[10px] font-bold text-gray-400">/ 850</span>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-300 hover:scale-105 shadow-sm ${tier.bgLight} ${tier.textLight} ${tier.borderLight} ${tier.glowClass}`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${tier.dotColor}`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${tier.dotColor}`} />
          </span>
          <TierIcon size={12} />
          <span>Tier {tier.tier} • {tier.label}</span>
        </div>
      </div>

      {showProgressBar && (
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 relative shadow-inner">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tier.barGradient} transition-all duration-1000 ease-out relative overflow-hidden`}
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer-slide" />
            </div>
          </div>
          {showMinMax && (
            <div className="flex justify-between items-center text-[9px] font-black text-gray-400 uppercase tracking-tighter">
              <span>300</span>
              <span className={`font-bold ${tier.textLight}`}>{tier.description}</span>
              <span>850</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrustScoreDisplay;
