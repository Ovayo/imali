import React, { useState, useEffect } from 'react';
import { 
  X, Camera, User, Phone, MapPin, Mail, Briefcase, 
  Building2, CreditCard, ShieldCheck, ShieldAlert, AlertCircle, 
  CheckCircle2, Clock, Calendar, Plus, FileText, DollarSign,
  TrendingUp, Copy, Check, Edit3, Trash2, Save, Star, History, ArrowRight,
  UploadCloud, ExternalLink, CheckSquare, Square
} from 'lucide-react';
import { BorrowerProfile, Loan, RepaymentStatus, ApplicationStatus, PayoutMethod } from '../types';
import TrustScoreDisplay from './TrustScoreDisplay';
import KycProgressBar, { KycStep } from './KycProgressBar';

interface BorrowerDossierModalProps {
  borrower: BorrowerProfile & { loans: Loan[]; score: number };
  onClose: () => void;
  onSaveProfile: (updated: BorrowerProfile) => Promise<void> | void;
  onOpenPhotoCapture: (idNumber: string) => void;
  onIssueLoanForBorrower: (borrower: BorrowerProfile) => void;
  onSelectLoan: (loan: Loan) => void;
  onMarkLoanAsPaid: (loanId: string) => void;
  onEditLoan?: (loan: Loan) => void;
  onDeleteLoan?: (loan: Loan) => void;
}

