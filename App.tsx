
import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { Loan, RepaymentStatus, PayoutMethod, Language, UserSettings, UserRole, ApplicationStatus } from './types';
import { 
  TrendingUp, AlertCircle, CheckCircle2, Plus, Smartphone, ShieldCheck, Bell, Mail, Save, Search, 
  Activity, ArrowRight, Wallet, ChevronRight, Sparkles, History, Info, X, Edit2, Loader2, Eye, MapPin, Fingerprint, 
  Key, Lock, UserCircle, ReceiptText, Zap, AlertTriangle,
  Shield, Users, BarChart3, Send
} from 'lucide-react';
import { getCreditRiskInsights } from './services/geminiService';
import { 
  DEFAULT_INTEREST_RATE, 
  DEFAULT_PENALTY_RATE, 
  INITIAL_LOANS, 
  TRANSLATIONS 
} from './constants';

const LENDER_PASSWORD = 'imali-admin';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.LENDER); 
  const [loggedInBorrowerId, setLoggedInBorrowerId] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [showLenderAuthModal, setShowLenderAuthModal] = useState(false);
  const [lenderAuthInput, setLenderAuthInput] = useState('');
  const [lenderAuthError, setLenderAuthError] = useState(false);

  const LENDER_EMAIL = 'montiovayo@gmail.com';

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('imali_loans_v1');
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditBorrowerModalOpen, setIsEditBorrowerModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<{ idNumber: string, name: string, address: string, phone: string, email: string } | null>(null);
  
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);

  useEffect(() => {
    localStorage.setItem('imali_loans_v1', JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    // Redirect borrower from restricted tabs
    if (userRole === UserRole.BORROWER && (activeTab === 'borrowers' || activeTab === 'settings')) {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab]);

  const [loanSortKey] = useState<'date' | 'amount' | 'status'>('date');
  const [loanSortOrder] = useState<'asc' | 'desc'>('desc');

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const [calcAmount, setCalcAmount] = useState<number>(1000);
  const [calcInterest] = useState<number>(DEFAULT_INTEREST_RATE);
  const [calcWeeks, setCalcWeeks] = useState<number>(2);

  const calcResults = useMemo(() => {
    const interest = Math.round(calcAmount * (calcInterest / 100));
    return {
      interest,
      total: calcAmount + interest
    };
  }, [calcAmount, calcInterest]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter] = useState<string>('All');

  const [settings, setSettings] = useState<UserSettings>({
    overdueAlerts: true,
    whatsappAutomation: true,
    emailReports: true,
    emailNewAppAlerts: true,
    emailOverdueAlerts: true,
    // Fix: Removed invalid type assignment in object literal for darkMode property
    darkMode: false
  });

  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [newLoan, setNewLoan] = useState<Partial<Loan>>({
    borrowerName: '',
    idNumber: '',
    physicalAddress: '',
    borrowerNumber: '',
    email: '',
    amountLoaned: 0,
    dueDate: '',
    payoutMethod: PayoutMethod.MOBILE,
    employer: '',
    bankDetails: '',
    notes: '' 
  });

  const t = TRANSLATIONS[language];

  const calculatePenaltyDetails = (loan: Loan) => {
    if (loan.status !== RepaymentStatus.OVERDUE) return { penalty: 0, weeks: 0 };
    const dueDate = new Date(loan.dueDate);
    const today = new Date();
    const diffTime = Math.max(0, today.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeksOverdue = Math.max(1, Math.ceil(diffDays / 7));
    const penaltyAmount = loan.amountLoaned * (loan.penaltyRate / 100) * weeksOverdue;
    return { penalty: Math.round(penaltyAmount), weeks: weeksOverdue };
  };

  const calculateTotalPaid = (loan: Loan) => {
    return loan.history
      .filter(h => h.action.toLowerCase().includes('received') || h.action.toLowerCase().includes('paid'))
      .reduce((sum, h) => sum + (h.amount || 0), 0);
  };

  const calculateRemainingBalance = (loan: Loan) => {
    const penalty = calculatePenaltyDetails(loan).penalty;
    const totalDue = loan.totalRepayment + penalty;
    const paid = calculateTotalPaid(loan);
    return Math.max(0, totalDue - paid);
  };

  const calculateCreditScore = (borrowerLoans: Loan[]) => {
    let score = 550; 
    borrowerLoans.forEach(l => {
      if (l.status === RepaymentStatus.PAID) score += 40;
      if (l.status === RepaymentStatus.OVERDUE) score -= 100;
      if (l.status === RepaymentStatus.DEFAULTED) score -= 250;
    });
    const completed = borrowerLoans.filter(l => l.status === RepaymentStatus.PAID).length;
    if (completed > 5) score += 50;
    return Math.min(850, Math.max(300, score));
  };

  const getScoreColor = (score: number) => {
    if (score >= 700) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 550) return 'text-amber-600 bg-amber-50 border-emerald-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  const getScoreCardStyling = (score: number) => {
    if (score >= 700) return { border: 'border-t-emerald-500', bg: 'bg-emerald-50/10' };
    if (score >= 550) return { border: 'border-t-amber-500', bg: 'bg-amber-50/10' };
    return { border: 'border-t-rose-500', bg: 'bg-rose-50/10' };
  };

  const borrowers = useMemo(() => {
    const map = new Map<string, { idNumber: string, name: string, address: string, phone: string, email: string, score: number, loans: Loan[] }>();
    loans.forEach(loan => {
      if (!map.has(loan.idNumber)) {
        map.set(loan.idNumber, { 
          idNumber: loan.idNumber, 
          name: loan.borrowerName, 
          address: loan.physicalAddress,
          phone: loan.borrowerNumber,
          email: loan.email || loan.idNumber.substring(0, 5) + '@biz.co.za',
          loans: [],
          score: 0
        });
      }
      map.get(loan.idNumber)!.loans.push(loan);
    });
    
    map.forEach(b => {
      b.score = calculateCreditScore(b.loans);
    });

    return Array.from(map.values());
  }, [loans]);

  const currentBorrowerAccount = useMemo(() => {
    if (!loggedInBorrowerId) return null;
    return borrowers.find(b => b.idNumber === loggedInBorrowerId) || null;
  }, [borrowers, loggedInBorrowerId]);

  const currentBorrowerCity = useMemo(() => {
    if (!currentBorrowerAccount) return "South Africa";
    const parts = currentBorrowerAccount.address.split(',');
    return parts[0].trim();
  }, [currentBorrowerAccount]);

  const currentUserEmail = useMemo(() => {
    if (userRole === UserRole.LENDER) return LENDER_EMAIL;
    return currentBorrowerAccount?.email || 'my-account@imali.co.za';
  }, [userRole, currentBorrowerAccount]);

  const filteredAndSortedLoans = useMemo(() => {
    let baseLoans = [...loans];
    if (userRole === UserRole.BORROWER) {
      baseLoans = baseLoans.filter(l => l.idNumber === loggedInBorrowerId);
    }
    const filtered = baseLoans.filter(loan => {
      const matchesSearch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || loan.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || loan.status === statusFilter || loan.applicationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (loanSortKey === 'date') comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      else if (loanSortKey === 'amount') comparison = a.amountLoaned - b.amountLoaned;
      else comparison = a.status.localeCompare(b.status);
      return loanSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [loans, searchTerm, statusFilter, loanSortKey, loanSortOrder, userRole, loggedInBorrowerId]);

  const activeLoansForDashboard = useMemo(() => {
    const relevant = userRole === UserRole.BORROWER 
      ? loans.filter(l => l.idNumber === loggedInBorrowerId)
      : loans;
    return relevant.filter(l => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE).slice(0, 4);
  }, [loans, userRole, loggedInBorrowerId]);

  const chartData = useMemo(() => {
    const relevantLoans = userRole === UserRole.LENDER ? loans : loans.filter(l => l.idNumber === loggedInBorrowerId);
    const monthlyMap = new Map<string, number>();
    relevantLoans.forEach(loan => {
      const date = new Date(loan.startDate);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyMap.set(monthLabel, (monthlyMap.get(monthLabel) || 0) + loan.amountLoaned);
    });
    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    return { monthlyData };
  }, [loans, userRole, loggedInBorrowerId]);

  const stats = useMemo(() => {
    const relevantLoans = userRole === UserRole.LENDER ? loans : loans.filter(l => l.idNumber === loggedInBorrowerId);
    const totalLoaned = relevantLoans.reduce((acc, l) => acc + l.amountLoaned, 0);
    const paidCount = relevantLoans.filter(l => l.status === RepaymentStatus.PAID).length;
    const repaymentRate = relevantLoans.length > 0 ? (paidCount / relevantLoans.length) * 100 : 0;
    const overdueCount = relevantLoans.filter(l => l.status === RepaymentStatus.OVERDUE).length;
    const score = userRole === UserRole.BORROWER ? calculateCreditScore(relevantLoans) : new Set(relevantLoans.map(l => l.idNumber)).size;
    return { totalLoaned, repaymentRate, overdueCount, score };
  }, [loans, userRole, loggedInBorrowerId]);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    if (activeTab === 'dashboard' && userRole === UserRole.LENDER) await fetchAiInsights();
    setShowToast(language === Language.XH ? 'Ihlaziyiwe!' : 'Data refreshed!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleManualReport = async () => {
    setIsSendingReport(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSendingReport(false);
    setShowToast(language === Language.XH ? `Ingxelo ye-email ithunyelwe!` : `Email report dispatched!`);
    setTimeout(() => setShowToast(null), 4000);
  };

  const handleSendNotifications = async (targetLoan?: Loan) => {
    setIsSendingNotifications(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const overdueLoans = targetLoan ? [targetLoan] : loans.filter(l => l.status === RepaymentStatus.OVERDUE);
    if (overdueLoans.length === 0) {
      setIsSendingNotifications(false);
      setShowToast(language === Language.XH ? 'Akukho mboleko idlulileyo ixesha.' : 'No overdue loans found.');
      setTimeout(() => setShowToast(null), 3000);
      return;
    }
    try {
      for (const loan of overdueLoans) {
        const penaltyInfo = calculatePenaltyDetails(loan);
        const prompt = `Craft a short, empathetic WhatsApp/SMS reminder for ${loan.borrowerName} whose loan of R${loan.amountLoaned} (Total due R${loan.totalRepayment + penaltyInfo.penalty}) is overdue. Max 160 chars.`;
        await ai.models.generateContent({ model, contents: prompt });
      }
      setShowToast(t.notifSent);
    } catch (e) {
      console.error(e);
      setShowToast("Network error. Could not dispatch alerts.");
    } finally {
      setIsSendingNotifications(false);
      setTimeout(() => setShowToast(null), 4000);
    }
  };

  const generateReportPreview = async () => {
    setIsGeneratingPreview(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Draft a very short summary of this lending portfolio for ${userRole === UserRole.LENDER ? 'Lender' : 'Borrower'}. Tone should be encouraging and professional.`,
      });
      setReportPreview(response.text || "Report content could not be generated.");
    } catch (e) {
      setReportPreview("Could not generate preview.");
    }
    setIsGeneratingPreview(false);
  };

  const handleMarkAsPaid = (loanId: string) => {
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        const penaltyInfo = calculatePenaltyDetails(l);
        return {
          ...l,
          status: RepaymentStatus.PAID,
          history: [...l.history, { date: new Date().toISOString().split('T')[0], action: 'Full Repayment Received', amount: l.totalRepayment + penaltyInfo.penalty }]
        };
      }
      return l;
    }));
    if (selectedLoan?.id === loanId) setSelectedLoan(null);
    setShowToast(language === Language.XH ? 'Intlawulo ifunyenwe!' : 'Payment recorded!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleEditBorrower = (borrower: any) => {
    setEditingBorrower({
      idNumber: borrower.idNumber,
      name: borrower.name,
      address: borrower.address,
      phone: borrower.phone,
      email: borrower.email || ''
    });
    setIsEditBorrowerModalOpen(true);
  };

  const handleSaveBorrowerChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBorrower) return;
    setLoans(prev => prev.map(l => {
      if (l.idNumber === editingBorrower.idNumber) {
        return {
          ...l,
          borrowerName: editingBorrower.name,
          borrowerNumber: editingBorrower.phone,
          physicalAddress: editingBorrower.address,
          email: editingBorrower.email
        };
      }
      return l;
    }));
    setIsEditBorrowerModalOpen(false);
    setEditingBorrower(null);
    setShowToast(language === Language.XH ? 'Iinkcukacha zihlaziyiwe!' : 'Borrower details updated!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const identifier = loginIdentifier.trim().toLowerCase();
    const borrower = borrowers.find(b => 
      b.idNumber.toLowerCase() === identifier || 
      b.phone.replace(/\s+/g, '') === identifier.replace(/\s+/g, '')
    );
    if (borrower) {
      setLoggedInBorrowerId(borrower.idNumber);
      setLoginIdentifier('');
      setShowToast(language === Language.XH ? `Wamkelekile!` : `Welcome back!`);
    } else {
      setLoginError(language === Language.XH ? 'Iinkcukacha azifumaneki.' : 'No account found.');
    }
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleRegisterBorrower = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = borrowers.find(b => b.idNumber === newLoan.idNumber);
    if (existing) {
       setLoginError(language === Language.XH ? 'Le ID sele ibhaliswe.' : 'This ID is already registered.');
       return;
    }
    const id = `TXN-NEW-${Math.floor(1000 + Math.random() * 9000)}`;
    const regBorrower: Loan = {
      id,
      borrowerName: newLoan.borrowerName || 'New User',
      idNumber: newLoan.idNumber || '',
      physicalAddress: newLoan.physicalAddress || '',
      borrowerNumber: newLoan.borrowerNumber || '',
      email: newLoan.email || '',
      payoutMethod: PayoutMethod.MOBILE,
      amountLoaned: 0,
      interestRate: DEFAULT_INTEREST_RATE,
      penaltyRate: DEFAULT_PENALTY_RATE,
      totalRepayment: 0,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: RepaymentStatus.PAID, 
      applicationStatus: ApplicationStatus.APPROVED,
      notes: 'Registration Account',
      history: [{ date: new Date().toISOString().split('T')[0], action: 'Profile Registered', amount: 0 }]
    };
    setLoans(prev => [...prev, regBorrower]);
    setLoggedInBorrowerId(regBorrower.idNumber);
    setShowRegisterForm(false);
    setNewLoan({ borrowerName: '', idNumber: '', physicalAddress: '', borrowerNumber: '', email: '' });
    setShowToast(language === Language.XH ? 'Ibhaliswe ngempumelelo!' : 'Registered successfully!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleCreateNewLoanForBorrower = (borrower: any) => {
    setSelectedBorrowerId(null);
    setNewLoan({
      borrowerName: borrower.name,
      idNumber: borrower.idNumber,
      borrowerNumber: borrower.phone,
      physicalAddress: borrower.address,
      email: borrower.email,
      payoutMethod: PayoutMethod.MOBILE
    });
    setIsAddModalOpen(true);
  };

  const fetchAiInsights = async () => {
    setIsLoadingAi(true);
    const result = await getCreditRiskInsights(loans);
    setAiInsight(result);
    setIsLoadingAi(false);
  };

  const handleLogout = () => {
    setLoggedInBorrowerId(null);
    setShowRegisterForm(false);
    setLoginIdentifier('');
    setLoginError(null);
  };

  const handleLenderAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lenderAuthInput === LENDER_PASSWORD) {
      setUserRole(UserRole.LENDER);
      setShowLenderAuthModal(false);
      setLenderAuthInput('');
      setLenderAuthError(false);
    } else {
      setLenderAuthError(true);
    }
  };

  const StatusDot = ({ status }: { status: RepaymentStatus }) => {
    const colors = {
      [RepaymentStatus.PAID]: 'bg-emerald-500 ring-emerald-100',
      [RepaymentStatus.OVERDUE]: 'bg-rose-500 ring-rose-100 animate-pulse',
      [RepaymentStatus.PENDING]: 'bg-amber-500 ring-amber-100',
      [RepaymentStatus.DEFAULTED]: 'bg-gray-400 ring-gray-100',
    };
    return <div className={`w-3.5 h-3.5 rounded-full ${colors[status]} ring-4`} />;
  };

  const SummaryCard = ({ title, value, icon: Icon, colorClass, action }: any) => (
    <div className="bg-white p-5 md:p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group">
      <div className="absolute top-0 right-0 p-1 opacity-5 xhosa-pattern-sm" />
      <div className="flex items-center justify-between relative z-10">
        <div className={`p-3 rounded-2xl ${colorClass}`}><Icon size={24} /></div>
        <div className="text-right">
          <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{value}</p>
        </div>
      </div>
      {action && (
        <button onClick={action} className="mt-4 w-full py-2.5 bg-gray-50 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-all border border-gray-100 flex items-center justify-center gap-2 group-hover:border-indigo-200 group-hover:text-indigo-600">
          {isSendingNotifications ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
          {isSendingNotifications ? t.sendingNotifs : t.sendNotifications}
        </button>
      )}
    </div>
  );

  if (userRole === UserRole.BORROWER && !loggedInBorrowerId) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none xhosa-pattern rotate-45 scale-150" />
         <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
         <div className="w-full max-w-md space-y-8 md:y-12 relative z-10">
            <div className="text-center">
               <div className="inline-block bg-indigo-600 p-4 rounded-[2rem] shadow-2xl mb-4 md:mb-6 border border-white/10 rotate-6"><Wallet size={40} className="text-white md:w-12 md:h-12" /></div>
               <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-2">imali</h1>
               <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Secure Borrower Portal</p>
            </div>
            <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               {!showRegisterForm ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-6">
                     <div className="space-y-2"><h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Find My Account</h2><p className="text-xs md:text-sm text-gray-500 font-medium leading-relaxed">Enter your ID or Mobile number to verify your identity.</p></div>
                     <div className="space-y-4">
                        <div className="relative group"><Fingerprint size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" /><input required placeholder="Verification detail" value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} className="w-full pl-14 md:pl-16 pr-6 py-4 md:py-5 bg-gray-50 border-none rounded-2xl md:rounded-3xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 shadow-inner" /></div>
                        {loginError && <div className="px-6 py-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3"><AlertCircle size={16} className="text-rose-500" /><p className="text-[10px] md:text-xs font-bold text-rose-600">{loginError}</p></div>}
                     </div>
                     <button type="submit" className="w-full py-4 md:py-5 bg-[#1a1a1a] text-white rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"><Key size={18} /> Access Portal</button>
                     <div className="pt-4 md:pt-6 border-t border-gray-100 flex flex-col gap-3 text-center">
                        <button type="button" onClick={() => { setShowRegisterForm(true); setLoginError(null); }} className="w-full py-3 text-indigo-600 bg-indigo-50/50 rounded-xl md:rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50">Register as New Borrower</button>
                        <div className="h-px bg-gray-100 w-full my-1 md:my-2" />
                        <button type="button" onClick={() => setShowLenderAuthModal(true)} className="text-gray-400 hover:text-gray-600 font-black uppercase text-[8px] md:text-[9px] tracking-widest inline-flex items-center gap-2 justify-center"><Lock size={10} /> Lender management access</button>
                     </div>
                  </form>
               ) : (
                  <form onSubmit={handleRegisterBorrower} className="space-y-6">
                     <div className="space-y-2"><h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">New Member</h2><p className="text-xs md:text-sm text-gray-500 font-medium">Create your secure financial identity.</p></div>
                     <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-4">Full Name</label><input required placeholder="Example: Anele Dlamini" value={newLoan.borrowerName} onChange={e => setNewLoan({...newLoan, borrowerName: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 shadow-inner" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-4">ID Number</label><input required placeholder="ID Number" value={newLoan.idNumber} onChange={e => setNewLoan({...newLoan, idNumber: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 font-mono shadow-inner" /></div>
                           <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-4">Mobile</label><input required placeholder="Mobile" value={newLoan.borrowerNumber} onChange={e => setNewLoan({...newLoan, borrowerNumber: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 font-mono shadow-inner" /></div>
                        </div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-4">Email (Optional)</label><input placeholder="email@example.com" value={newLoan.email} onChange={e => setNewLoan({...newLoan, email: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 shadow-inner" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-4">Address</label><input required placeholder="City / Town" value={newLoan.physicalAddress} onChange={e => setNewLoan({...newLoan, physicalAddress: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 shadow-inner" /></div>
                     </div>
                     <div className="pt-4 space-y-3">
                        <button type="submit" className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"><ShieldCheck size={18} /> Register & Sign In</button>
                        <button type="button" onClick={() => { setShowRegisterForm(false); setLoginError(null); }} className="w-full py-3 text-gray-400 font-black uppercase text-[9px] md:text-[10px] tracking-widest">Cancel & Return</button>
                     </div>
                  </form>
               )}
            </div>
         </div>
         {showLenderAuthModal && (
            <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6">
               <div className="bg-white w-full max-sm rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl space-y-6 md:space-y-8 animate-in zoom-in-95 duration-300">
                  <div className="text-center space-y-2"><div className="w-14 h-14 md:w-16 md:h-16 bg-gray-900 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl"><Shield size={28} className="md:w-8 md:h-8" /></div><h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight uppercase">Lender Key</h3><p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Verification Required</p></div>
                  <form onSubmit={handleLenderAuthSubmit} className="space-y-6">
                     <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-4">Access Code</label><input type="password" autoFocus placeholder="••••••••" value={lenderAuthInput} onChange={e => setLenderAuthInput(e.target.value)} className={`w-full px-6 py-4 md:py-5 bg-gray-50 border-none rounded-2xl md:rounded-3xl focus:ring-2 transition-all font-bold text-gray-900 text-center text-lg md:text-xl tracking-widest shadow-inner ${lenderAuthError ? 'ring-2 ring-rose-500 bg-rose-50' : 'focus:ring-indigo-600'}`} /></div>
                     <div className="flex flex-col gap-3"><button type="submit" className="w-full py-4 md:py-5 bg-gray-900 text-white rounded-2xl md:rounded-3xl font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl hover:bg-black transition-all">Verify Identity</button><button type="button" onClick={() => { setShowLenderAuthModal(false); setLenderAuthError(false); setLenderAuthInput(''); }} className="w-full py-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest">Cancel</button></div>
                  </form>
               </div>
            </div>
         )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        language={language} 
        setLanguage={setLanguage} 
        userRole={userRole} 
        toggleRole={() => userRole === UserRole.LENDER ? setUserRole(UserRole.BORROWER) : handleLogout()} 
        onRefresh={handleRefresh}
        userName={currentBorrowerAccount?.name}
      >
        {showToast && (<div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border border-white/10 relative overflow-hidden"><div className="absolute inset-0 xhosa-pattern-sm opacity-[0.05]" /><CheckCircle2 size={18} className="text-emerald-400 relative z-10" /><span className="text-sm font-bold relative z-10">{showToast}</span></div>)}
        <div className="space-y-6 md:space-y-8 pb-32 animate-in fade-in duration-500">
          
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <SummaryCard title={userRole === UserRole.LENDER ? t.totalLoaned : "My Total Borrowed"} value={`R ${stats.totalLoaned.toLocaleString()}`} icon={Wallet} colorClass="bg-indigo-50 text-indigo-600" />
                <SummaryCard title={userRole === UserRole.LENDER ? t.repaymentRate : "My Repayment Rate"} value={`${stats.repaymentRate.toFixed(1)}%`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" />
                <SummaryCard 
                  title={userRole === UserRole.LENDER ? t.overdue : "Pending Dues"} 
                  value={stats.overdueCount} 
                  icon={AlertCircle} 
                  colorClass="bg-rose-50 text-rose-600"
                  action={userRole === UserRole.LENDER && stats.overdueCount > 0 ? () => handleSendNotifications() : null}
                />
                <SummaryCard title={userRole === UserRole.LENDER ? t.borrowers : "My Trust Score"} value={userRole === UserRole.LENDER ? stats.score : stats.score} icon={userRole === UserRole.LENDER ? Users : Zap} colorClass="bg-amber-50 text-amber-600" />
              </div>

              {userRole === UserRole.BORROWER && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
                  <div className="bg-emerald-600 p-6 md:p-8 rounded-[2.5rem] md:rounded-[40px] text-white shadow-2xl relative overflow-hidden group min-h-[300px] md:min-h-[350px] flex flex-col justify-between transition-all duration-500 hover:shadow-emerald-500/20">
                    <div 
                      className="absolute inset-0 opacity-60 mix-blend-multiply bg-cover bg-top transition-all duration-[2000ms] group-hover:scale-105 group-hover:opacity-70" 
                      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=1200&auto=format&fit=crop')` }} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/80 via-transparent to-emerald-600/20 pointer-events-none" />
                    <div className="absolute inset-0 opacity-15 xhosa-accent-pattern scale-150 rotate-12 pointer-events-none" />
                    <div className="relative z-10 flex flex-col justify-between h-full gap-6 md:gap-8">
                      <div>
                        <div className="flex items-center gap-3 mb-2 md:mb-4"><div className="px-3 py-1 bg-white/20 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/20 shadow-lg">📍 {currentBorrowerCity}</div></div>
                        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none drop-shadow-md">Financial Wellbeing</h3>
                        <p className="text-emerald-50 max-w-xl mt-3 md:mt-4 font-medium text-base md:text-lg leading-relaxed drop-shadow-sm">Your consistent repayment history strengthens your trust score in {currentBorrowerCity}.</p>
                      </div>
                      <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-emerald-800 w-full py-4 md:py-5 rounded-[1.5rem] md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl hover:bg-emerald-50 active:scale-95 transition-all flex items-center justify-center gap-3">New Loan Request</button>
                    </div>
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card">
                    <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                    <div className="relative z-10 flex flex-col justify-between h-full">
                       <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-white shadow-lg"><UserCircle size={24} className="md:w-8 md:h-8" /></div><div><h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">Verified Member</h3><p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest">Digital Vault Secure</p></div></div>
                       <p className="text-xs md:text-sm text-gray-500 font-medium mb-6 leading-relaxed">Access your secure profile, update contact information, and track your credit motif.</p>
                       <div className="flex gap-3">
                         <button onClick={() => setSelectedBorrowerId(loggedInBorrowerId)} className="flex-1 bg-[#1a1a1a] text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"><Eye size={16} /> Profile</button>
                         <button onClick={() => handleEditBorrower(currentBorrowerAccount)} className="px-4 bg-gray-50 text-gray-400 border border-gray-100 rounded-xl md:rounded-2xl hover:text-indigo-600 transition-all"><Edit2 size={18} /></button>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 md:mt-8">
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card min-h-[350px] md:min-h-[400px]">
                  <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                  <div className="flex items-center gap-3 mb-6 md:mb-8"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><BarChart3 size={20} className="md:w-6 md:h-6" /></div><h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">{userRole === UserRole.LENDER ? 'Portfolio Activity' : 'Disbursement History'}</h3></div>
                  <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
                <div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><ReceiptText size={20} className="md:w-6 md:h-6" /></div><h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">{userRole === UserRole.LENDER ? 'Active Commitments' : 'Active Ledger'}</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                  {activeLoansForDashboard.map(loan => {
                    const remaining = calculateRemainingBalance(loan);
                    return (
                      <div key={loan.id} className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4"><div className="text-[9px] md:text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest">{loan.id}</div><StatusDot status={loan.status} /></div>
                        <p className="font-black text-gray-900 text-sm mb-4">{userRole === UserRole.LENDER ? loan.borrowerName : "My Active Account"}</p>
                        <div className="space-y-3 md:space-y-4">
                          <div><p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Due to Repay</p><p className={`text-xl md:text-2xl font-black font-mono tracking-tight ${loan.status === RepaymentStatus.OVERDUE ? 'text-rose-600' : 'text-indigo-600'}`}>R {remaining.toLocaleString()}</p></div>
                          <div className="flex justify-between items-end pt-3 md:pt-4 border-t border-gray-50"><div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Due Date</p><p className="text-[10px] md:text-xs font-bold text-gray-600">{loan.dueDate}</p></div><button onClick={() => setSelectedLoan(loan)} className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-indigo-600 transition-colors"><ArrowRight size={14} /></button></div>
                        </div>
                      </div>
                    );
                  })}
                  {activeLoansForDashboard.length === 0 && <div className="col-span-full py-12 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center opacity-40"><ReceiptText size={40} className="mb-2 text-gray-400" /><p className="font-black text-[10px] uppercase tracking-widest">No active commitments found</p></div>}
                </div>
              </div>

              {userRole === UserRole.LENDER && (
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden mt-6 md:mt-8">
                  <div className="flex items-center justify-between mb-6 md:mb-8"><h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3"><Sparkles size={20} className="text-indigo-600" />{t.riskInsights}</h3><button onClick={fetchAiInsights} disabled={isLoadingAi} className="px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2">{isLoadingAi ? <Loader2 size={10} className="animate-spin" /> : <Activity size={10} />}{t.generateInsights}</button></div>
                  <div className="bg-gray-50 rounded-2xl md:rounded-3xl p-5 md:p-6 min-h-[120px] md:min-h-[150px] border border-gray-100 relative shadow-inner">{aiInsight ? (<div className="prose prose-indigo max-w-none text-xs md:text-sm text-gray-700 whitespace-pre-line animate-in fade-in">{aiInsight}</div>) : (<div className="flex flex-col items-center justify-center h-full opacity-40 py-8"><History size={32} className="text-gray-300 mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Generate portfolio risk scan</p></div>)}</div>
                </div>
              )}
            </>
          )}

          {activeTab === 'loans' && (
            <div className="bg-white rounded-[2rem] md:rounded-[40px] border border-gray-100 shadow-sm overflow-hidden relative">
              <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative z-10 bg-gray-50/20">
                 <div className="relative w-full md:w-80 group"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.search} className="w-full pl-12 pr-6 py-3 bg-white border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium shadow-sm" /></div>
                 <div className="flex flex-wrap gap-2"><button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none bg-[#1a1a1a] text-white px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2"><Plus size={18} /> {userRole === UserRole.LENDER ? 'New Account' : 'Request Loan'}</button></div>
              </div>
              
              {/* MOBILE LOAN CARDS */}
              <div className="md:hidden divide-y divide-gray-50">
                {filteredAndSortedLoans.map((loan) => (
                  <div key={loan.id} onClick={() => setSelectedLoan(loan)} className="p-6 active:bg-gray-50 transition-colors flex justify-between items-center group">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm">{loan.id}</div>
                        <StatusDot status={loan.status} />
                      </div>
                      <p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p>
                      <p className="text-[10px] font-bold text-gray-400 font-mono">DUE: {loan.dueDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">R {loan.amountLoaned.toLocaleString()}</p>
                      <p className="text-[10px] font-black text-indigo-600 font-mono mt-1">R {(loan.totalRepayment + calculatePenaltyDetails(loan).penalty).toLocaleString()}</p>
                      <ChevronRight size={16} className="ml-auto mt-2 text-gray-300 group-active:text-indigo-600" />
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto relative z-10 custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    <tr><th className="px-8 py-5">Transaction ID</th><th className="px-8 py-5">Borrower Name</th><th className="px-8 py-5">Borrower Number</th><th className="px-8 py-5">Amount Loaned</th><th className="px-8 py-5">Due Date</th><th className="px-8 py-5">Total Amount Due</th><th className="px-8 py-5">Total Amount Paid</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-center">Action</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAndSortedLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50/80 transition-all">
                        <td className="px-8 py-6"><div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg rotate-1 inline-block uppercase tracking-tighter border border-white/20">{loan.id}</div></td>
                        <td className="px-8 py-6"><p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p></td>
                        <td className="px-8 py-6"><p className="text-sm font-bold text-gray-600 font-mono">{loan.borrowerNumber}</p></td>
                        <td className="px-8 py-6"><p className="font-black text-gray-900 text-sm">R {loan.amountLoaned.toLocaleString()}</p></td>
                        <td className="px-8 py-6 text-xs font-bold text-gray-600">{loan.dueDate}</td>
                        <td className="px-8 py-6"><p className="font-black text-indigo-600 font-mono text-sm">R {(loan.totalRepayment + calculatePenaltyDetails(loan).penalty).toLocaleString()}</p></td>
                        <td className="px-8 py-6"><p className="font-black text-emerald-600 font-mono text-sm">R {calculateTotalPaid(loan).toLocaleString()}</p></td>
                        <td className="px-8 py-6"><StatusDot status={loan.status} /></td>
                        <td className="px-8 py-6 flex justify-center gap-2"><button onClick={() => setSelectedLoan(loan)} className="p-3 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm"><Eye size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'borrowers' && userRole === UserRole.LENDER && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {borrowers.map((borrower) => {
                const scoreColor = getScoreColor(borrower.score);
                const styling = getScoreCardStyling(borrower.score);
                return (
                  <div key={borrower.idNumber} className={`bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden border-t-[10px] md:border-t-[12px] ${styling.border} ${styling.bg} cultural-card group hover:shadow-xl transition-all`}>
                    <div className="flex items-start justify-between mb-6 md:mb-8 relative z-10"><div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[24px] bg-indigo-600 flex items-center justify-center font-black text-lg md:text-xl text-white shadow-lg">{borrower.name[0]}</div><div className="flex flex-col items-end gap-2"><div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl border-2 font-black text-[10px] md:text-[12px] flex items-center gap-2 shadow-sm ${scoreColor}`}><Zap size={12} className="fill-current" /> {borrower.score}</div><div className="flex gap-2"><button onClick={() => handleEditBorrower(borrower)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-gray-100 shadow-sm"><Edit2 size={12} /></button></div></div></div>
                    <div className="space-y-4 md:space-y-6 relative z-10">
                      <div><div className="flex items-center justify-between mb-1 md:mb-2"><h4 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-none">{borrower.name}</h4>{borrower.score >= 700 ? <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white"><CheckCircle2 size={12} /></div> : borrower.score < 550 ? <div className="bg-rose-500 text-white p-1 rounded-full shadow-lg border-2 border-white"><AlertTriangle size={12} /></div> : null}</div><div className="flex flex-wrap items-center gap-3 md:gap-4 text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest"><span className="flex items-center gap-1"><Smartphone size={10} /> {borrower.phone}</span><span className="flex items-center gap-1"><Fingerprint size={10} /> {borrower.idNumber}</span></div></div>
                      <div className="grid grid-cols-2 gap-3 md:gap-4"><div className="bg-white/80 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100"><p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Size</p><p className="text-xs md:text-sm font-black text-gray-900">{borrower.loans.length} Loans</p></div><div className="bg-white/80 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100"><p className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active</p><p className="text-xs md:text-sm font-black text-indigo-600">{borrower.loans.filter(l => l.status !== RepaymentStatus.PAID).length} Loans</p></div></div>
                      <button onClick={() => setSelectedBorrowerId(borrower.idNumber)} className="w-full py-3.5 md:py-4 bg-[#1a1a1a] text-white rounded-xl md:rounded-[24px] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3"><Eye size={14} /> Profile Detail</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'calculator' && (
            <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
               <div className="bg-white rounded-[2rem] md:rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden cultural-card p-6 md:p-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16">
                     <div className="space-y-8 md:space-y-12"><h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase">Calculator</h3><div className="space-y-6 md:space-y-8"><div className="space-y-4"><div className="flex justify-between items-end px-2"><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Principal</label><span className="font-black text-xl md:text-2xl text-gray-900 font-mono">R {calcAmount.toLocaleString()}</span></div><input type="range" min="100" max="10000" step="100" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div><div className="space-y-4"><div className="flex justify-between items-end px-2"><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration (Weeks)</label><span className="font-black text-xl md:text-2xl text-gray-900 font-mono">{calcWeeks}</span></div><input type="range" min="1" max="52" step="1" value={calcWeeks} onChange={e => setCalcWeeks(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div></div></div>
                     <div className="bg-[#1a1a1a] p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] text-white flex flex-col justify-center items-center text-center space-y-4 md:space-y-6 shadow-2xl relative group"><p className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Estimated Total</p><p className="text-4xl md:text-6xl font-black tracking-tighter leading-none">R {calcResults.total.toLocaleString()}</p><div className="w-16 md:w-24 h-1 bg-indigo-600/30 rounded-full" /><div className="flex justify-between w-full px-4 md:px-8"><span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Interest</span><span className="font-black text-indigo-400 text-base md:text-lg">R {calcResults.interest.toLocaleString()}</span></div></div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && userRole === UserRole.LENDER && (
            <div className="max-w-2xl mx-auto">
               <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150 rotate-45" /><h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight mb-8 md:mb-10 flex items-center gap-3 relative z-10"><ShieldCheck size={20} className="text-indigo-600" />Platform Preferences</h3>
                  <div className="divide-y divide-gray-100 relative z-10">
                    {[
                      { key: 'overdueAlerts', icon: Bell, title: t.prefOverdueAlerts, desc: t.prefOverdueDesc },
                      { key: 'whatsappAutomation', icon: Smartphone, title: t.prefSMSAuto, desc: t.prefSMSDesc },
                      { key: 'emailReports', icon: Mail, title: t.prefReports, desc: t.prefReportsDesc.replace('{email}', currentUserEmail), action: handleManualReport, preview: generateReportPreview }
                    ].map((pref) => (
                      <div key={pref.key} className="py-6 md:py-8 flex flex-col gap-4 group">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-4 md:gap-6"><div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl text-gray-400 group-hover:text-indigo-600 transition-colors border border-gray-100"><pref.icon size={20} className="md:w-6 md:h-6" /></div><div><p className="text-sm md:text-base font-black text-gray-900 uppercase tracking-tight">{pref.title}</p><p className="text-[10px] md:text-xs text-gray-400 font-medium leading-relaxed max-w-[200px] md:max-w-sm mt-1">{pref.desc}</p></div></div><button onClick={() => toggleSetting(pref.key as keyof UserSettings)} className={`w-12 h-7 md:w-14 md:h-8 rounded-full relative transition-all duration-500 shadow-inner shrink-0 ${settings[pref.key as keyof UserSettings] ? 'bg-indigo-600' : 'bg-gray-200'}`}><div className={`absolute top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-md transition-all duration-500 ${settings[pref.key as keyof UserSettings] ? 'left-6 md:left-7' : 'left-1'}`} /></button></div>
                        {pref.key === 'emailReports' && settings[pref.key as keyof UserSettings] && (
                           <div className="pl-14 md:pl-20 flex flex-wrap gap-2"><button onClick={pref.action} disabled={isSendingReport} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg disabled:opacity-50">{isSendingReport ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}{isSendingReport ? 'Sending...' : 'Test Email'}</button><button onClick={pref.preview} disabled={isGeneratingPreview} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-100 transition-all disabled:opacity-50">{isGeneratingPreview ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />}{isGeneratingPreview ? 'Drafting...' : 'Preview'}</button></div>
                        )}
                        {pref.key === 'emailReports' && reportPreview && (
                           <div className="mt-4 ml-14 md:ml-20 p-4 md:p-6 bg-gray-50 rounded-2xl md:rounded-3xl border border-dashed border-gray-200 relative animate-in fade-in"><button onClick={() => setReportPreview(null)} className="absolute top-2 right-2 md:top-4 md:right-4 text-gray-400 hover:text-gray-600"><X size={14} /></button><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 md:mb-3">Draft Preview</p><div className="text-[10px] md:text-xs text-gray-600 font-medium whitespace-pre-line italic">{reportPreview}</div></div>
                        )}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </Layout>

      {/* EDIT BORROWER MODAL */}
      {isEditBorrowerModalOpen && editingBorrower && (
        <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] md:rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
              <div className="bg-[#1a1a1a] p-6 md:p-12 text-white flex justify-between items-center shrink-0"><div><p className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Data Maintenance</p><h3 className="text-xl md:text-3xl font-black tracking-tighter uppercase leading-none">{userRole === UserRole.LENDER ? t.editBorrower : 'Edit Profile'}</h3></div><button onClick={() => setIsEditBorrowerModalOpen(false)} className="p-2 md:p-4 hover:bg-white/10 rounded-full border border-white/10"><X size={20} className="md:w-7 md:h-7" /></button></div>
              <form onSubmit={handleSaveBorrowerChanges} className="p-6 md:p-12 space-y-6 md:space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                 <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">{t.fullName}</label><input required value={editingBorrower.name} onChange={e => setEditingBorrower({...editingBorrower, name: e.target.value})} className="w-full px-6 md:px-8 py-3.5 md:py-5 bg-gray-50 border-none rounded-xl md:rounded-3xl focus:ring-2 focus:ring-indigo-600 font-bold text-sm md:text-base text-gray-900 shadow-inner" /></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"><div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">ID Number</label><input disabled value={editingBorrower.idNumber} className="w-full px-6 md:px-8 py-3.5 md:py-5 bg-gray-100 border-none rounded-xl md:rounded-3xl font-bold text-sm md:text-base text-gray-400 font-mono shadow-inner cursor-not-allowed opacity-60" /></div><div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Mobile</label><input required value={editingBorrower.phone} onChange={e => setEditingBorrower({...editingBorrower, phone: e.target.value})} className="w-full px-6 md:px-8 py-3.5 md:py-5 bg-gray-50 border-none rounded-xl md:rounded-3xl focus:ring-2 focus:ring-indigo-600 font-bold text-sm md:text-base text-gray-900 font-mono shadow-inner" /></div></div>
                 <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Email</label><input placeholder="email@example.com" value={editingBorrower.email} onChange={e => setEditingBorrower({...editingBorrower, email: e.target.value})} className="w-full px-6 md:px-8 py-3.5 md:py-5 bg-gray-50 border-none rounded-xl md:rounded-3xl focus:ring-2 focus:ring-indigo-600 font-bold text-sm md:text-base text-gray-900 shadow-inner" /></div>
                 <div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Physical Address</label><textarea required value={editingBorrower.address} onChange={e => setEditingBorrower({...editingBorrower, address: e.target.value})} className="w-full px-6 md:px-8 py-3.5 md:py-5 bg-gray-50 border-none rounded-xl md:rounded-3xl focus:ring-2 focus:ring-indigo-600 font-bold text-sm md:text-base text-gray-900 shadow-inner h-20 md:h-24 resize-none" /></div>
                 <button type="submit" className="w-full py-5 md:py-6 bg-indigo-600 text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-widest shadow-2xl hover:bg-indigo-700 flex items-center justify-center gap-3"><Save size={18} /> {t.saveChanges}</button>
              </form>
           </div>
        </div>
      )}

      {/* BORROWER DETAIL MODAL */}
      {selectedBorrowerId && (
        <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] md:rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
              <div className="bg-[#1a1a1a] p-6 md:p-12 text-white relative shrink-0"><div className="flex justify-between items-start relative z-10"><div className="flex items-center gap-4 md:gap-8"><div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] bg-indigo-600 flex items-center justify-center text-2xl md:text-4xl font-black shadow-2xl border-4 border-white/10">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.name[0]}</div><div><h3 className="text-xl md:text-4xl font-black tracking-tighter uppercase leading-none">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.name}</h3><p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 md:mt-2">{selectedBorrowerId}</p></div></div><button onClick={() => setSelectedBorrowerId(null)} className="p-2 md:p-4 hover:bg-white/10 rounded-full border border-white/10"><X size={20} className="md:w-7 md:h-7" /></button></div></div>
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 md:space-y-10 custom-scrollbar">
                <div className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border-2 flex items-center justify-between ${getScoreColor(borrowers.find(b => b.idNumber === selectedBorrowerId)?.score || 550)}`}><div className="flex items-center gap-3 md:gap-5"><Zap size={24} className="md:w-10 md:h-10 fill-current" /><div><p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Credit Value</p><p className="text-3xl md:text-5xl font-black font-mono leading-none">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.score}</p></div></div><div className="text-right"><p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Motif</p><p className="font-black uppercase tracking-widest text-sm md:text-lg">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.score >= 700 ? 'Platinum' : 'Steady'}</p></div></div>
                <div className="bg-gray-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-100 shadow-inner"><div className="flex items-center gap-4"><div className="p-2.5 md:p-3 bg-white rounded-xl shadow-sm text-indigo-600"><Smartphone size={20} className="md:w-6 md:h-6" /></div><div><p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact</p><p className="font-black text-gray-900 text-xs md:text-base">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.phone}</p></div></div><div className="flex items-center gap-4"><div className="p-2.5 md:p-3 bg-white rounded-xl shadow-sm text-indigo-600"><Mail size={20} className="md:w-6 md:h-6" /></div><div><p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</p><p className="font-black text-gray-900 text-xs md:text-base">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.email || 'None'}</p></div></div></div>
                {userRole === UserRole.BORROWER && <button onClick={() => { handleEditBorrower(currentBorrowerAccount); setSelectedBorrowerId(null); }} className="w-full py-4 bg-gray-900 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2"><Edit2 size={16} /> Update My Details</button>}
                {userRole === UserRole.LENDER && <button onClick={() => handleCreateNewLoanForBorrower(borrowers.find(b => b.idNumber === selectedBorrowerId))} className="w-full py-5 md:py-6 bg-indigo-600 text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-widest shadow-2xl flex items-center justify-center gap-4 hover:bg-indigo-700 active:scale-95 transition-all"><Plus size={20} className="md:w-6 md:h-6" /> Apply for New Loan</button>}
                <h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-3 md:pb-4">Transaction Motif History</h4>
                <div className="space-y-4 md:space-y-6">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.loans.map((loan) => (<div key={loan.id} className="flex items-center justify-between p-5 md:p-8 bg-gray-50/50 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 hover:bg-white transition-all group shadow-sm"><div className="flex items-center gap-4 md:gap-8"><div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-sm border bg-white group-hover:border-indigo-100 transition-colors"><StatusDot status={loan.status} /></div><div><p className="font-black text-indigo-600 uppercase tracking-widest text-[8px] md:text-xs">{loan.id}</p><p className="text-base md:text-xl font-black text-gray-900 mt-0.5">R {loan.amountLoaned.toLocaleString()}</p></div></div><div className="text-right font-mono font-black text-gray-900 text-sm md:text-lg">R {(loan.totalRepayment + calculatePenaltyDetails(loan).penalty).toLocaleString()}</div></div>))}</div>
              </div>
           </div>
        </div>
      )}

      {selectedLoan && (
        <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] md:rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
              <div className="bg-[#1a1a1a] p-6 md:p-12 text-white relative shrink-0"><div className="flex justify-between items-start relative z-10"><div><p className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Transaction Ledger</p><h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">{selectedLoan.id}</h3></div><button onClick={() => setSelectedLoan(null)} className="p-2 md:p-4 hover:bg-white/10 rounded-full border border-white/10"><X size={20} className="md:w-7 md:h-7" /></button></div></div>
              <div className="p-6 md:p-12 space-y-8 md:space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                 <div className="flex flex-col gap-6"><div className="flex flex-col md:flex-row justify-between items-start gap-4"><div><h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Borrower</h4><p className="text-2xl md:text-3xl font-black text-gray-900 leading-none mb-4">{selectedLoan.borrowerName}</p><div className="grid grid-cols-1 gap-3"><div className="flex items-center gap-3 text-gray-500 font-bold text-[10px] md:text-[11px] uppercase tracking-wider"><Smartphone size={14} className="text-indigo-600 shrink-0" /> {selectedLoan.borrowerNumber}</div><div className="flex items-center gap-3 text-gray-500 font-bold text-[10px] md:text-[11px] uppercase tracking-wider"><Fingerprint size={14} className="text-indigo-600 shrink-0" /> ID: {selectedLoan.idNumber}</div><div className="flex items-start gap-3 text-gray-500 font-bold text-[10px] md:text-[11px] uppercase tracking-wider"><MapPin size={14} className="text-indigo-600 shrink-0 mt-0.5" /> <span className="leading-tight">{selectedLoan.physicalAddress}</span></div></div></div><div className="text-right self-end md:self-start"><h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-right">Repayment</h4><div className="flex justify-end"><StatusDot status={selectedLoan.status} /></div></div></div></div>
                 <div className="bg-indigo-50/50 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 border border-indigo-100/50 flex flex-col gap-5 md:gap-6 shadow-inner"><div className="flex justify-between items-center"><div className="flex items-center gap-2"><p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Dues Left</p><Info size={10} className="text-gray-300 md:w-3 md:h-3" /></div><p className="text-2xl md:text-4xl font-black text-indigo-600 font-mono tracking-tighter">R {calculateRemainingBalance(selectedLoan).toLocaleString()}</p></div><div className="flex gap-3 md:gap-4 border-t border-indigo-100 pt-4 md:pt-6"><div className="flex-1 bg-white/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-indigo-50 shadow-sm"><p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Principal</p><p className="text-xs md:text-sm font-black text-gray-800">R {selectedLoan.amountLoaned.toLocaleString()}</p></div><div className="flex-1 bg-white/50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-indigo-50 shadow-sm"><p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Penalty</p><p className="text-xs md:text-sm font-black text-rose-500">R {calculatePenaltyDetails(selectedLoan).penalty.toLocaleString()}</p></div></div></div>
                 {userRole === UserRole.LENDER && <button onClick={() => handleMarkAsPaid(selectedLoan.id)} className="w-full py-4 md:py-6 bg-emerald-600 text-white rounded-xl md:rounded-[2rem] font-black uppercase text-[10px] md:text-xs tracking-widest shadow-xl hover:bg-emerald-700 flex items-center justify-center gap-3"><CheckCircle2 size={18} /> Mark as Fully Paid</button>}
                 <div className="space-y-3 md:space-y-4"><h4 className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Audit History</h4><div className="space-y-2 md:space-y-3">{selectedLoan.history.map((h, idx) => (<div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100"><span className="text-[10px] md:text-xs font-black text-gray-900 uppercase tracking-tight">{h.action}</span><span className="font-black text-indigo-600 text-[10px] md:text-xs font-mono">{h.date}</span></div>))}</div></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
