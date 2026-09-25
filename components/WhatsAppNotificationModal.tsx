import React, { useState } from 'react';
import { WhatsAppNotification } from '../types';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  PartyPopper, 
  Smartphone, 
  Clock, 
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WhatsAppNotificationModalProps {
  notification: WhatsAppNotification | null;
  onClose: () => void;
  onMarkSent?: (id: string) => void;
}

export const WhatsAppNotificationModal: React.FC<WhatsAppNotificationModalProps> = ({
  notification,
  onClose,
  onMarkSent
}) => {
  const [copied, setCopied] = useState(false);

  if (!notification) return null;

  const isOverdue = notification.type === 'overdue_reminder';

  const handleCopy = () => {
    navigator.clipboard.writeText(notification.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    window.open(notification.waUrl, '_blank', 'noopener,noreferrer');
    if (onMarkSent) {
      onMarkSent(notification.id);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          key="wa-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          key="wa-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="bg-white w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100 flex flex-col my-auto"
        >
          {/* Header Banner */}
          <div className={`p-6 sm:p-7 border-b flex items-center justify-between ${
            isOverdue ? 'bg-rose-50/80 border-rose-100' : 'bg-emerald-50/80 border-emerald-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                isOverdue ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {isOverdue ? <AlertTriangle size={24} /> : <PartyPopper size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isOverdue ? 'Overdue Trigger' : 'Approval Trigger'}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {notification.loanId}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight font-heading mt-0.5">
                  {isOverdue ? 'Automated Overdue Reminder' : 'Automated Approval Notice'}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-full text-gray-500 transition-colors"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-7 space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">
            {/* Recipient Metadata Card */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Recipient Borrower
                </p>
                <p className="text-sm font-black text-gray-900 truncate">
                  {notification.borrowerName}
                </p>
                <p className="text-xs font-mono text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Smartphone size={12} className="text-emerald-600" />
                  {notification.borrowerNumber}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-gray-400 flex items-center justify-end gap-1">
                  <Clock size={11} />
                  {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready to Dispatch
                </span>
              </div>
            </div>

            {/* Trigger Reason note */}
            {notification.triggerReason && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-900 font-medium">
                <span className="font-bold">Trigger Reason:</span> {notification.triggerReason}
              </div>
            )}

            {/* WhatsApp Message Preview Bubble */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Send size={12} className="text-indigo-600" /> WhatsApp Message Preview
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              {/* Chat Bubble Style */}
              <div className="bg-[#EFEAE2] p-4 rounded-2xl rounded-tr-sm border border-[#D1D7DB] relative">
                <div className="bg-white p-3.5 rounded-xl rounded-tr-sm shadow-sm text-xs font-sans whitespace-pre-wrap text-gray-800 leading-relaxed max-h-60 overflow-y-auto font-mono text-[11px]">
                  {notification.message}
                </div>
                <div className="mt-2 text-right">
                  <span className="text-[9px] text-gray-500 font-medium font-sans">
                    WhatsApp • Encrypted Automated Payload
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-5 sm:p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 font-black text-xs uppercase tracking-wider text-gray-700 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copied ? 'Copied to Clipboard' : 'Copy Message'}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Smartphone size={16} />
              Open WhatsApp Now
              <ExternalLink size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
