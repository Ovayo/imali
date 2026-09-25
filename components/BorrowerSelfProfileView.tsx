import React, { useState } from 'react';
import { 
  User, Phone, MapPin, Mail, Briefcase, CreditCard, ShieldCheck, 
  AlertCircle, CheckCircle2, Copy, Check, Camera, Edit3, Save, 
  DollarSign, ArrowUpRight, Clock, HelpCircle, Building2, Smartphone, FileText
} from 'lucide-react';
import { BorrowerProfile, Loan, RepaymentStatus, ApplicationStatus, PayoutMethod } from '../types';
import TrustScoreDisplay from './TrustScoreDisplay';

interface BorrowerSelfProfileViewProps {
  borrower: BorrowerProfile & { loans: Loan[]; score: number };
  onSaveProfile: (updated: BorrowerProfile) => Promise<void> | void;
  onOpenPhotoCapture: () => void;
  onApplyForLoan: () => void;
}

export const BorrowerSelfProfileView: React.FC<BorrowerSelfProfileViewProps> = ({
  borrower,
  onSaveProfile,
  onOpenPhotoCapture,
  onApplyForLoan
}) => {
  const [copiedRef, setCopiedRef] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: borrower.name || '',
    phone: borrower.phone || '',
    alternativeNumber: borrower.alternativeNumber || '',
    address: borrower.address || '',
    email: borrower.email || '',
    employer: borrower.employer || '',
    employmentStatus: borrower.employmentStatus || 'Employed',
    monthlyIncome: borrower.monthlyIncome || 0,
    payoutMethod: borrower.payoutMethod || PayoutMethod.BANK,
    bankDetails: borrower.bankDetails || ''
  });

  const loans = borrower.loans || [];
  const activeLoans = loans.filter(l => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE);
  const paidLoans = loans.filter(l => l.status === RepaymentStatus.PAID);
  const overdueLoans = loans.filter(l => l.status === RepaymentStatus.OVERDUE);

  const activeDebt = activeLoans.reduce((sum, l) => sum + l.totalRepayment, 0);

  // Pre-approved limit based on score
  const preApprovedLimit = borrower.score >= 750 
    ? 15000 
    : borrower.score >= 680 
    ? 8000 
    : borrower.score >= 580 
    ? 3500 
    : 1000;

  const handleCopyReference = () => {
    navigator.clipboard.writeText(borrower.idNumber);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: BorrowerProfile = {
        ...borrower,
        name: formData.name,
        phone: formData.phone,
        alternativeNumber: formData.alternativeNumber,
        address: formData.address,
        email: formData.email,
        employer: formData.employer,
        employmentStatus: formData.employmentStatus,
        monthlyIncome: Number(formData.monthlyIncome),
        payoutMethod: formData.payoutMethod,
        bankDetails: formData.bankDetails,
        updatedAt: new Date().toISOString()
      };
      await onSaveProfile(updated);
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 z-10 text-center sm:text-left">
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white/20 bg-indigo-800 flex items-center justify-center shadow-2xl">
              {borrower.profilePhoto ? (
                <img src={borrower.profilePhoto} alt={borrower.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black">{borrower.name ? borrower.name[0] : 'B'}</span>
              )}
            </div>
            <button
              onClick={onOpenPhotoCapture}
              className="absolute -bottom-1 -right-1 bg-indigo-500 hover:bg-indigo-400 text-white p-2 rounded-full shadow-lg transition-transform active:scale-90"
              title="Take or update photo using camera"
            >
              <Camera size={14} />
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-2xl font-black uppercase tracking-tight">{borrower.name}</h2>
              {borrower.profilePhoto ? (
                <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} /> Photo Verified
                </span>
              ) : (
                <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                  <AlertCircle size={12} /> Photo Pending
                </span>
              )}
              {borrower.kycVerified && (
                <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck size={12} /> KYC Passed
                </span>
              )}
            </div>

            <p className="text-xs text-indigo-200/80 font-mono mb-2">ID: {borrower.idNumber} • {borrower.phone || 'No phone recorded'}</p>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                onClick={onOpenPhotoCapture}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all backdrop-blur-md"
              >
                <Camera size={13} />
                {borrower.profilePhoto ? 'Update Photo' : 'Capture Photo (Camera)'}
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
              >
                <Edit3 size={13} />
                {isEditing ? 'Cancel Editing' : 'Edit My Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Hero Score Badge */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-6 z-10 w-full sm:w-auto">
          <TrustScoreDisplay
            score={borrower.score}
            variant="hero"
            showProgressBar={true}
            showMinMax={true}
            className="w-full sm:w-60"
          />
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-bold shadow-sm">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
          <span>Your profile information was successfully updated and saved to the cloud!</span>
        </div>
      )}

      {/* Credit Standing & Loan Pre-Approval Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Loan Limit Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Pre-Approved Limit</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Tier {borrower.score >= 700 ? 'A' : 'B'}</span>
            </div>
            <p className="text-3xl font-black text-white">R {preApprovedLimit.toLocaleString()}</p>
            <p className="text-xs text-indigo-100/80 mt-2 font-medium">
              Based on your Trust Score of {borrower.score}. You can request up to this amount with instant review.
            </p>
          </div>

          <button
            onClick={onApplyForLoan}
            className="w-full mt-6 py-3 bg-white hover:bg-gray-100 text-indigo-900 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
          >
            Apply for Microloan <ArrowUpRight size={16} />
          </button>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Outstanding Balance</span>
            <p className="text-3xl font-black text-gray-900 mt-2">
              {activeDebt > 0 ? `R ${activeDebt.toLocaleString()}` : 'R 0'}
            </p>
            <div className="mt-2 space-y-1 text-xs">
              <p className="text-gray-500 font-medium">
                {activeLoans.length} active commitment{activeLoans.length === 1 ? '' : 's'}
              </p>
              {overdueLoans.length > 0 && (
                <p className="text-rose-600 font-bold flex items-center gap-1">
                  <AlertCircle size={13} /> {overdueLoans.length} overdue payment!
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
            Paid in full: <span className="font-bold text-gray-800">{paidLoans.length} microloans</span>
          </div>
        </div>

        {/* How to Repay EFT Card */}
        <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Payment Reference</span>
              <CreditCard size={16} className="text-indigo-400" />
            </div>
            <p className="text-xs text-gray-400 font-medium mb-1">Use your ID number as your bank payment reference:</p>
            <div className="bg-white/10 p-3 rounded-xl flex items-center justify-between font-mono text-sm font-black text-emerald-400">
              <span>{borrower.idNumber}</span>
              <button 
                onClick={handleCopyReference}
                className="text-xs text-white hover:text-indigo-300 flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg"
              >
                {copiedRef ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedRef ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-gray-400 space-y-0.5">
            <p><span className="text-gray-500">Bank:</span> First National Bank (FNB)</p>
            <p><span className="text-gray-500">Acc No:</span> 6289 4410 882</p>
            <p><span className="text-gray-500">Branch:</span> 250655</p>
          </div>
        </div>
      </div>

      {/* Profile Form (Edit vs View Mode) */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-black uppercase text-gray-900">Personal & Financial Information</h3>
            <p className="text-xs text-gray-400 font-medium">Keep your contact and banking details accurate to receive speedy loan disbursements.</p>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-colors"
          >
            <Edit3 size={14} /> {isEditing ? 'Cancel' : 'Edit Details'}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="082 123 4567"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Alternative / Emergency Contact Number</label>
                <input
                  type="tel"
                  value={formData.alternativeNumber}
                  onChange={e => setFormData({ ...formData, alternativeNumber: e.target.value })}
                  placeholder="Next of kin phone number"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@imali.co.za"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Physical Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, section or township"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Employment Status</label>
                <select
                  value={formData.employmentStatus}
                  onChange={e => setFormData({ ...formData, employmentStatus: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                >
                  <option value="Employed">Formally Employed</option>
                  <option value="Self-Employed">Self-Employed / Business Owner</option>
                  <option value="Trader / Spaza">Spaza / Market Trader</option>
                  <option value="Contractor">Contractor / Freelancer</option>
                  <option value="Unemployed">Grant Recipient / Unemployed</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Employer or Business Name</label>
                <input
                  type="text"
                  value={formData.employer}
                  onChange={e => setFormData({ ...formData, employer: e.target.value })}
                  placeholder="Company name"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Monthly Income (ZAR)</label>
                <input
                  type="number"
                  value={formData.monthlyIncome || ''}
                  onChange={e => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
                  placeholder="e.g. 5500"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Preferred Payout Channel</label>
                <select
                  value={formData.payoutMethod}
                  onChange={e => setFormData({ ...formData, payoutMethod: e.target.value as PayoutMethod })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                >
                  <option value={PayoutMethod.BANK}>Bank Account (EFT)</option>
                  <option value={PayoutMethod.MOBILE}>Mobile eWallet / Cash Send</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Bank Name & Account Number (or Mobile Number)</label>
                <input
                  type="text"
                  value={formData.bankDetails}
                  onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                  placeholder="e.g. Capitec Savings 1589920192 or FNB 6281920391"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 rounded-2xl text-xs font-black uppercase text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl disabled:opacity-50"
              >
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save & Sync Cloud'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Primary Phone</span>
              <p className="text-sm font-bold text-gray-900">{borrower.phone || 'Not provided'}</p>
            </div>

            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Alternative Contact</span>
              <p className="text-sm font-bold text-gray-900">{borrower.alternativeNumber || 'Not provided'}</p>
            </div>

            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Email</span>
              <p className="text-sm font-bold text-gray-900 truncate">{borrower.email || 'None'}</p>
            </div>

            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 sm:col-span-2">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Physical Address</span>
              <p className="text-sm font-bold text-gray-900">{borrower.address || 'Not provided'}</p>
            </div>

            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Occupation</span>
              <p className="text-sm font-bold text-indigo-600">{borrower.employmentStatus || 'Employed'}</p>
            </div>

            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Employer</span>
              <p className="text-sm font-bold text-gray-900">{borrower.employer || 'Not declared'}</p>
            </div>

            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Monthly Income</span>
              <p className="text-sm font-bold text-gray-900">
                {borrower.monthlyIncome ? `R ${borrower.monthlyIncome.toLocaleString()}` : 'Not declared'}
              </p>
            </div>

            <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Payout Method & Details</span>
              <p className="text-sm font-bold text-gray-900 truncate">{borrower.bankDetails || 'Bank EFT'}</p>
            </div>
          </div>
        )}
      </div>

      {/* How Trust Score Works Explanation */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 sm:p-8 space-y-4">
        <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
          <HelpCircle size={16} className="text-indigo-600" /> How to Maintain and Grow Your Trust Score
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-1">
            <span className="font-black text-emerald-800 uppercase text-[11px] flex items-center gap-1">
              <CheckCircle2 size={13} /> +45 Points
            </span>
            <p className="text-emerald-950 font-medium">Repaying microloans on or before the due date increases your score and boosts your borrowing limit.</p>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1">
            <span className="font-black text-amber-800 uppercase text-[11px] flex items-center gap-1">
              <Clock size={13} /> -90 Points
            </span>
            <p className="text-amber-950 font-medium">Late repayments incur weekly penalty fees and temporarily lower your community pre-approval ceiling.</p>
          </div>

          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-1">
            <span className="font-black text-indigo-800 uppercase text-[11px] flex items-center gap-1">
              <ShieldCheck size={13} /> Prime Tier Perks
            </span>
            <p className="text-indigo-950 font-medium">Scores 750+ unlock microloans up to R15,000 with flexible weekly or monthly installments.</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default BorrowerSelfProfileView;
