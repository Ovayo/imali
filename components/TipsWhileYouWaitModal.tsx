import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Lightbulb, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  Pause, 
  Play, 
  Code2, 
  HeartHandshake, 
  ShieldCheck, 
  Zap, 
  BookOpen, 
  RotateCw,
  ExternalLink,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface TipItem {
  id: string;
  category: 'ai_studio' | 'fintech' | 'platform';
  categoryLabel: string;
  title: string;
  tagline: string;
  content: string;
  actionableExample?: string;
  proAdvice: string;
  iconName: 'sparkles' | 'code' | 'heart' | 'shield' | 'zap';
}

const CURATED_TIPS: TipItem[] = [
  {
    id: 'tip-1',
    category: 'ai_studio',
    categoryLabel: 'AI Studio & Prompting',
    title: 'Anchor Models with System Instructions',
    tagline: 'Lock in model role, tone, and constraints permanently.',
    content: 'Instead of repeating constraints in every chat turn, define them in the System Instructions. This creates a permanent behavioural anchor for Gemini, dramatically reducing token waste and preventing the model from hallucinating or forgetting your architectural rules.',
    actionableExample: 'Example Anchor: "You are a senior TypeScript architect. Always return complete, production-ready modules without placeholder ellipses. Enforce strict South African currency formatting (R X,XXX)."',
    proAdvice: 'System instructions apply across all turns without consuming user turn history tokens.',
    iconName: 'sparkles'
  },
  {
    id: 'tip-2',
    category: 'ai_studio',
    categoryLabel: 'AI Studio & Prompting',
    title: 'Leverage Few-Shot Demonstration Examples',
    tagline: 'One concrete example is worth a thousand descriptive adjectives.',
    content: 'When asking for structured data or custom calculations (like penalty tiers), providing just 1 or 2 concrete input-and-output pairs increases prompt adherence from ~75% to over 98%. LLMs are pattern-matching engines; showing the pattern is faster than describing it.',
    actionableExample: 'Input: R1,000 borrowed for 4 weeks @ 30% interest -> Output: { principal: 1000, interest: 300, totalDue: 1300, weekly: 325 }',
    proAdvice: 'Include both a standard case and an edge case (e.g. 0% penalty when paid on time).',
    iconName: 'code'
  },
  {
    id: 'tip-3',
    category: 'ai_studio',
    categoryLabel: 'AI Studio & Prompting',
    title: 'Visual Vibe Coding with Screenshots',
    tagline: 'Upload visual references directly into AI Studio Build.',
    content: 'Gemini excels at multi-modal spatial reasoning. Upload a screenshot of a fintech UI, dashboard, or color palette alongside your prompt. Gemini will analyze the grid system, typography weights, and contrast ratios to match your desired aesthetic.',
    actionableExample: '"Match the high-density table hierarchy and clean status pill badge style from the attached screenshot."',
    proAdvice: 'Crop unnecessary browser window borders so the model focuses strictly on design components.',
    iconName: 'zap'
  },
  {
    id: 'tip-4',
    category: 'ai_studio',
    categoryLabel: 'AI Studio & Prompting',
    title: 'Surgical File Splitting Over Monoliths',
    tagline: 'Keep files focused to make AI updates instant and safe.',
    content: 'Avoid 3,000+ line files when vibe coding. Breaking code into dedicated services (`deviceDetectionService`, `whatsappNotificationService`) and modular modals prevents truncation bugs and makes tool edits lightning-fast with zero collision risk.',
    actionableExample: 'Move modals into individual files under `components/` and import them cleanly into `App.tsx`.',
    proAdvice: 'Small files compile faster and allow parallel component refactoring.',
    iconName: 'code'
  },
  {
    id: 'tip-5',
    category: 'ai_studio',
    categoryLabel: 'AI Studio & Prompting',
    title: 'Tune Temperature and Thinking Levels',
    tagline: 'Low temperature for finances, high temperature for creative ideas.',
    content: 'For accounting logic, credit risk scoring, and JSON schemas, set temperature to 0.2 - 0.4 for deterministic accuracy. For marketing copy, polite reminder letters, or brainstorming community incentives, raise temperature to 0.9 - 1.2.',
    actionableExample: 'Gemini 3 models feature selectable thinking levels: choose "High Reasoning" for risk evaluation and "Speed" for quick UI text.',
    proAdvice: 'Deterministic low temperature avoids floating-point calculation drift in prompts.',
    iconName: 'zap'
  },
  {
    id: 'tip-6',
    category: 'fintech',
    categoryLabel: 'Micro-Lending & Ubuntu',
    title: 'Ubuntu-Based Community Trust Scores',
    tagline: 'Incentivize positive habits over purely punitive debt collection.',
    content: 'Micro-lending in South African townships thrives on mutual respect (Ubuntu: "Umntu ngumntu ngabantu"). Rewarding borrowers who communicate before their due date with Trust Score boosts creates long-term repayment loyalty that aggressive legal threats cannot match.',
    actionableExample: 'Offer a 10-point bonus on the Community Trust Score when a borrower notifies the lender 48 hours prior to an extension.',
    proAdvice: 'Borrowers with Trust Scores over 750 have an 88% lower default rate across peer portfolios.',
    iconName: 'heart'
  },
  {
    id: 'tip-7',
    category: 'fintech',
    categoryLabel: 'Micro-Lending & Ubuntu',
    title: 'Culturally Respectful WhatsApp Communication',
    tagline: 'Personalized isiXhosa greetings increase response rates by 3x.',
    content: 'Generic robotic SMS notices are often dismissed as automated spam. Opening with "Molo [Name]" and closing with "Siyabonga kakhulu ngokuthembeka kwakho" validates the borrower dignity and reinforces community partnership.',
    actionableExample: 'Use our built-in Batch WhatsApp Reminders with the "Friendly Check-In" template for active loans before they become overdue.',
    proAdvice: 'WhatsApp click-to-chat links with prefilled loan IDs allow borrowers to reply with payment slips in one tap.',
    iconName: 'heart'
  },
  {
    id: 'tip-8',
    category: 'fintech',
    categoryLabel: 'Micro-Lending & Ubuntu',
    title: 'Transparent 5% Weekly Penalty Transparency',
    tagline: 'Clear terms prevent disputes and safeguard community trust.',
    content: 'Surprise interest penalties are the #1 cause of borrower disputes. Transparently showing the exact breakdown—principal, scheduled interest, and calculated weekly overdue penalty—removes ambiguity and encourages immediate partial settlement.',
    actionableExample: 'Our loan cards show the live penalty breakdown in real-time (+R 50/week) so both lender and borrower are always aligned.',
    proAdvice: 'Always allow a 24-hour grace period after the due date before penalty accrual triggers.',
    iconName: 'shield'
  },
  {
    id: 'tip-9',
    category: 'platform',
    categoryLabel: 'Imali Platform Mastery',
    title: 'Batch Actions Save Hours on Due Dates',
    tagline: 'Select multiple loans to mark paid or message in seconds.',
    content: 'Don’t process 20 loans one by one. Use the "Select Multiple" button in the Loans tab to check multiple entries simultaneously. You can batch-mark them as Paid with cloud synchronization or launch the Batch WhatsApp Reminder tool with progress tracking.',
    actionableExample: 'Filter by "Overdue", click "Select All Visible", and open the Batch WhatsApp Reminders console to step through all recipients.',
    proAdvice: 'Use the "Open Next Unsent" button in the modal to send reminders without tripping browser popup blockers.',
    iconName: 'zap'
  },
  {
    id: 'tip-10',
    category: 'platform',
    categoryLabel: 'Imali Platform Mastery',
    title: 'Offline-First & Cloud Firestore Sync',
    tagline: 'Your lending ledger remains accessible even in load shedding.',
    content: 'Imali uses a dual-layer storage architecture. All borrower dossiers, loan states, and audit trails cache instantly to encrypted local browser storage, and seamlessly synchronize to Google Cloud Firestore the moment internet connectivity restores.',
    actionableExample: 'Go to Settings -> "Download JSON Backup" or "Export CSV" to maintain a portable cold-storage ledger of your entire community book.',
    proAdvice: 'The green "Live" badge in the header confirms your real-time cloud sync is healthy.',
    iconName: 'shield'
  }
];

