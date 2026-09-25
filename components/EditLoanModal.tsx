import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  Calendar, 
  Coins, 
  AlertTriangle, 
  Trash2, 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  CreditCard, 
  History, 
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import { 
  Loan, 
  RepaymentStatus, 
  ApplicationStatus, 
  PayoutMethod 
} from '../types';

interface EditLoanModalProps {
  loan: Loan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLoan: Loan) => Promise<void> | void;
  onDelete?: (loan: Loan) => void;
}

const PRINCIPAL_PRESETS = [500, 1000, 2500, 5000, 7500, 10000];

export const EditLoanModal: React.FC<EditLoanModalProps> = ({
  loan,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  if (!isOpen || !loan) return null;

  // Local form states initialized from loan
  const [borrowerName, setBorrowerName] = useState(loan.borrowerName || '');
  const [idNumber, setIdNumber] = useState(loan.idNumber || '');
  const [borrowerNumber, setBorrowerNumber] = useState(loan.borrowerNumber || '');
  const [physicalAddress, setPhysicalAddress] = useState(loan.physicalAddress || '');
  const [employer, setEmployer] = useState(loan.employer || '');
  const [employmentStatus, setEmploymentStatus] = useState(loan.employmentStatus || 'Full-time');
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>(loan.payoutMethod || PayoutMethod.MOBILE);
  const [bankDetails, setBankDetails] = useState(loan.bankDetails || '');
  
  const [amountLoaned, setAmountLoaned] = useState<number>(loan.amountLoaned || 1000);
  const [interestRate, setInterestRate] = useState<number>(loan.interestRate ?? 30);
  const [totalRepayment, setTotalRepayment] = useState<number>(loan.totalRepayment || Math.round((loan.amountLoaned || 1000) * 1.3));
  const [autoCalculateTotal, setAutoCalculateTotal] = useState<boolean>(true);
  
  const [dueDate, setDueDate] = useState(loan.dueDate || '');
  const [status, setStatus] = useState<RepaymentStatus>(loan.status || RepaymentStatus.PENDING);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>(
    loan.applicationStatus || ApplicationStatus.APPROVED
  );
  
  const [editReason, setEditReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  // Recalculate total repayment when amountLoaned or interestRate changes if auto-calculate is on
  useEffect(() => {
    if (autoCalculateTotal) {
      const calculated = Math.round(amountLoaned * (1 + interestRate / 100));
      setTotalRepayment(calculated);
    }
  }, [amountLoaned, interestRate, autoCalculateTotal]);

  const handleSetQuickDueDate = (days: number) => {
    const targetDate = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    setDueDate(targetDate);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountLoaned || amountLoaned <= 0) {
      alert('Please enter a valid principal amount.');
      return;
    }
    if (!dueDate) {
      alert('Please specify a due date.');
      return;
    }

    const startMs = loan.startDate ? new Date(loan.startDate).getTime() : Date.now();
    const dueMs = new Date(dueDate).getTime();
    const maxTermMs = startMs + 32 * 86400000;
    if (dueMs > maxTermMs) {
      alert('Repayment period policy limit: Due date cannot exceed 1 month (maximum 31 days) from loan start date.');
      return;
    }

    setIsSaving(true);
    try {
      const historyEntry = {
        date: new Date().toISOString().split('T')[0],
        action: editReason.trim() 
          ? `Record updated by lender: ${editReason.trim()}` 
          : 'Record updated by lender (terms/details revised)',
        amount: amountLoaned
      };

      const updatedLoan: Loan = {
        ...loan,
        borrowerName: borrowerName.trim(),
        idNumber: idNumber.trim(),
        borrowerNumber: borrowerNumber.trim(),
        physicalAddress: physicalAddress.trim(),
        employer: employer.trim(),
        employmentStatus,
        payoutMethod,
        bankDetails: payoutMethod === PayoutMethod.BANK ? bankDetails.trim() : loan.bankDetails,
        amountLoaned: Number(amountLoaned),
        interestRate: Number(interestRate),
        totalRepayment: Number(totalRepayment),
        dueDate,
        status,
        applicationStatus,
        history: [...(loan.history || []), historyEntry]
      };

      await onSave(updatedLoan);
      onClose();
    } catch (err) {
      console.error('Failed to save edited loan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div 
        key="edit-loan-backdrop"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.2 }} 
        className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <motion.div 
        key="edit-loan-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.85 }}
        className="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[92vh] mt-auto sm:my-auto border border-gray-100"
      >
        {/* Mobile bottom-sheet drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="p-5 sm:p-7 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/20">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white px-2.5 py-1 rounded-md text-[10px] font-black font-mono tracking-wider">
              {loan.id}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight font-heading text-gray-900">
                Edit Loan Record
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Modify commitment terms, repayment status, or borrower contacts.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 sm:px-7 border-b border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText size={14} /> Loan Terms & Borrower
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <History size={14} /> Audit Trail ({loan.history?.length || 0})
          </button>
        </div>

        {/* Body Form */}
        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} id="edit-loan-form" className="p-5 sm:p-7 overflow-y-auto custom-scrollbar space-y-6 flex-1">
            {/* Status Pills */}
            <div className="space-y-4 p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-2">
                  Repayment Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: RepaymentStatus.PENDING, label: 'Pending', color: 'bg-amber-500' },
                    { val: RepaymentStatus.PAID, label: 'Paid in Full', color: 'bg-emerald-600' },
                    { val: RepaymentStatus.OVERDUE, label: 'Overdue', color: 'bg-rose-600' },
                    { val: RepaymentStatus.DEFAULTED, label: 'Defaulted', color: 'bg-slate-700' }
                  ].map(s => {
                    const isSelected = status === s.val;
                    return (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => setStatus(s.val)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? `${s.color} text-white shadow-sm ring-2 ring-indigo-600/20`
                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/80'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : s.color}`} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-2">
                  Application Workflow State
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ApplicationStatus.SUBMITTED,
                    ApplicationStatus.REVIEWING,
                    ApplicationStatus.APPROVED,
                    ApplicationStatus.REJECTED
                  ].map(appSt => {
                    const isSelected = applicationStatus === appSt;
                    return (
                      <button
                        key={appSt}
                        type="button"
                        onClick={() => setApplicationStatus(appSt)}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-black uppercase transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200/70'
                        }`}
                      >
                        {appSt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Financial Terms Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <Coins size={16} className="text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 font-heading">
                  Financial Terms & Schedule
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Principal Amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Principal Amount (R) *
                  </label>
                  <input
                    required
                    type="number"
                    min="100"
                    max="50000"
                    step="50"
                    value={amountLoaned}
                    onChange={e => setAmountLoaned(Number(e.target.value))}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {PRINCIPAL_PRESETS.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountLoaned(amt)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                          amountLoaned === amt
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        R {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Due Date *
                    </label>
                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                      <button
                        type="button"
                        onClick={() => handleSetQuickDueDate(7)}
                        className="hover:underline"
                      >
                        +7d
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleSetQuickDueDate(14)}
                        className="hover:underline"
                      >
                        +14d
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => handleSetQuickDueDate(30)}
                        className="hover:underline"
                      >
                        +30d (1mo)
                      </button>
                    </div>
                  </div>
                  <input
                    required
                    type="date"
                    value={dueDate}
                    max={new Date((loan.startDate ? new Date(loan.startDate).getTime() : Date.now()) + 31 * 86400000).toISOString().split('T')[0]}
                    onChange={e => setDueDate(e.target.value)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-gray-400">Repayment term capped up to 1 month (max 31 days).</p>
                </div>
              </div>

              {/* Interest and Total Due */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Service Fee / Interest (%)
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">Standard 30%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={interestRate}
                    onChange={e => setInterestRate(Number(e.target.value))}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Total Repayment Due (R)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAutoCalculateTotal(!autoCalculateTotal)}
                      className={`text-[10px] font-bold ${
                        autoCalculateTotal ? 'text-indigo-600' : 'text-amber-600'
                      }`}
                    >
                      {autoCalculateTotal ? '⚡ Auto (+30%)' : '✏️ Manual Override'}
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={totalRepayment}
                    onChange={e => {
                      setAutoCalculateTotal(false);
                      setTotalRepayment(Number(e.target.value));
                    }}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-black text-sm font-mono text-indigo-700 focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Borrower Identity & Contact Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <User size={16} className="text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 font-heading">
                  Borrower Profile & Contact
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Full Legal Name *
                  </label>
                  <input
                    required
                    value={borrowerName}
                    onChange={e => setBorrowerName(e.target.value)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    SA ID Number *
                  </label>
                  <input
                    required
                    maxLength={13}
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value.replace(/\D/g, ''))}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Mobile Phone (WhatsApp) *
                  </label>
                  <input
                    required
                    type="tel"
                    value={borrowerNumber}
                    onChange={e => setBorrowerNumber(e.target.value)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Physical Address
                  </label>
                  <input
                    value={physicalAddress}
                    onChange={e => setPhysicalAddress(e.target.value)}
                    placeholder="e.g. 42 Mandela St, Khayelitsha"
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Employer
                  </label>
                  <input
                    value={employer}
                    onChange={e => setEmployer(e.target.value)}
                    placeholder="e.g. Shoprite Logistics"
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Payout Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={e => setPayoutMethod(e.target.value as PayoutMethod)}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                  >
                    <option value={PayoutMethod.MOBILE}>Mobile Number (e.g. eWallet)</option>
                    <option value={PayoutMethod.BANK}>Bank Account (EFT)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Change Reason Memo */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Reason / Note for Revision (Optional)
              </label>
              <input
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="e.g. Extended term by 2 weeks per borrower request"
                className="p-3 bg-gray-50 border border-gray-200 rounded-2xl w-full font-medium text-xs focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </form>
        ) : (
          /* Audit Trail Tab */
          <div className="p-5 sm:p-7 overflow-y-auto custom-scrollbar space-y-3 flex-1">
            <p className="text-xs text-gray-500 font-medium mb-3">
              Immutable audit timeline of all modifications, disbursements, and payments on record:
            </p>
            {(!loan.history || loan.history.length === 0) ? (
              <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed text-gray-400 text-xs font-medium">
                No past revisions recorded for this loan yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {loan.history.map((hist, idx) => (
                  <div key={idx} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-gray-400 block">{hist.date}</span>
                      <p className="font-bold text-gray-800 mt-0.5">{hist.action}</p>
                    </div>
                    {hist.amount !== undefined && (
                      <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg shrink-0">
                        R {hist.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-gray-50/80 border-t border-gray-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(loan);
              }}
              className="w-full sm:w-auto px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 size={15} /> Delete Record
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-black text-xs uppercase transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-loan-form"
              disabled={isSaving}
              className="flex-1 sm:flex-initial px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={15} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EditLoanModal;
