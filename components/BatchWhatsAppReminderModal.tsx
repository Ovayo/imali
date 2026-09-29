import React, { useState, useMemo } from 'react';
import { Loan, RepaymentStatus } from '../types';
import { 
  X, 
  Smartphone, 
  Check, 
  Copy, 
  ExternalLink, 
  AlertTriangle, 
  Send, 
  Users, 
  CheckCheck, 
  ArrowRight,
  Sparkles,
  PhoneCall,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BatchWhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLoans: Loan[];
  calculatePenaltyDetails: (loan: Loan) => { penalty: number; weeks: number };
}

export const BatchWhatsAppReminderModal: React.FC<BatchWhatsAppReminderModalProps> = ({
  isOpen,
  onClose,
  selectedLoans,
  calculatePenaltyDetails
}) => {
  const [sentLoanIds, setSentLoanIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [templateType, setTemplateType] = useState<'standard' | 'formal' | 'friendly'>('standard');
  const [previewLoanId, setPreviewLoanId] = useState<string>(selectedLoans[0]?.id || '');

  // Reset or initialize preview when modal opens or selection changes
  React.useEffect(() => {
    if (selectedLoans.length > 0 && !selectedLoans.some(l => l.id === previewLoanId)) {
      setPreviewLoanId(selectedLoans[0].id);
    }
  }, [selectedLoans, previewLoanId]);

  if (!isOpen || selectedLoans.length === 0) return null;

  // Format phone to international format
  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    const clean = phone.replace(/[^0-9]/g, '');
    if (!clean) return '';
    if (clean.startsWith('0')) return '27' + clean.slice(1);
    if (clean.startsWith('27')) return clean;
    return clean;
  };

  // Build message based on template type and loan condition
  const getMessageForLoan = (loan: Loan) => {
    const penalty = calculatePenaltyDetails(loan).penalty;
    const totalDue = loan.totalRepayment + penalty;
    const isOverdue = loan.status === RepaymentStatus.OVERDUE || penalty > 0;

    if (templateType === 'formal') {
      return `📋 *OFFICIAL IMALI REPAYMENT NOTICE*
Ref: ${loan.id}
Date: ${new Date().toLocaleDateString('en-ZA')}

To: *${loan.borrowerName}*
ID Number: ${loan.idNumber}

This is a formal communication from your imali lender regarding your microloan commitment (${loan.id}).

• Principal Amount: R ${loan.amountLoaned.toLocaleString()}
• Total Scheduled Due: R ${loan.totalRepayment.toLocaleString()}
${penalty > 0 ? `• Overdue Penalty: R ${penalty.toLocaleString()} (${loan.penaltyRate || 5}% per week)\n` : ''}• *Total Outstanding: R ${totalDue.toLocaleString()}*
• Due Date: *${loan.dueDate}*
• Current Status: ${isOverdue ? '⚠️ OVERDUE' : 'ACTIVE / PENDING'}

Please ensure full settlement or contact your lender immediately to confirm your payment receipt and maintain your Community Trust Score.

_Imali Community Micro-Lending Portal_`;
    }

    if (templateType === 'friendly') {
      return `Molo *${loan.borrowerName}*! 👋

Hope you are doing well. This is a quick friendly check-in from your imali lender regarding your loan commitment (${loan.id}).

A reminder that R *${totalDue.toLocaleString()}*${penalty > 0 ? ` (including R${penalty} overdue penalty)` : ''} is due on *${loan.dueDate}*.

Prompt repayment helps you unlock higher pre-approval limits and keeps our community micro-finance strong! Enkosi kakhulu 🙏`;
    }

    // Default 'standard'
    return `Molo *${loan.borrowerName}*, this is a payment notification regarding your imali commitment (${loan.id}). Total amount due: *R ${totalDue.toLocaleString()}*${penalty > 0 ? ` (includes R${penalty} overdue penalty)` : ''} by *${loan.dueDate}*. 

Please reply with proof of payment once transferred to update your record. Siyabonga!`;
  };

  const getWaLinkForLoan = (loan: Loan) => {
    const phone = formatPhone(loan.borrowerNumber);
    if (!phone) return null;
    const msg = encodeURIComponent(getMessageForLoan(loan));
    return `https://wa.me/${phone}?text=${msg}`;
  };

  const handleOpenLoanWhatsApp = (loan: Loan) => {
    const url = getWaLinkForLoan(loan);
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSentLoanIds(prev => new Set([...prev, loan.id]));
  };

  // Find next unsent loan with valid phone
  const nextUnsentLoan = selectedLoans.find(l => !sentLoanIds.has(l.id) && Boolean(formatPhone(l.borrowerNumber)));

  const handleOpenNext = () => {
    if (nextUnsentLoan) {
      handleOpenLoanWhatsApp(nextUnsentLoan);
    }
  };

  const handleCopySingle = (loan: Loan) => {
    const msg = getMessageForLoan(loan);
    navigator.clipboard.writeText(msg);
    setCopiedId(loan.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const fullText = selectedLoans.map(loan => {
      const msg = getMessageForLoan(loan);
      return `--- ${loan.borrowerName} (${loan.borrowerNumber || 'No Phone'}) ---\n${msg}\n`;
    }).join('\n');
    navigator.clipboard.writeText(fullText);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  const handleCopyPhoneNumbers = () => {
    const numbers = selectedLoans
      .map(l => formatPhone(l.borrowerNumber))
      .filter(Boolean)
      .join(', ');
    navigator.clipboard.writeText(numbers);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  const activePreviewLoan = selectedLoans.find(l => l.id === previewLoanId) || selectedLoans[0];
  const validPhoneCount = selectedLoans.filter(l => Boolean(formatPhone(l.borrowerNumber))).length;
  const sentCount = selectedLoans.filter(l => sentLoanIds.has(l.id)).length;
  const totalOutstandingAll = selectedLoans.reduce((sum, l) => sum + l.totalRepayment + calculatePenaltyDetails(l).penalty, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        <motion.div
          key="wa-batch-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          key="wa-batch-modal"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all active:scale-95"
              aria-label="Close batch reminder"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white shrink-0 border border-white/20">
                <Smartphone size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black font-heading tracking-tight">
                    Batch WhatsApp Reminders
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white border border-white/25">
                    {selectedLoans.length} Selected
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Send personalized WhatsApp payment reminders directly to {selectedLoans.length} borrower{selectedLoans.length === 1 ? '' : 's'}.
                </p>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/15 text-xs">
              <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                <span className="text-[10px] text-emerald-200 uppercase font-black tracking-wider block">Recipients</span>
                <span className="text-base font-black font-mono">{selectedLoans.length} Borrowers</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                <span className="text-[10px] text-emerald-200 uppercase font-black tracking-wider block">Valid Numbers</span>
                <span className="text-base font-black font-mono">{validPhoneCount} / {selectedLoans.length}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                <span className="text-[10px] text-emerald-200 uppercase font-black tracking-wider block">Dispatched</span>
                <span className="text-base font-black font-mono">{sentCount} of {selectedLoans.length} Sent</span>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                <span className="text-[10px] text-emerald-200 uppercase font-black tracking-wider block">Total Outstanding</span>
                <span className="text-base font-black font-mono">R {totalOutstandingAll.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Controls Bar: Template Picker & Quick Actions */}
          <div className="p-4 sm:px-6 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Template:</span>
              <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setTemplateType('standard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    templateType === 'standard' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Standard Due Notice
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('formal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    templateType === 'formal' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Formal Letter
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('friendly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    templateType === 'friendly' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Friendly Check-In
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyAll}
                className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                title="Copy all generated messages to clipboard"
              >
                {allCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {allCopied ? 'Copied All!' : 'Copy All Messages'}
              </button>
              <button
                type="button"
                onClick={handleCopyPhoneNumbers}
                className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                title="Copy phone numbers list for broadcast"
              >
                <PhoneCall size={14} />
                Copy Numbers
              </button>
            </div>
          </div>

          {/* Main content area: Left List + Right Message Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-gray-100">
            {/* Borrower List Column */}
            <div className="md:col-span-6 overflow-y-auto max-h-[50vh] md:max-h-[55vh] p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between pb-1 px-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                  Select to preview ({selectedLoans.length})
                </span>
                {nextUnsentLoan && (
                  <button
                    type="button"
                    onClick={handleOpenNext}
                    className="text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 transition-all active:scale-95"
                  >
                    <span>Send Next Unsent</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>

              {selectedLoans.map((loan) => {
                const penalty = calculatePenaltyDetails(loan).penalty;
                const totalDue = loan.totalRepayment + penalty;
                const isOverdue = loan.status === RepaymentStatus.OVERDUE || penalty > 0;
                const isSent = sentLoanIds.has(loan.id);
                const isSelectedForPreview = loan.id === activePreviewLoan.id;
                const hasPhone = Boolean(formatPhone(loan.borrowerNumber));
                const waUrl = getWaLinkForLoan(loan);

                return (
                  <div
                    key={loan.id}
                    onClick={() => setPreviewLoanId(loan.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelectedForPreview 
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500' 
                        : 'border-gray-200/80 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-black text-xs text-gray-700 shrink-0">
                          {loan.borrowerName ? loan.borrowerName[0] : 'B'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-sm truncate">{loan.borrowerName}</p>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono">
                            <span>{loan.id}</span>
                            <span>•</span>
                            <span>{loan.borrowerNumber || 'No phone'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCheck size={12} /> Sent
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Due:</span>
                        <span className="font-bold text-gray-700">{loan.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 font-mono">
                          R {totalDue.toLocaleString()}
                        </span>
                        {waUrl ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLoanWhatsApp(loan);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all active:scale-95 ${
                              isSent 
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                            title="Open WhatsApp chat with prefilled reminder"
                          >
                            <Send size={11} />
                            <span>{isSent ? 'Resend' : 'Send'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-500 italic">No phone</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Preview Column */}
            <div className="md:col-span-6 p-4 sm:p-5 flex flex-col justify-between bg-gray-50/50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                      Message Preview:
                    </span>
                    <span className="font-bold text-xs text-gray-800">
                      {activePreviewLoan.borrowerName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopySingle(activePreviewLoan)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copiedId === activePreviewLoan.id ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedId === activePreviewLoan.id ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>

                {/* WhatsApp Chat Bubble Mockup */}
                <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-gray-200 shadow-inner relative font-sans">
                  <div className="max-w-[95%] bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm text-xs leading-relaxed text-gray-900 whitespace-pre-wrap select-text">
                    {getMessageForLoan(activePreviewLoan)}
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-gray-400">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck size={12} className="text-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 leading-normal flex items-start gap-2">
                  <ShieldCheck size={16} className="shrink-0 text-amber-700 mt-0.5" />
                  <p>
                    <strong>Browser Protection Tip:</strong> Because web browsers restrict opening multiple popups at the same instant, use the <strong>"Open Next Unsent"</strong> button or tap <strong>"Send"</strong> next to each borrower. Each click opens the official WhatsApp Web/App chat with the message ready to send!
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                <div className="text-xs text-gray-500 font-medium">
                  {sentCount} of {selectedLoans.length} sent ({Math.round((sentCount / selectedLoans.length) * 100)}% complete)
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {nextUnsentLoan ? (
                    <button
                      type="button"
                      onClick={handleOpenNext}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                    >
                      <Smartphone size={16} />
                      <span>Send to {nextUnsentLoan.borrowerName.split(' ')[0]}</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    >
                      <Check size={16} />
                      <span>Done</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BatchWhatsAppReminderModal;