interface TipsWhileYouWaitModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'all' | 'ai_studio' | 'fintech' | 'platform';
}

export const TipsWhileYouWaitModal: React.FC<TipsWhileYouWaitModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'all'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ai_studio' | 'fintech' | 'platform'>(defaultCategory);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filtered tips
  const filteredTips = useMemo(() => {
    if (selectedCategory === 'all') return CURATED_TIPS;
    return CURATED_TIPS.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  // Keep index within bounds when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory]);

  // Current tip item
  const currentTip = filteredTips[currentIndex] || filteredTips[0];

  // Auto-play timer (slides smoothly without ever auto-closing the modal!)
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % filteredTips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isOpen, isAutoPlaying, filteredTips.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev + 1) % filteredTips.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev - 1 + filteredTips.length) % filteredTips.length);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredTips.length, onClose]);

  if (!isOpen || !currentTip) return null;

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % filteredTips.length);
  };

  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + filteredTips.length) % filteredTips.length);
  };

  const handleCopyTip = () => {
    const textToCopy = `💡 ${currentTip.title}\n\n${currentTip.content}\n\n👉 Practical Tip: ${currentTip.actionableExample || currentTip.proAdvice}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'sparkles': return <Sparkles size={20} className="text-amber-500" />;
      case 'code': return <Code2 size={20} className="text-indigo-500" />;
      case 'heart': return <HeartHandshake size={20} className="text-rose-500" />;
      case 'shield': return <ShieldCheck size={20} className="text-emerald-500" />;
      default: return <Zap size={20} className="text-amber-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[320] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto">
        <motion.div
          key="tips-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-950/75 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          key="tips-modal-container"
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="p-5 sm:p-7 bg-gradient-to-br from-gray-900 via-indigo-950 to-slate-900 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95"
              aria-label="Close tips"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
                <Lightbulb size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black font-heading tracking-tight text-white">
                    Enjoy these tips while you wait
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Pro Tips
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  Take your time — these tips stay open right here so you can read, learn, and copy without rushing!
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-5 mt-2 border-t border-white/15">
              {[
                { id: 'all', label: `All Tips (${CURATED_TIPS.length})` },
                { id: 'ai_studio', label: 'AI Studio & Prompting' },
                { id: 'fintech', label: 'Micro-Lending & Ubuntu' },
                { id: 'platform', label: 'Platform Mastery' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1 active:scale-95 ${
                    selectedCategory === cat.id
                      ? 'bg-amber-400 text-gray-950 shadow-md font-black'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tip Content Card */}
          <div className="p-5 sm:p-8 space-y-5 bg-gradient-to-b from-white to-gray-50/50">
            {/* Category tag & navigation counter */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
                {getIcon(currentTip.iconName)}
                <span>{currentTip.categoryLabel}</span>
              </span>

              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-gray-400 text-xs">
                  Tip {currentIndex + 1} of {filteredTips.length}
                </span>
                <button
                  onClick={() => setIsAutoPlaying(prev => !prev)}
                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                    isAutoPlaying 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                      : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isAutoPlaying ? "Pause automatic slideshow" : "Start automatic slideshow (every 8s)"}
                >
                  {isAutoPlaying ? <Pause size={12} /> : <Play size={12} />}
                  <span className="text-[10px] font-bold hidden sm:inline">
                    {isAutoPlaying ? 'Auto (8s)' : 'Slide'}
                  </span>
                </button>
              </div>
            </div>

            {/* Tip Title & Tagline */}
            <div>
              <h4 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-heading">
                {currentTip.title}
              </h4>
              <p className="text-xs sm:text-sm font-semibold text-indigo-600 mt-1">
                {currentTip.tagline}
              </p>
            </div>

            {/* Main Tip Body */}
            <div className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs select-text">
              {currentTip.content}
            </div>

            {/* Actionable Example Snippet (if available) */}
            {currentTip.actionableExample && (
              <div className="p-3.5 bg-gray-900 text-gray-100 rounded-2xl text-xs font-mono select-text border border-gray-800">
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-1 flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>Practical Example / Formula</span>
                </div>
                <p className="text-gray-200 leading-normal">{currentTip.actionableExample}</p>
              </div>
            )}

            {/* Pro Advice Callout */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
              <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong className="font-bold text-amber-950">Expert Takeaway: </strong>
                <span>{currentTip.proAdvice}</span>
              </div>
            </div>

            {/* Dot Progress Indicators */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {filteredTips.map((tip, idx) => (
                <button
                  key={tip.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex 
                      ? 'w-6 bg-indigo-600' 
                      : 'w-2 bg-gray-200 hover:bg-gray-300'
                  }`}
                  aria-label={`Go to tip ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleCopyTip}
              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-black uppercase tracking-wider text-gray-700 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
              title="Copy this tip to clipboard"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Tip'}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handlePrev}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-wider text-gray-700 flex items-center justify-center gap-1 active:scale-95 transition-all"
                title="Previous Tip (Left Arrow)"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <button
                onClick={handleNext}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
                title="Next Tip (Right Arrow)"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>

              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TipsWhileYouWaitModal;
