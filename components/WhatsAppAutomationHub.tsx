import React, { useState } from 'react';
import { Loan, UserSettings, WhatsAppNotification } from '../types';
import { 
  Smartphone, 
  AlertTriangle, 
  PartyPopper, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Send,
  Sliders,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  runAutomatedOverdueAudit, 
  dispatchAutomatedNotification,
  buildOverdueMessage,
  buildApprovalMessage
} from '../services/whatsappNotificationService';

interface WhatsAppAutomationHubProps {
  isOpen: boolean;
  onClose: () => void;
  loans: Loan[];
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onLoansUpdated: (updatedLoans: Loan[]) => void;
  notifications: WhatsAppNotification[];
  onTriggerNotification: (notification: WhatsAppNotification) => void;
}

export const WhatsAppAutomationHub: React.FC<WhatsAppAutomationHubProps> = ({
  isOpen,
  onClose,
  loans,
  settings,
  onUpdateSettings,
  onLoansUpdated,
  notifications,
  onTriggerNotification
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'test'>('overview');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLoanForTest, setSelectedLoanForTest] = useState<string>(loans[0]?.id || '');

  if (!isOpen) return null;

  const handleToggle = (key: keyof UserSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key]
    };
    onUpdateSettings(updated);
  };

  const handleRunAudit = () => {
    setIsAuditing(true);
    setAuditMessage(null);

    setTimeout(() => {
      const result = runAutomatedOverdueAudit(loans, settings);
      setIsAuditing(false);

      if (result.transitionedLoans.length > 0) {
        onLoansUpdated(result.updatedLoans);
        setAuditMessage(`Audit complete: ${result.transitionedLoans.length} loan(s) transitioned to Overdue! ${result.notificationsGenerated.length} WhatsApp reminder(s) generated.`);
        if (result.notificationsGenerated.length > 0) {
          onTriggerNotification(result.notificationsGenerated[0]);
        }
      } else {
        setAuditMessage('Audit complete: All loan commitments are up to date. No new overdue loans detected.');
      }
    }, 800);
  };

  const handleCopyMessage = (id: string, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulateTest = (type: 'overdue_reminder' | 'application_approved') => {
    const targetLoan = loans.find(l => l.id === selectedLoanForTest) || loans[0];
    if (!targetLoan) return;

    dispatchAutomatedNotification(
      targetLoan,
      type,
      `Manual test simulation initiated from WhatsApp Automation Console`,
      true // force
    ).then((notif) => {
      if (notif) {
        onTriggerNotification(notif);
      }
    });
  };

  const overdueCount = loans.filter(l => l.status === 'Overdue').length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[190] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          key="wa-hub-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          key="wa-hub-content"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="bg-white w-full max-w-3xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100 flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b bg-gradient-to-r from-emerald-900 via-gray-900 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
                <Smartphone size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Automated Service
                  </span>
                  <span className="text-[10px] text-gray-300 font-mono">v1.2</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight font-heading mt-0.5 text-white">
                  WhatsApp Notification Service
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 sm:px-8 pt-4 pb-2 border-b bg-gray-50 flex items-center gap-2">
            {[
              { id: 'overview', label: 'Automation Controls', icon: Sliders },
              { id: 'logs', label: `Trigger Log (${notifications.length})`, icon: Clock },
              { id: 'test', label: 'Test & Simulator', icon: Sparkles },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Status Hero Card */}
                <div className="bg-emerald-50/70 border border-emerald-100 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-emerald-950 uppercase tracking-tight">
                        Active Monitoring Engine
                      </h4>
                      <p className="text-xs text-emerald-800 font-medium">
                        Triggers formatted WhatsApp messages when loans turn Overdue or applications are Approved.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAudit}
                    disabled={isAuditing}
                    className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    <RefreshCw size={14} className={isAuditing ? 'animate-spin' : ''} />
                    {isAuditing ? 'Auditing...' : 'Run Overdue Audit Now'}
                  </button>
                </div>

                {auditMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-900 flex items-center gap-2"
                  >
                    <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                    <span>{auditMessage}</span>
                  </motion.div>
                )}

                {/* Configuration Toggles */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Automated Event Triggers
                  </h4>

                  {/* Master Automation Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${settings.whatsappAutomation ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-400'}`}>
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-gray-900">WhatsApp Automation Master</p>
                        <p className="text-[11px] text-gray-500">Enable or pause all automated WhatsApp event triggers.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle('whatsappAutomation')}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${settings.whatsappAutomation ? 'bg-emerald-600' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all ${settings.whatsappAutomation ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Overdue Trigger Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-rose-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${settings.whatsappAutoOverdue !== false ? 'bg-rose-100 text-rose-700' : 'bg-gray-200 text-gray-400'}`}>
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-gray-900">Overdue Status Change Reminders</p>
                        <p className="text-[11px] text-gray-500">
                          Automatically generates and prompts urgent payment reminders with accumulated penalty calculations.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle('whatsappAutoOverdue')}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${settings.whatsappAutoOverdue !== false ? 'bg-rose-600' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all ${settings.whatsappAutoOverdue !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Application Approval Trigger Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${settings.whatsappAutoApproval !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-400'}`}>
                        <PartyPopper size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-gray-900">Application Approval Notices</p>
                        <p className="text-[11px] text-gray-500">
                          Automatically dispatches congratulations, approved amount, due date, and disbursement details upon approval.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggle('whatsappAutoApproval')}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${settings.whatsappAutoApproval !== false ? 'bg-emerald-600' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-all ${settings.whatsappAutoApproval !== false ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                {/* Metrics Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black uppercase text-gray-400">Total Tracked Loans</span>
                    <p className="text-xl font-black text-gray-900 mt-1">{loans.length}</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <span className="text-[10px] font-black uppercase text-rose-500">Overdue Commitments</span>
                    <p className="text-xl font-black text-rose-700 mt-1">{overdueCount}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black uppercase text-emerald-600">WhatsApp Triggers</span>
                    <p className="text-xl font-black text-emerald-800 mt-1">{notifications.length}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Automated WhatsApp Trigger History
                  </h4>
                  <span className="text-[10px] font-mono text-gray-400">
                    {notifications.length} logged
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-3xl border border-gray-100">
                    <Clock size={36} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs font-black uppercase">No Notifications Triggered Yet</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Reminders will be logged here as loans transition to Overdue or applications are Approved.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif) => {
                      const isOverdue = notif.type === 'overdue_reminder';
                      const isCopied = copiedId === notif.id;

                      return (
                        <div
                          key={notif.id}
                          className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-gray-200 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2.5 rounded-xl shrink-0 ${
                              isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isOverdue ? <AlertTriangle size={18} /> : <PartyPopper size={18} />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isOverdue ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {isOverdue ? 'Overdue Notice' : 'Approval Notice'}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                  {notif.loanId}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  • {new Date(notif.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              </div>
                              <p className="text-sm font-black text-gray-900 mt-0.5 truncate">
                                {notif.borrowerName} ({notif.borrowerNumber})
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono line-clamp-1 mt-0.5">
                                {notif.message}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(notif.id, notif.message)}
                              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                              title="Copy WhatsApp message"
                            >
                              {isCopied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                            </button>

                            <a
                              href={notif.waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                            >
                              <Smartphone size={14} />
                              Open
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'test' && (
              <div className="space-y-5">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4">
                  <h4 className="text-xs font-black uppercase text-gray-900">
                    Simulate WhatsApp Notification Dispatch
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Test the automated template engine and click-to-chat payload generation using an existing loan record.
                  </p>

                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">
                      Select Target Loan Commitment
                    </label>
                    <select
                      value={selectedLoanForTest}
                      onChange={e => setSelectedLoanForTest(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                    >
                      {loans.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.id} - {l.borrowerName} (R{l.amountLoaned}) [{l.status}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSimulateTest('overdue_reminder')}
                      className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      <AlertTriangle size={16} />
                      Simulate Overdue Alert
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSimulateTest('application_approved')}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                    >
                      <PartyPopper size={16} />
                      Simulate Approval Alert
                    </button>
                  </div>
                </div>

                {/* Template Previews */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
                    <span className="text-[10px] font-black uppercase text-rose-600 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Overdue Template
                    </span>
                    <p className="text-[11px] text-gray-600 font-mono bg-gray-50 p-3 rounded-xl max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {loans[0] ? buildOverdueMessage(loans[0]) : 'No loan available'}
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
                    <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5">
                      <PartyPopper size={12} /> Approval Template
                    </span>
                    <p className="text-[11px] text-gray-600 font-mono bg-gray-50 p-3 rounded-xl max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {loans[0] ? buildApprovalMessage(loans[0]) : 'No loan available'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-bold text-gray-500">
                Connected to Community Firestore
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
