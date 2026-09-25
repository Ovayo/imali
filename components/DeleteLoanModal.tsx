import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Loan } from '../types';

interface DeleteLoanModalProps {
  loan: Loan | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (loanId: string) => Promise<void> | void;
}

export const DeleteLoanModal: React.FC<DeleteLoanModalProps> = ({
  loan,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !loan) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(loan.id);
    } catch (err) {
      console.error('Failed to delete loan:', err);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        key="delete-loan-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        key="delete-loan-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl relative z-10 border border-rose-100 overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <Trash2 size={26} />
        </div>

        <h3 className="text-xl font-black uppercase text-gray-900 font-heading">
          Delete Loan Record?
        </h3>

        <p className="text-xs text-gray-500 mt-2 leading-relaxed font-medium">
          You are about to permanently delete commitment record{' '}
          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
            {loan.id}
          </span>{' '}
          for <strong className="text-gray-900">{loan.borrowerName}</strong>.
        </p>

        {/* Loan Context Summary Card */}
        <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Principal</span>
            <span className="font-mono font-black text-gray-900">R {loan.amountLoaned.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Total Due</span>
            <span className="font-mono font-black text-indigo-600">R {loan.totalRepayment.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Status</span>
            <span className="font-bold text-gray-700 uppercase text-[10px]">{loan.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 font-bold uppercase text-[10px]">Maturity</span>
            <span className="font-medium text-gray-600">{loan.dueDate}</span>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mt-4 p-3 bg-rose-50/70 border border-rose-100 rounded-xl flex items-start gap-2.5 text-rose-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
          <p className="text-[11px] font-bold leading-tight">
            This action will immediately remove the loan and its repayment history from your device and the shared community Firestore database.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Trash2 size={14} />
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DeleteLoanModal;
