import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Calculator, 
  ArrowRight, 
  Shield, 
  UserCheck, 
  Smartphone, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Camera, 
  Lock, 
  Info, 
  HelpCircle, 
  Percent,
  Banknote,
  UserPlus,
  LogIn
} from 'lucide-react';
import { BorrowerProfile } from '../types';
import { DeviceSessionInfo } from '../services/deviceDetectionService';

interface DeviceOnboardingViewProps {
  deviceInfo: DeviceSessionInfo;
  borrowers: BorrowerProfile[];
  onLogin: (idNumber: string) => void;
  onRegister: (data: { name: string; id: string; phone: string; address: string; profilePhoto?: string }) => void;
  onOpenCalculator: () => void;
  onOpenApply: () => void;
  onOpenLenderAuth: () => void;
  onCapturePhoto?: () => void;
  capturedPhoto?: string;
}

export const DeviceOnboardingView: React.FC<DeviceOnboardingViewProps> = ({
  deviceInfo,
  borrowers,
  onLogin,
  onRegister,
  onOpenCalculator,
  onOpenApply,
  onOpenLenderAuth,
  onCapturePhoto,
  capturedPhoto
}) => {
  const [activeMode, setActiveMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [loginId, setLoginId] = useState('');
  const [regForm, setRegForm] = useState({
    name: '',
    id: '',
    phone: '',
    address: '',
    profilePhoto: ''
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync captured photo if available
  React.useEffect(() => {
    if (capturedPhoto) {
      setRegForm(prev => ({ ...prev, profilePhoto: capturedPhoto }));
    }
  }, [capturedPhoto]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginId.trim().replace(/\D/g, '');
    if (!cleanId) {
      setErrorMessage('Please enter your South African ID number.');
      return;
    }
    const found = borrowers.find(b => b.idNumber === cleanId || b.idNumber === loginId.trim());
    if (found) {
      onLogin(found.idNumber);
    } else {
      setErrorMessage('ID Number not registered yet. Please click "Register as Borrower" or "Apply for Loan".');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.id.trim()) {
      setErrorMessage('Full name and 13-digit ID are required.');
      return;
    }
    onRegister(regForm);
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] xhosa-pattern flex flex-col justify-between p-4 sm:p-6 md:p-10 relative overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-2 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-md text-white">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-gray-900 leading-none font-heading">
              imali
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Community Micro-Lending Hub
            </p>
          </div>
        </div>

        {/* Device Detection Pill */}
        <div className="flex items-center gap-2">
          <div className="bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-gray-700 text-[11px]">
              {deviceInfo.isFirstVisit ? 'New Device' : 'Visitor Device'}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenLenderAuth}
            className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors border border-gray-200"
            title="Lender Administration Login"
          >
            <Lock size={13} className="text-gray-500" />
            <span className="hidden sm:inline">Admin Passcode</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full my-auto py-4 sm:py-8 space-y-8">
        
        {/* WELCOME / DISCOVERY VIEW */}
        {activeMode === 'welcome' && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-[2.5rem] sm:rounded-[3rem] p-7 sm:p-12 text-white shadow-2xl relative overflow-hidden border border-indigo-500/20">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
                <Wallet size={280} />
              </div>

              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[11px] font-black uppercase tracking-widest">
                  <Sparkles size={13} className="text-amber-300" />
                  <span>Fair Community Micro-Financing</span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-heading leading-tight">
                  Transparent Loans With Zero Surprises.
                </h2>

                <p className="text-xs sm:text-base text-gray-300 leading-relaxed font-medium">
                  Welcome to <strong>imali</strong>. Whether you need working capital for your business, taxi fares, school supplies, or household emergencies, check your exact installments upfront with our full EMI and late penalty fee calculator.
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenCalculator}
                    className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-amber-400/20 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Calculator size={18} />
                    <span>Open Loan EMI Calculator</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenApply}
                    className="px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2 border border-indigo-400/30"
                  >
                    <span>Apply for a Loan</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Three Pathways Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Pathway 1: EMI & Penalty Calculator */}
              <div 
                onClick={onOpenCalculator}
                className="bg-white p-6 sm:p-7 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-4 relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Calculator size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black uppercase tracking-tight text-gray-900 group-hover:text-indigo-600 transition-colors">
                      EMI Calculator
                    </h3>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                      5%/wk
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-normal">
                    Adjust principal (R300 - R20k) and weeks (up to 1 month) to see estimated installments and simulated late penalties.
                  </p>
                </div>
                <div className="pt-2 text-xs font-black text-amber-600 uppercase flex items-center gap-1">
                  <span>Calculate Now</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Pathway 2: Apply for a Microloan */}
              <div 
                onClick={onOpenApply}
                className="bg-white p-6 sm:p-7 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-4 relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Banknote size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-gray-900 group-hover:text-indigo-600 transition-colors">
                    Apply for Loan
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-normal">
                    New applicant? Register your profile and apply for cash disbursement to mobile or bank account.
                  </p>
                </div>
                <div className="pt-2 text-xs font-black text-indigo-600 uppercase flex items-center gap-1">
                  <span>Start Application</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Pathway 3: Existing Borrower Sign In */}
              <div 
                onClick={() => setActiveMode('login')}
                className="bg-white p-6 sm:p-7 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-4 relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-gray-900 group-hover:text-emerald-600 transition-colors">
                    Borrower Sign In
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-normal">
                    Already borrowed with imali? Sign in with your South African ID to view active loans and receipts.
                  </p>
                </div>
                <div className="pt-2 text-xs font-black text-emerald-600 uppercase flex items-center gap-1">
                  <span>Sign In To Profile</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIGN IN VIEW */}
        {activeMode === 'login' && (
          <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-7 sm:p-10 max-w-md mx-auto border border-gray-100 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <LogIn size={28} />
              </div>
              <h3 className="text-2xl font-black uppercase text-gray-900 font-heading">Borrower Sign In</h3>
              <p className="text-xs text-gray-500">
                Enter your South African 13-digit ID number to access your loan history and balance.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                  South African ID Number
                </label>
                <input 
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="e.g. 9201010001081"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 font-mono font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 transition-all text-center text-lg tracking-wider"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Access My Profile</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Quick Demo Switchers for convenience */}
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">
                Sample Community Borrowers:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginId('9201010001081');
                    onLogin('9201010001081');
                  }}
                  className="p-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all text-xs"
                >
                  <span className="block font-black text-gray-800">Ms S Nkila</span>
                  <span className="text-[10px] text-gray-400 font-mono">9201010001081</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginId('9611200014087');
                    onLogin('9611200014087');
                  }}
                  className="p-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-all text-xs"
                >
                  <span className="block font-black text-gray-800">U Zokhela</span>
                  <span className="text-[10px] text-gray-400 font-mono">9611200014087</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setActiveMode('welcome')}
                className="text-gray-400 hover:text-gray-700 font-bold uppercase text-[11px]"
              >
                ← Back to Welcome
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('register')}
                className="text-indigo-600 hover:text-indigo-800 font-black uppercase text-[11px]"
              >
                New? Register Profile
              </button>
            </div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {activeMode === 'register' && (
          <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-7 sm:p-10 max-w-md mx-auto border border-gray-100 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <UserPlus size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase text-gray-900 font-heading">Register Profile</h3>
              <p className="text-xs text-gray-500">
                Join the imali community network to apply for microloans and build your trust score.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Optional Camera Snap */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 overflow-hidden flex items-center justify-center text-indigo-600 shrink-0">
                    {regForm.profilePhoto ? (
                      <img src={regForm.profilePhoto} alt="Profile photo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={20} />
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-black uppercase text-gray-800">Borrower Photo</span>
                    <span className="text-[10px] text-gray-400">Optional live selfie</span>
                  </div>
                </div>
                {onCapturePhoto && (
                  <button
                    type="button"
                    onClick={onCapturePhoto}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-sm active:scale-95"
                  >
                    {regForm.profilePhoto ? 'Retake' : 'Snap'}
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Full Legal Name *
                </label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Sipho Ndlovu"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  13-Digit SA ID Number *
                </label>
                <input 
                  required
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="e.g. 9611200014087"
                  value={regForm.id}
                  onChange={(e) => setRegForm({ ...regForm, id: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-mono font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Mobile Phone Number
                </label>
                <input 
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 082 123 4567"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 pt-3"
              >
                <span>Complete Registration</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setActiveMode('welcome')}
                className="text-gray-400 hover:text-gray-700 font-bold uppercase text-[11px]"
              >
                ← Back to Welcome
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('login')}
                className="text-indigo-600 hover:text-indigo-800 font-black uppercase text-[11px]"
              >
                Already registered? Sign In
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Footer Note */}
      <footer className="max-w-4xl mx-auto w-full text-center py-4 border-t border-gray-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
        <p>© imali Microfinance Community • National Credit Act Compliant</p>
        <button
          type="button"
          onClick={onOpenLenderAuth}
          className="text-[11px] font-black text-gray-400 hover:text-gray-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
        >
          <Lock size={12} />
          <span>Lender / Admin Portal Login</span>
        </button>
      </footer>
    </div>
  );
};

export default DeviceOnboardingView;