export const BorrowerDossierModal: React.FC<BorrowerDossierModalProps> = ({
  borrower,
  onClose,
  onSaveProfile,
  onOpenPhotoCapture,
  onIssueLoanForBorrower,
  onSelectLoan,
  onMarkLoanAsPaid,
  onEditLoan,
  onDeleteLoan
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'edit' | 'kyc'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable form state
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
    bankDetails: borrower.bankDetails || '',
    notes: borrower.notes || '',
    kycVerified: borrower.kycVerified || false,
    kycIdVerified: borrower.kycIdVerified ?? true,
    kycDocumentVerified: borrower.kycDocumentVerified ?? (borrower.kycIdVerified ?? true),
    kycAddressVerified: borrower.kycAddressVerified ?? Boolean(borrower.address),
    kycFaceVerified: borrower.kycFaceVerified ?? Boolean(borrower.profilePhoto),
    kycIncomeVerified: borrower.kycIncomeVerified ?? Boolean(borrower.monthlyIncome && borrower.monthlyIncome > 0),
    kycDocumentType: borrower.kycDocumentType || 'RSA Smart ID Card'
  });

  // Automatically update face verification when borrower profile photo changes
  useEffect(() => {
    if (borrower.profilePhoto && !formData.kycFaceVerified) {
      setFormData(prev => ({
        ...prev,
        kycFaceVerified: true
      }));
    }
  }, [borrower.profilePhoto]);

  // Handle single KYC step toggle with immediate cloud persistence
  const handleToggleKycStep = async (
    field: 'kycDocumentVerified' | 'kycFaceVerified' | 'kycAddressVerified' | 'kycIncomeVerified', 
    value: boolean
  ) => {
    const updatedForm = {
      ...formData,
      [field]: value
    };

    // Calculate if all primary steps are satisfied
    const docOk = field === 'kycDocumentVerified' ? value : updatedForm.kycDocumentVerified;
    const faceOk = field === 'kycFaceVerified' ? value : updatedForm.kycFaceVerified;
    const addrOk = field === 'kycAddressVerified' ? value : updatedForm.kycAddressVerified;
    const incOk = field === 'kycIncomeVerified' ? value : updatedForm.kycIncomeVerified;
    const allPassed = Boolean(docOk && faceOk && addrOk && incOk);
    updatedForm.kycVerified = allPassed;

    setFormData(updatedForm);

    try {
      await onSaveProfile({
        ...borrower,
        ...updatedForm,
        kycVerified: allPassed,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to sync KYC toggle:', err);
    }
  };

  const isDocumentVerified = Boolean(formData.kycDocumentVerified && formData.kycIdVerified);
  const isPhotoVerified = Boolean(formData.kycFaceVerified && borrower.profilePhoto);
  const isResidenceVerified = Boolean(formData.kycAddressVerified && (formData.address || borrower.address));
  const isIncomeVerified = Boolean(formData.kycIncomeVerified && (formData.monthlyIncome || borrower.monthlyIncome));

  const kycSteps: KycStep[] = [
    {
      id: 'document',
      label: 'South African ID & Document Verification',
      shortLabel: 'ID Document',
      description: 'RSA 13-digit National ID & official identity document verification',
      isComplete: isDocumentVerified,
      required: true,
      statusText: borrower.idNumber ? `ID: ${borrower.idNumber} (${formData.kycDocumentType || 'RSA Smart ID'})` : 'National ID required'
    },
    {
      id: 'photo',
      label: 'Biometric Face & Photo Verification',
      shortLabel: 'Face Photo',
      description: 'Live webcam snapshot matching identity record on file',
      isComplete: isPhotoVerified,
      required: true,
      actionLabel: borrower.profilePhoto ? 'Retake Photo' : 'Capture Live Photo',
      onAction: () => onOpenPhotoCapture(borrower.idNumber),
      statusText: borrower.profilePhoto ? 'Live photo verified on record' : 'No photo on file (Camera required)'
    },
    {
      id: 'residence',
      label: 'Proof of Residential Address',
      shortLabel: 'Residence Proof',
      description: 'Physical residential location confirmed via utility or community committee',
      isComplete: isResidenceVerified,
      required: true,
      statusText: (formData.address || borrower.address) ? (formData.address || borrower.address) : 'Physical address unrecorded'
    },
    {
      id: 'income',
      label: 'Income & Employment Documentation',
      shortLabel: 'Income & Work',
      description: 'Monthly income source & employer/trade confirmed for credit capacity',
      isComplete: isIncomeVerified,
      required: false,
      statusText: (formData.employer || borrower.employer) 
        ? `${formData.employer || borrower.employer} • R ${(formData.monthlyIncome || borrower.monthlyIncome || 0).toLocaleString()}/mo` 
        : 'Income not declared'
    }
  ];

  const completedKycStepsCount = kycSteps.filter(s => s.isComplete).length;
  const kycProgressPercentage = Math.round((completedKycStepsCount / kycSteps.length) * 100);

  const loans = borrower.loans || [];
  const activeLoans = loans.filter(l => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE);
  const paidLoans = loans.filter(l => l.status === RepaymentStatus.PAID);
  const overdueLoans = loans.filter(l => l.status === RepaymentStatus.OVERDUE);

  const totalBorrowed = loans.reduce((acc, l) => acc + l.amountLoaned, 0);
  const totalRepaid = paidLoans.reduce((acc, l) => acc + l.totalRepayment, 0);
  const activeDebt = activeLoans.reduce((acc, l) => acc + l.totalRepayment, 0);

  const repaymentRate = loans.length > 0 ? (paidLoans.length / loans.length) * 100 : 100;

  // Max recommended credit line based on score
  const recommendedLimit = borrower.score >= 750 
    ? 15000 
    : borrower.score >= 680 
    ? 8000 
    : borrower.score >= 580 
    ? 3500 
    : 1000;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
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
        notes: formData.notes,
        kycVerified: formData.kycVerified,
        kycIdVerified: formData.kycIdVerified,
        kycDocumentVerified: formData.kycDocumentVerified,
        kycAddressVerified: formData.kycAddressVerified,
        kycFaceVerified: formData.kycFaceVerified,
        kycIncomeVerified: formData.kycIncomeVerified,
        kycDocumentType: formData.kycDocumentType,
        updatedAt: new Date().toISOString()
      };
      await onSaveProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-gray-950/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      <div className="bg-white w-full max-w-4xl rounded-t-[32px] sm:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh] border border-gray-100">
        
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-full flex justify-center pt-2 pb-1 bg-slate-900">
          <div className="w-12 h-1.5 bg-white/30 rounded-full" />
        </div>

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Profile Photo with Camera Trigger */}
              <div className="relative group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-indigo-900/60 border-2 border-white/20 flex items-center justify-center text-white font-black text-3xl shadow-xl">
                  {borrower.profilePhoto ? (
                    <img src={borrower.profilePhoto} alt={borrower.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{borrower.name ? borrower.name[0] : 'B'}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPhotoCapture(borrower.idNumber)}
                  className="absolute -bottom-1 -right-1 bg-indigo-500 hover:bg-indigo-400 text-white p-2 rounded-full shadow-lg transition-transform active:scale-90"
                  title="Update profile photo with webcam"
                >
                  <Camera size={14} />
                </button>
              </div>

              {/* Identity Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">{borrower.name}</h2>
                  {formData.kycVerified ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 size={12} /> KYC Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                      <Clock size={12} /> KYC Pending
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-indigo-200/80 font-medium">
                  <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[11px] text-white">ID: {borrower.idNumber}</span>
                  {borrower.phone && <span>📞 {borrower.phone}</span>}
                  {borrower.address && <span className="truncate max-w-[200px]">📍 {borrower.address}</span>}
                </div>

                {borrower.employer && (
                  <p className="text-xs text-indigo-300/90 font-medium">
                    🏢 {borrower.employer} {borrower.employmentStatus && `(${borrower.employmentStatus})`}
                  </p>
                )}
              </div>
            </div>

            {/* Close Button & Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onIssueLoanForBorrower(borrower)}
                className="hidden sm:flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-400 text-white px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all"
              >
                <Plus size={14} /> Issue Loan
              </button>
              <button 
                onClick={onClose} 
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title="Close dossier"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* KYC Completion Progress Bar Banner */}
          <div className="mt-5">
            <KycProgressBar
              steps={kycSteps}
              variant="header"
              overallVerified={formData.kycVerified}
              onNavigateToKycTab={() => setActiveTab('kyc')}
              onOpenPhotoCapture={() => onOpenPhotoCapture(borrower.idNumber)}
            />
          </div>

          {/* Quick Metrics Ticker */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] uppercase font-black tracking-widest text-indigo-300">Trust Score</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-black text-white">{borrower.score}</span>
                <span className="text-[10px] font-bold text-indigo-300">/ 850</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] uppercase font-black tracking-widest text-indigo-300">Active Debt</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">R {activeDebt.toLocaleString()}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] uppercase font-black tracking-widest text-indigo-300">Lifetime Borrowed</p>
              <p className="text-xl font-black text-white mt-0.5">R {totalBorrowed.toLocaleString()}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
              <p className="text-[9px] uppercase font-black tracking-widest text-indigo-300">Repayment Rate</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">{repaymentRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 px-3 sm:px-6 overflow-x-auto no-scrollbar momentum-scroll">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'overview' 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <TrendingUp size={15} /> Overview & Credit
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'loans' 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <History size={15} /> Loan History ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'edit' 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Edit3 size={15} /> Edit Details & Notes
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'kyc' 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck size={15} /> 
            <span>KYC Verification</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              formData.kycVerified || kycProgressPercentage === 100
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                : kycProgressPercentage >= 50
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {formData.kycVerified || kycProgressPercentage === 100 ? '100%' : `${kycProgressPercentage}%`}
            </span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">

          {/* TAB 1: OVERVIEW & CREDIT HEALTH */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Trust & Credit Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-50/60 to-white p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">Credit Score & Risk Assessment</h4>
                      <p className="text-xs text-gray-500">Calculated from repayment track record, overdue frequency, and tenure.</p>
                    </div>
                    <span className="text-xs font-black px-3 py-1 bg-indigo-600 text-white rounded-full">
                      Tier: {borrower.score >= 750 ? 'Prime (A+)' : borrower.score >= 680 ? 'Standard (B)' : borrower.score >= 580 ? 'Moderate (C)' : 'High Risk (D)'}
                    </span>
                  </div>

                  <TrustScoreDisplay score={borrower.score} variant="hero" showProgressBar showMinMax />

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-indigo-100/70 text-center">
                    <div className="bg-white p-3 rounded-2xl border border-indigo-50">
                      <p className="text-[10px] font-black uppercase text-gray-400">Paid on Time</p>
                      <p className="text-lg font-black text-emerald-600">{paidLoans.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-indigo-50">
                      <p className="text-[10px] font-black uppercase text-gray-400">Active / Due</p>
                      <p className="text-lg font-black text-indigo-600">{activeLoans.length}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-indigo-50">
                      <p className="text-[10px] font-black uppercase text-gray-400">Overdue Risk</p>
                      <p className="text-lg font-black text-rose-600">{overdueLoans.length}</p>
                    </div>
                  </div>
                </div>

                {/* Recommended Microloan Credit Limit */}
                <div className="bg-gray-900 text-white p-6 rounded-3xl flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                      <ShieldCheck size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Recommended Cap</span>
                    </div>
                    <h5 className="text-xs font-bold text-gray-400">Max Microloan Capacity</h5>
                    <p className="text-3xl font-black text-white mt-1">R {recommendedLimit.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-400 mt-2">
                      {borrower.score >= 700 
                        ? "High community standing. Eligible for maximum micro-financing terms."
                        : borrower.score >= 600
                        ? "Moderate standing. Recommend capped amounts and weekly repayment cycles."
                        : "Requires collateral or small stepping-stone loans to establish trust."}
                    </p>
                  </div>

                  <button
                    onClick={() => onIssueLoanForBorrower(borrower)}
                    className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg"
                  >
                    <Plus size={16} /> Issue Microloan
                  </button>
                </div>
              </div>

              {/* Financial & Contact Information Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Dossier */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <User size={14} className="text-indigo-600" /> Identity & Contact
                  </h4>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">National ID</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900">{borrower.idNumber}</span>
                        <button 
                          onClick={() => handleCopy(borrower.idNumber, 'id')}
                          className="text-gray-400 hover:text-indigo-600 p-1"
                        >
                          {copiedField === 'id' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Primary Phone</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{borrower.phone || 'Not recorded'}</span>
                        {borrower.phone && (
                          <button 
                            onClick={() => handleCopy(borrower.phone, 'phone')}
                            className="text-gray-400 hover:text-indigo-600 p-1"
                          >
                            {copiedField === 'phone' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Alternative Contact</span>
                      <span className="font-bold text-gray-900">{borrower.alternativeNumber || 'None'}</span>
                    </div>

                    <div className="flex items-start justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Physical Address</span>
                      <span className="font-bold text-gray-900 text-right max-w-[220px]">{borrower.address || 'Not recorded'}</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500 text-xs">Email</span>
                      <span className="font-bold text-gray-900">{borrower.email || 'None'}</span>
                    </div>
                  </div>
                </div>

                {/* Employment & Payout Account */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <Briefcase size={14} className="text-indigo-600" /> Employment & Banking
                  </h4>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Employment Status</span>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full text-xs">
                        {borrower.employmentStatus || 'Employed'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Employer / Trade</span>
                      <span className="font-bold text-gray-900">{borrower.employer || 'Not specified'}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Reported Monthly Income</span>
                      <span className="font-bold text-gray-900">
                        {borrower.monthlyIncome ? `R ${borrower.monthlyIncome.toLocaleString()}` : 'Not declared'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500 text-xs">Preferred Payout</span>
                      <span className="font-bold text-gray-900">{borrower.payoutMethod || 'Bank Account'}</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500 text-xs">Bank Details</span>
                      <span className="font-mono font-bold text-gray-900">{borrower.bankDetails || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Administrative Notes Callout */}
              {borrower.notes && (
                <div className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-2xl flex items-start gap-3">
                  <FileText className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="text-xs font-black uppercase text-amber-800 tracking-wider">Lender Dossier Notes</h5>
                    <p className="text-xs text-amber-900/90 font-medium mt-1 leading-relaxed">{borrower.notes}</p>
                  </div>
                </div>
              )}

              {/* KYC Compliance & Verification Status Card */}
              <KycProgressBar
                steps={kycSteps}
                variant="card"
                overallVerified={formData.kycVerified}
                onNavigateToKycTab={() => setActiveTab('kyc')}
                onOpenPhotoCapture={() => onOpenPhotoCapture(borrower.idNumber)}
              />
            </div>
          )}

          {/* TAB 2: LOAN PORTFOLIO & HISTORY */}
          {activeTab === 'loans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase text-gray-900">All Commitments for {borrower.name}</h4>
                  <p className="text-xs text-gray-500">Every microloan issued, payment timestamps, and default histories.</p>
                </div>

                <button
                  onClick={() => onIssueLoanForBorrower(borrower)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> New Microloan
                </button>
              </div>

              {loans.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <DollarSign size={40} className="mx-auto text-gray-300 mb-2" />
                  <h5 className="text-base font-black text-gray-700">No Loans Recorded Yet</h5>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">This borrower has registered an identity profile but has not taken any microloans yet.</p>
                  <button
                    onClick={() => onIssueLoanForBorrower(borrower)}
                    className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase"
                  >
                    Issue First Microloan
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {loans.map(loan => {
                    const isPaid = loan.status === RepaymentStatus.PAID;
                    const isOverdue = loan.status === RepaymentStatus.OVERDUE;
                    return (
                      <div 
                        key={loan.id} 
                        className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          isOverdue 
                            ? 'bg-rose-50/40 border-rose-200' 
                            : isPaid 
                            ? 'bg-white border-gray-100 hover:border-indigo-100' 
                            : 'bg-amber-50/20 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' : isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {loan.id}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-gray-900">R {loan.amountLoaned.toLocaleString()}</span>
                              <span className="text-xs text-gray-400 font-bold">→ Total: R {loan.totalRepayment.toLocaleString()}</span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isPaid ? 'bg-emerald-100 text-emerald-700' : isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {loan.status}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500 font-medium flex items-center gap-3">
                              <span>📅 Due: {loan.dueDate}</span>
                              {loan.applicationStatus && (
                                <span className="text-indigo-600 font-bold">Status: {loan.applicationStatus}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
                          {!isPaid && (
                            <button
                              onClick={() => onMarkLoanAsPaid(loan.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 transition-colors"
                              title="Mark this loan as paid"
                            >
                              <CheckCircle2 size={13} /> Mark Paid
                            </button>
                          )}
                          {onEditLoan && (
                            <button
                              onClick={() => onEditLoan(loan)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors"
                              title="Edit loan record"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {onDeleteLoan && (
                            <button
                              onClick={() => onDeleteLoan(loan)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                              title="Delete loan record"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onClose();
                              onSelectLoan(loan);
                            }}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase flex items-center gap-1 transition-colors"
                          >
                            Details <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EDIT PROFILE DETAILS & NOTES */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h4 className="text-sm font-black uppercase text-gray-900">Update Borrower Record</h4>
                  <p className="text-xs text-gray-500">Changes immediately persist to the shared cloud database.</p>
                </div>
                {saveSuccess && (
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={14} /> Profile updated in cloud!
                  </span>
                )}
              </div>

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
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Primary Mobile Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 082 123 4567"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Alternative / Emergency Contact</label>
                  <input
                    type="tel"
                    value={formData.alternativeNumber}
                    onChange={e => setFormData({ ...formData, alternativeNumber: e.target.value })}
                    placeholder="Next of kin or spouse phone"
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
                    placeholder="Street, Section, Township / City"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Employment / Occupation Status</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={e => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value="Employed">Formally Employed</option>
                    <option value="Self-Employed">Self-Employed / Business Owner</option>
                    <option value="Trader / Spaza">Local Trader / Spaza / Vendor</option>
                    <option value="Contractor">Contractor / Freelancer</option>
                    <option value="Unemployed">Unemployed / Grant Recipient</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Employer / Business Name</label>
                  <input
                    type="text"
                    value={formData.employer}
                    onChange={e => setFormData({ ...formData, employer: e.target.value })}
                    placeholder="Company or Business Name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Reported Monthly Income (ZAR)</label>
                  <input
                    type="number"
                    value={formData.monthlyIncome || ''}
                    onChange={e => setFormData({ ...formData, monthlyIncome: Number(e.target.value) })}
                    placeholder="R 6,500"
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
                    <option value={PayoutMethod.BANK}>Bank EFT Account</option>
                    <option value={PayoutMethod.MOBILE}>Mobile Cash Send / eWallet</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Bank / Payout Account Details</label>
                  <input
                    type="text"
                    value={formData.bankDetails}
                    onChange={e => setFormData({ ...formData, bankDetails: e.target.value })}
                    placeholder="e.g. Capitec 1548829103 or Standard Bank 0029381"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Confidential Lender Dossier Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Record notes on character, community reputation, repayment habits, or references..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
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
          )}

          {/* TAB 4: KYC & IDENTITY VERIFICATION */}
          {activeTab === 'kyc' && (
            <div className="space-y-6">
              {/* Detailed Visual Progress Tracker Banner */}
              <KycProgressBar
                steps={kycSteps}
                variant="detailed"
                overallVerified={formData.kycVerified}
                onOpenPhotoCapture={() => onOpenPhotoCapture(borrower.idNumber)}
              />

              {/* 4 Discrete Verification Step Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                
                {/* STEP 1: DOCUMENT VERIFICATION */}
                <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                  isDocumentVerified 
                    ? 'bg-emerald-50/40 border-emerald-200/70 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-indigo-200 shadow-sm'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                        isDocumentVerified ? 'bg-emerald-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Checkpoint 01</span>
                          {isDocumentVerified ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black uppercase text-gray-900 mt-0.5">ID & Document Verification</h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    Verification of the borrower's official South African National Identity number against Home Affairs 13-digit format.
                  </p>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">National ID Number:</span>
                      <span className="font-mono font-bold text-gray-900">{borrower.idNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Document Credential:</span>
                      <select
                        value={formData.kycDocumentType}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({ ...prev, kycDocumentType: val }));
                          onSaveProfile({
                            ...borrower,
                            ...formData,
                            kycDocumentType: val,
                            updatedAt: new Date().toISOString()
                          });
                        }}
                        className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="RSA Smart ID Card">RSA Smart ID Card</option>
                        <option value="RSA Green Barcoded ID Book">RSA Green Barcoded ID Book</option>
                        <option value="Passport with Valid SA Permit">Passport with Valid SA Permit</option>
                        <option value="Refugee / Asylum Permit">Refugee / Asylum Permit</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Format Compliance:</span>
                      <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                        borrower.idNumber.length === 13 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {borrower.idNumber.length === 13 ? '13-Digit RSA Standard' : 'Manual Review'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleKycStep('kycDocumentVerified', !formData.kycDocumentVerified)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
                      isDocumentVerified
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200'
                    }`}
                  >
                    {isDocumentVerified ? (
                      <>
                        <CheckCircle2 size={15} /> Document Verified (Click to Unmark)
                      </>
                    ) : (
                      <>
                        <Square size={15} /> Mark Document as Verified
                      </>
                    )}
                  </button>
                </div>

                {/* STEP 2: PHOTO & BIOMETRIC VERIFICATION */}
                <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                  isPhotoVerified 
                    ? 'bg-emerald-50/40 border-emerald-200/70 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-indigo-200 shadow-sm'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                        isPhotoVerified ? 'bg-emerald-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <Camera size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Checkpoint 02</span>
                          {isPhotoVerified ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Photo Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Photo Required
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black uppercase text-gray-900 mt-0.5">Biometric Photo Verification</h4>
                      </div>
                    </div>
                  </div>

                  {/* Photo Visual Preview Box */}
                  <div className="flex items-center gap-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-100 mb-4">
                    {borrower.profilePhoto ? (
                      <div className="relative shrink-0">
                        <img 
                          src={borrower.profilePhoto} 
                          alt={borrower.name} 
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5">
                          <CheckCircle2 size={12} />
                        </span>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-amber-600 shrink-0">
                        <Camera size={20} />
                        <span className="text-[9px] font-bold mt-1 uppercase">No Photo</span>
                      </div>
                    )}
                    <div className="text-xs">
                      <p className="font-bold text-gray-900">
                        {borrower.profilePhoto ? 'Webcam Face Snapshot on File' : 'No biometric portrait captured'}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                        {borrower.profilePhoto 
                          ? 'Facial snapshot safely stored in local encrypted cache & synced with cloud vault.'
                          : 'Use your device camera or upload a clear portrait to verify borrower identity.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenPhotoCapture(borrower.idNumber)}
                      className="flex-1 py-2.5 px-3 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Camera size={14} /> {borrower.profilePhoto ? 'Retake Photo' : 'Capture Camera Photo'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleKycStep('kycFaceVerified', !formData.kycFaceVerified)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        isPhotoVerified
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {isPhotoVerified ? <CheckCircle2 size={14} /> : <Square size={14} />}
                      {isPhotoVerified ? 'Face Verified' : 'Confirm Face Match'}
                    </button>
                  </div>
                </div>

                {/* STEP 3: PROOF OF RESIDENCE */}
                <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                  isResidenceVerified 
                    ? 'bg-emerald-50/40 border-emerald-200/70 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-indigo-200 shadow-sm'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                        isResidenceVerified ? 'bg-emerald-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <Home size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Checkpoint 03</span>
                          {isResidenceVerified ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Address Confirmed
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Pending
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black uppercase text-gray-900 mt-0.5">Proof of Residence</h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    Physical residential address validation through utility statement, municipal account, or street committee reference.
                  </p>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2 mb-4 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-gray-500 font-medium shrink-0">Residential Address:</span>
                      <span className="font-bold text-gray-900 text-right">{borrower.address || 'Address unrecorded'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Verification Channel:</span>
                      <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        Municipal / Street Committee
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleKycStep('kycAddressVerified', !formData.kycAddressVerified)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
                      isResidenceVerified
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200'
                    }`}
                  >
                    {isResidenceVerified ? (
                      <>
                        <CheckCircle2 size={15} /> Residence Confirmed (Click to Unmark)
                      </>
                    ) : (
                      <>
                        <Square size={15} /> Confirm Proof of Residence
                      </>
                    )}
                  </button>
                </div>

                {/* STEP 4: PROOF OF INCOME & EMPLOYMENT */}
                <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                  isIncomeVerified 
                    ? 'bg-emerald-50/40 border-emerald-200/70 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-indigo-200 shadow-sm'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                        isIncomeVerified ? 'bg-emerald-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Checkpoint 04</span>
                          {isIncomeVerified ? (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Income Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Optional / Pending
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-black uppercase text-gray-900 mt-0.5">Income & Employment Check</h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    Confirmation of monthly earnings or informal trading turnover to establish debt serviceability and safe lending limits.
                  </p>

                  <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2 mb-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Employer / Trade:</span>
                      <span className="font-bold text-gray-900">{borrower.employer || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Declared Monthly Income:</span>
                      <span className="font-bold text-emerald-600">
                        {borrower.monthlyIncome ? `R ${borrower.monthlyIncome.toLocaleString()}` : 'Not declared'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleKycStep('kycIncomeVerified', !formData.kycIncomeVerified)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
                      isIncomeVerified
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200'
                    }`}
                  >
                    {isIncomeVerified ? (
                      <>
                        <CheckCircle2 size={15} /> Income Verified (Click to Unmark)
                      </>
                    ) : (
                      <>
                        <Square size={15} /> Confirm Income Documentation
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* Master KYC Decision Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-indigo-900/50">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    formData.kycVerified ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/10 text-indigo-300'
                  }`}>
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-white">
                      {formData.kycVerified ? 'Full KYC Cleared & Authorized' : 'Master KYC Underwriting Status'}
                    </h4>
                    <p className="text-xs text-indigo-200/80 mt-0.5">
                      {formData.kycVerified
                        ? 'Borrower has satisfied community & regulatory compliance standards. Approved for immediate microloan disbursements.'
                        : 'All checkpoints can be individually verified or batch approved below.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const willPass = !formData.kycVerified;
                      const next = {
                        ...formData,
                        kycVerified: willPass,
                        kycIdVerified: willPass,
                        kycDocumentVerified: willPass,
                        kycFaceVerified: willPass,
                        kycAddressVerified: willPass,
                        kycIncomeVerified: willPass
                      };
                      setFormData(next);
                      onSaveProfile({
                        ...borrower,
                        ...next,
                        updatedAt: new Date().toISOString()
                      });
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                    className={`w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
                      formData.kycVerified
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    <ShieldCheck size={16} />
                    {formData.kycVerified ? 'Revoke Master KYC' : 'Pass & Approve 100% KYC'}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default BorrowerDossierModal;
