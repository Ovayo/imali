import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Loan, RepaymentStatus, PayoutMethod, Language, UserSettings, UserRole, ApplicationStatus } from './types';
import { 
  TrendingUp, AlertCircle, CheckCircle2, Plus, Smartphone, ShieldCheck, Bell, Mail, Save, Search, 
  ArrowRight, Wallet, ChevronRight, History, Info, X, Edit2, Loader2, Eye, MapPin, Fingerprint, 
  Key, Lock, UserCircle, ReceiptText, Zap, AlertTriangle, Calendar,
  Shield, Users, BarChart3, Send, Info as InfoIcon, Sun, Cloud, CloudRain, Thermometer, Wind, Droplets,
  Coins, ArrowDownToLine, Scale, Copy, Check, MessageSquare, PhoneCall, ExternalLink, AlertOctagon
} from 'lucide-react';
import { 
  DEFAULT_INTEREST_RATE, 
  DEFAULT_PENALTY_RATE, 
  INITIAL_LOANS, 
  TRANSLATIONS 
} from './constants';

const LENDER_PASSWORD = 'imali-admin';

const WEATHER_THEMES = {
  sunny: {
    bg: 'https://images.unsplash.com/photo-1590483736622-39da8af7ec8d?q=80&w=1974&auto=format&fit=crop',
    condition: 'Sunny',
    temp: '24°C',
    icon: Sun,
    accent: 'text-yellow-400',
    tag: 'A perfect day for growth',
    overlay: 'from-emerald-900/40 via-emerald-900/60 to-emerald-950/90'
  },
  cloudy: {
    bg: 'https://images.unsplash.com/photo-1534088568595-a066f7104218?q=80&w=2000&auto=format&fit=crop',
    condition: 'Overcast',
    temp: '19°C',
    icon: Cloud,
    accent: 'text-blue-100',
    tag: 'Steady skies, steady progress',
    overlay: 'from-emerald-900/50 via-emerald-950/70 to-emerald-950/95'
  },
  rainy: {
    bg: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1974&auto=format&fit=crop',
    condition: 'Rainy',
    temp: '16°C',
    icon: CloudRain,
    accent: 'text-blue-300',
    tag: 'Rain brings local abundance',
    overlay: 'from-emerald-950/60 via-emerald-950/80 to-black/90'
  }
};

const StatusBadge = ({ status, showLabel = true }: { status: RepaymentStatus, showLabel?: boolean }) => {
  const config = {
    [RepaymentStatus.PAID]: { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500' },
    [RepaymentStatus.PENDING]: { color: 'text-amber-600 bg-amber-50 border-amber-100', dot: 'bg-amber-500' },
    [RepaymentStatus.OVERDUE]: { color: 'text-rose-600 bg-rose-50 border-rose-100', dot: 'bg-rose-500 animate-pulse' },
    [RepaymentStatus.DEFAULTED]: { color: 'text-gray-600 bg-gray-50 border-gray-100', dot: 'bg-gray-500' },
  };
  const current = config[status];
  return (
    <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 w-fit ${current.color}`}>
      <div className={`w-2 h-2 rounded-full ${current.dot}`} />
      {showLabel && <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>}
    </div>
  );
};

const SummaryCard = ({ title, value, icon: Icon, colorClass, action, isUrgent }: any) => (
  <div className={`p-6 rounded-[32px] border shadow-sm relative overflow-hidden cultural-card group h-full flex flex-col justify-between transition-all ${isUrgent ? 'bg-rose-50 border-rose-100 ring-1 ring-rose-200' : 'bg-white border-gray-100'}`}>
    <div className="absolute top-0 right-0 p-1 opacity-5 xhosa-pattern-sm" />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isUrgent ? 'text-rose-500' : 'text-gray-500'}`}>{title}</p>
        <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
      </div>
      <div className={`p-3 rounded-2xl ${colorClass} shrink-0 shadow-sm`}><Icon size={20} /></div>
    </div>
    {action && (
      <button 
        onClick={action.onClick}
        className={`mt-4 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isUrgent ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}
      >
        {action.label} <ChevronRight size={14} />
      </button>
    )}
  </div>
);

const App: React.FC = () => {
  const [appLoading, setAppLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.LENDER); 
  const [loggedInBorrowerId, setLoggedInBorrowerId] = useState<string | null>(null);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [currentWeather, setCurrentWeather] = useState<keyof typeof WEATHER_THEMES>('sunny');

  const [showToast, setShowToast] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('imali_settings_v1');
    return saved ? JSON.parse(saved) : {
      overdueAlerts: true,
      whatsappAutomation: false,
      emailReports: true,
      emailNewAppAlerts: true,
      emailOverdueAlerts: true,
      darkMode: false
    };
  });

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
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Advanced Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(2500);
  const [calcWeeks, setCalcWeeks] = useState<number>(4);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    const steps = [
      { t: "Synchronizing community ledger...", x: "Ukuhambelanisa iirekhodi..." },
      { t: "Securing financial vault...", x: "Ukhuseleko lweakhawunti..." },
      { t: "Applying Ubuntu motifs...", x: "Ukulungisa i-imali hub..." }
    ];
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 800);
    const timer = setTimeout(() => {
      setAppLoading(false);
      clearInterval(stepInterval);
    }, 2800);
    return () => {
      clearTimeout(timer);
      clearInterval(stepInterval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('imali_loans_v1', JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem('imali_settings_v1', JSON.stringify(settings));
  }, [settings]);

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
    return Math.min(850, Math.max(300, score));
  };

  const getTierLabel = (score: number) => {
    if (score >= 750) return { label: 'Platinum Ubuntu', color: 'bg-indigo-600 text-white', icon: ShieldCheck };
    if (score >= 650) return { label: 'Gold Member', color: 'bg-amber-100 text-amber-700', icon: Zap };
    if (score >= 500) return { label: 'Silver Tier', color: 'bg-slate-100 text-slate-700', icon: Users };
    return { label: 'Bronze Triage', color: 'bg-rose-50 text-rose-600', icon: AlertTriangle };
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
    map.forEach(b => { b.score = calculateCreditScore(b.loans); });
    return Array.from(map.values());
  }, [loans]);

  const filteredBorrowers = useMemo(() => {
    return borrowers.filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.phone.includes(searchTerm) || 
      b.idNumber.includes(searchTerm)
    ).sort((a, b) => b.score - a.score);
  }, [borrowers, searchTerm]);

  const currentBorrowerAccount = useMemo(() => {
    if (!loggedInBorrowerId) return null;
    return borrowers.find(b => b.idNumber === loggedInBorrowerId) || null;
  }, [borrowers, loggedInBorrowerId]);

  const stats = useMemo(() => {
    let relevantLoans = loans;
    if (userRole === UserRole.BORROWER && loggedInBorrowerId) {
      relevantLoans = loans.filter(l => l.idNumber === loggedInBorrowerId);
    }
    const totalLoaned = relevantLoans.reduce((sum, l) => sum + l.amountLoaned, 0);
    const paidLoansCount = relevantLoans.filter(l => l.status === RepaymentStatus.PAID).length;
    const repaymentRate = relevantLoans.length > 0 ? (paidLoansCount / relevantLoans.length) * 100 : 0;
    const overdueCount = relevantLoans.filter(l => l.status === RepaymentStatus.OVERDUE).length;
    return { totalLoaned, repaymentRate, overdueCount, score: userRole === UserRole.LENDER ? borrowers.length : currentBorrowerAccount?.score || 0 };
  }, [loans, userRole, loggedInBorrowerId, borrowers, currentBorrowerAccount]);

  const calcResults = useMemo(() => {
    const interest = Math.round(calcAmount * (DEFAULT_INTEREST_RATE / 100));
    const total = calcAmount + interest;
    const weeklyInstalment = Math.round(total / calcWeeks);
    const weeklyPenalty = Math.round(calcAmount * (DEFAULT_PENALTY_RATE / 100));
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (calcWeeks * 7));
    const formattedDueDate = dueDate.toLocaleDateString(language === Language.XH ? 'xh-ZA' : 'en-ZA', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    });
    return { interest, total, weeklyInstalment, weeklyPenalty, formattedDueDate, principalPercent: (calcAmount / total) * 100 };
  }, [calcAmount, calcWeeks, language]);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1200));
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
    setShowToast(language === Language.XH ? 'Iinkcukacha zihlaziyiwe!' : 'Profile updated!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleMarkAsPaid = (loanId: string) => {
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        const penalty = calculatePenaltyDetails(l).penalty;
        const totalPaid = l.totalRepayment + penalty;
        return {
          ...l,
          status: RepaymentStatus.PAID,
          history: [
            ...l.history,
            { 
              date: new Date().toISOString().split('T')[0], 
              action: 'Full Repayment Received', 
              amount: totalPaid 
            }
          ]
        };
      }
      return l;
    }));
    setSelectedLoan(null);
    setShowToast(language === Language.XH ? 'Ihlawulwe ngokupheleleyo!' : 'Full repayment recorded!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const filteredAndSortedLoans = useMemo(() => {
    let baseLoans = [...loans];
    if (userRole === UserRole.BORROWER) {
      baseLoans = baseLoans.filter(l => l.idNumber === loggedInBorrowerId);
    }
    return baseLoans.filter(loan => {
      const matchesSearch = 
        loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        loan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.borrowerNumber.includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || loan.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [loans, searchTerm, statusFilter, userRole, loggedInBorrowerId]);

  const theme = WEATHER_THEMES[currentWeather];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Layout 
        activeTab={activeTab} setActiveTab={setActiveTab} language={language} setLanguage={setLanguage} 
        userRole={userRole} toggleRole={() => userRole === UserRole.LENDER ? setUserRole(UserRole.BORROWER) : setLoggedInBorrowerId(null)} 
        onRefresh={handleRefresh} userName={currentBorrowerAccount?.name}
      >
        {showToast && (<div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border border-white/10 relative overflow-hidden"><div className="absolute inset-0 xhosa-pattern-sm opacity-[0.05]" /><CheckCircle2 size={18} className="text-emerald-400 relative z-10" /><span className="text-sm font-bold relative z-10">{showToast}</span></div>)}
        
        <div className="space-y-6 md:space-y-8 pb-32 animate-in fade-in duration-500">
          
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <SummaryCard 
                  title={userRole === UserRole.LENDER ? t.totalLoaned : "Borrowed"} 
                  value={`R ${stats.totalLoaned.toLocaleString()}`} 
                  icon={Wallet} 
                  colorClass="bg-indigo-600 text-white" 
                />
                <SummaryCard 
                  title={userRole === UserRole.LENDER ? t.repaymentRate : "Reliability"} 
                  value={`${stats.repaymentRate.toFixed(1)}%`} 
                  icon={TrendingUp} 
                  colorClass="bg-emerald-600 text-white" 
                />
                <SummaryCard 
                  title={userRole === UserRole.LENDER ? t.overdue : (stats.overdueCount > 0 ? "Overdue Dues" : "Pending")} 
                  value={stats.overdueCount} 
                  icon={stats.overdueCount > 0 ? AlertOctagon : AlertCircle} 
                  colorClass={stats.overdueCount > 0 ? "bg-rose-600 text-white" : "bg-amber-600 text-white"} 
                  isUrgent={userRole === UserRole.BORROWER && stats.overdueCount > 0}
                  action={userRole === UserRole.BORROWER && stats.overdueCount > 0 ? {
                    label: "Settle Now",
                    onClick: () => setActiveTab('loans')
                  } : null}
                />
                <SummaryCard 
                  title={userRole === UserRole.LENDER ? t.borrowers : "Trust Score"} 
                  value={stats.score} 
                  icon={userRole === UserRole.LENDER ? Users : Zap} 
                  colorClass="bg-indigo-600 text-white" 
                />
              </div>

              {userRole === UserRole.BORROWER && currentBorrowerAccount && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
                  <div className="p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group min-h-[440px] flex flex-col justify-between transition-all duration-700 bg-cover bg-center" style={{ backgroundImage: `url('${theme.bg}')` }}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.overlay} transition-colors duration-700`} />
                    <div className="relative z-10 flex flex-col justify-between h-full gap-6">
                       <div className="flex items-center justify-between">
                          <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20 shadow-lg flex items-center gap-2"><MapPin size={10} className="text-emerald-400" /> {currentBorrowerAccount.address.split(',')[0]}</div>
                          <button onClick={() => setCurrentWeather(currentWeather === 'sunny' ? 'cloudy' : currentWeather === 'cloudy' ? 'rainy' : 'sunny')} className="p-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all text-xs flex items-center gap-2 font-black uppercase tracking-widest"><theme.icon size={14} className={theme.accent} /> {theme.temp}</button>
                       </div>
                       <div className="bg-emerald-900/30 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
                          <div className="flex items-center gap-5 mb-6">
                             <div className="p-4 bg-white/10 rounded-[2rem]"><theme.icon size={48} className={theme.accent} /></div>
                             <div><p className="text-6xl font-black leading-none">{theme.temp}</p><p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Today's Outlook</p></div>
                          </div>
                          <p className="text-2xl font-black uppercase tracking-tight">{theme.tag}</p>
                       </div>
                       <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-emerald-950 w-full py-5 rounded-[28px] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-emerald-50 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"><Plus size={24} /> New Application <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" /></button>
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                    <div className="relative z-10">
                       <div className="flex items-center gap-4 mb-6"><div className="w-20 h-20 rounded-[2rem] bg-[#1a1a1a] flex items-center justify-center text-white shadow-xl text-3xl font-black">{currentBorrowerAccount.name[0]}</div><div><h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{currentBorrowerAccount.name}</h3><div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getTierLabel(currentBorrowerAccount.score).color} inline-block`}>{getTierLabel(currentBorrowerAccount.score).label}</div></div></div>
                       <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Loaned</p><p className="text-lg font-black text-gray-900 font-mono">R {currentBorrowerAccount.loans.reduce((acc, l) => acc + l.amountLoaned, 0).toLocaleString()}</p></div>
                          <div className="p-4 bg-gray-50 rounded-2xl"><p className="text-[9px] font-black text-gray-400 uppercase mb-1">Active Accounts</p><p className="text-lg font-black text-gray-900 font-mono">{currentBorrowerAccount.loans.filter(l => l.status !== RepaymentStatus.PAID).length}</p></div>
                       </div>
                       <div className="flex gap-3"><button onClick={() => setSelectedBorrowerId(loggedInBorrowerId)} className="flex-1 bg-[#1a1a1a] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"><Eye size={16} /> My Full Profile</button><button onClick={() => handleEditBorrower(currentBorrowerAccount)} className="px-4 bg-gray-50 text-gray-400 border border-gray-100 rounded-2xl hover:text-indigo-600 transition-all"><Edit2 size={18} /></button></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'borrowers' && userRole === UserRole.LENDER && (
            <div className="space-y-6">
              <div className="bg-white p-4 md:p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="relative w-full md:w-96 group">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                   <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search Ledger by Name, ID or Phone..." className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-bold shadow-inner" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{filteredBorrowers.length} Active Ledger Entries</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredBorrowers.map((borrower) => {
                    const tier = getTierLabel(borrower.score);
                    const activeCount = borrower.loans.filter(l => l.status !== RepaymentStatus.PAID).length;
                    return (
                       <div key={borrower.idNumber} className="bg-white rounded-[40px] border border-gray-100 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cultural-card">
                          <div className="absolute top-0 left-0 w-full h-1 bead-accent opacity-20" />
                          <div className="flex items-start justify-between mb-6">
                             <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black shadow-inner border border-indigo-100 group-hover:scale-110 transition-transform">{borrower.name[0]}</div>
                                <div>
                                   <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{borrower.name}</h4>
                                   <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${tier.color} inline-flex items-center gap-1`}><tier.icon size={8} /> {tier.label}</div>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Community Motif</p>
                                <p className={`text-xl font-black font-mono leading-none ${borrower.score >= 600 ? 'text-emerald-600' : 'text-indigo-600'}`}>{borrower.score}</p>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-8">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mobile Identity</p>
                                <p className="text-xs font-bold text-gray-700 font-mono">{borrower.phone}</p>
                             </div>
                             <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Intake</p>
                                <p className="text-xs font-black text-gray-900">{activeCount} Account{activeCount !== 1 ? 's' : ''}</p>
                             </div>
                          </div>

                          <div className="flex gap-2">
                             <button onClick={() => setSelectedBorrowerId(borrower.idNumber)} className="flex-1 py-3.5 bg-gray-50 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 flex items-center justify-center gap-2">
                                <Eye size={14} /> Full Ledger
                             </button>
                             <button onClick={() => handleEditBorrower(borrower)} className="p-3.5 bg-white text-gray-400 border border-gray-100 rounded-2xl hover:text-indigo-600 hover:border-indigo-100 transition-all">
                                <Edit2 size={16} />
                             </button>
                          </div>
                       </div>
                    );
                 })}
                 {filteredBorrowers.length === 0 && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center text-center opacity-30">
                       <Users size={64} className="mb-4 text-gray-300" />
                       <h3 className="text-xl font-black uppercase tracking-widest text-gray-400">Ledger Empty</h3>
                       <p className="text-sm font-medium mt-1">No community members match your search motif.</p>
                    </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'loans' && (
            <div className="space-y-6">
              <div className="bg-white p-4 md:p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bead-accent opacity-20" />
                 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 flex-1">
                    <div className="relative w-full md:w-80 group">
                       <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                       <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search ID, Name or Mobile..." className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-bold shadow-inner" />
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-[20px] overflow-x-auto scrollbar-hide">
                       {['All', 'Pending', 'Overdue', 'Paid'].map(status => (
                          <button key={status} onClick={() => setStatusFilter(status)} className={`px-5 py-2.5 rounded-[16px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${statusFilter === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{status}</button>
                       ))}
                    </div>
                 </div>
                 {userRole === UserRole.LENDER && (
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-[#1a1a1a] text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2"><Plus size={20} /> New Intake Account</button>
                 )}
              </div>

              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden relative min-h-[500px]">
                <div className="hidden md:block overflow-x-auto relative z-10 custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                      <tr><th className="px-8 py-5">Transaction ID</th><th className="px-8 py-5">Borrower Name</th><th className="px-8 py-5">Mobile</th><th className="px-8 py-5">Amount Loaned</th><th className="px-8 py-5">Due Date</th><th className="px-8 py-5">Total Due</th><th className="px-8 py-5">Total Paid</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-center">Action</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAndSortedLoans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-gray-50/80 transition-all group">
                          <td className="px-8 py-6"><span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm font-mono tracking-tighter">{loan.id}</span></td>
                          <td className="px-8 py-6"><p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p></td>
                          <td className="px-8 py-6"><p className="text-xs font-bold text-gray-500 font-mono">{loan.borrowerNumber}</p></td>
                          <td className="px-8 py-6"><p className="font-black text-gray-900 text-sm">R {loan.amountLoaned.toLocaleString()}</p></td>
                          <td className="px-8 py-6 text-xs font-bold text-gray-600 font-mono">{loan.dueDate}</td>
                          <td className="px-8 py-6"><p className="font-black text-indigo-600 font-mono text-sm">R {(loan.totalRepayment + calculatePenaltyDetails(loan).penalty).toLocaleString()}</p></td>
                          <td className="px-8 py-6"><p className="font-black text-emerald-600 font-mono text-sm">R {calculateTotalPaid(loan).toLocaleString()}</p></td>
                          <td className="px-8 py-6"><StatusBadge status={loan.status} /></td>
                          <td className="px-8 py-6 flex justify-center"><button onClick={() => setSelectedLoan(loan)} className="p-3 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm"><Eye size={18} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calculator' && (
            <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
               <div className="bg-white rounded-[48px] shadow-2xl border border-gray-100 overflow-hidden relative min-h-[600px] flex flex-col lg:flex-row">
                  <div className="lg:w-7/12 p-8 md:p-14 space-y-12 bg-white relative">
                     <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                     <div className="space-y-2"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Scale size={20} /></div><h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Smart Planner</h3></div><p className="text-xs md:text-sm text-gray-500 font-medium">Fine-tune your application to ensure affordability.</p></div>
                     <div className="space-y-10">
                        <div className="space-y-6">
                           <div className="flex justify-between items-end px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Loan Principal</label><span className="font-black text-3xl text-gray-900 font-mono tracking-tighter">R {calcAmount.toLocaleString()}</span></div>
                           <input type="range" min="200" max="15000" step="100" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                           <div className="flex flex-wrap gap-2 pt-2">{[200, 1000, 2500, 5000, 10000].map(amt => (<button key={amt} onClick={() => setCalcAmount(amt)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${calcAmount === amt ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-100'}`}>R {amt.toLocaleString()}</button>))}</div>
                        </div>
                        <div className="space-y-6">
                           <div className="flex justify-between items-end px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Duration (Weeks)</label><span className="font-black text-3xl text-gray-900 font-mono tracking-tighter">{calcWeeks} <span className="text-sm font-black uppercase text-gray-400">Wks</span></span></div>
                           <input type="range" min="1" max="4" step="1" value={calcWeeks} onChange={e => setCalcWeeks(Number(e.target.value))} className="w-full h-3 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                           <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-2 italic">Max duration capped at 4 weeks for micro-liquidity.</p>
                        </div>
                     </div>
                  </div>
                  <div className="lg:w-5/12 bg-[#1a1a1a] p-8 md:p-14 text-white flex flex-col justify-between relative overflow-hidden">
                     <div className="absolute inset-0 opacity-[0.05] pointer-events-none xhosa-pattern rotate-12 scale-150" />
                     <div className="relative z-10 space-y-10 text-center">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] leading-none">Affordable Weekly Instalment</p>
                        <p className="text-7xl md:text-8xl font-black tracking-tighter leading-none font-mono">R {calcResults.weeklyInstalment.toLocaleString()}</p>
                        
                        <div className="space-y-6 bg-white/5 backdrop-blur-md rounded-[40px] p-8 border border-white/10 shadow-2xl text-left">
                           <div className="space-y-4">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-gray-400">Repayment Structure</span><span className="text-indigo-400">{DEFAULT_INTEREST_RATE}% Fixed Interest</span></div>
                              <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden flex shadow-inner"><div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${calcResults.principalPercent}%` }} /><div className="h-full bg-white/20 transition-all duration-700" style={{ width: `${100 - calcResults.principalPercent}%` }} /></div>
                              <div className="flex justify-between pt-2"><div><p className="text-[8px] font-black uppercase text-gray-500 tracking-widest">Principal</p><p className="text-sm font-black font-mono tracking-tighter">R {calcAmount.toLocaleString()}</p></div><div className="text-right"><p className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">Interest</p><p className="text-sm font-black font-mono tracking-tighter text-indigo-400">+ R {calcResults.interest.toLocaleString()}</p></div></div>
                           </div>
                           
                           <div className="border-t border-white/10 pt-6 space-y-4">
                              <div className="flex items-start gap-3 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                                <AlertOctagon size={16} className="text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Late Payment Risk</p>
                                  <p className="text-xs font-medium text-gray-300">Defaulting triggers a weekly penalty of <span className="font-black text-white">R {calcResults.weeklyPenalty.toLocaleString()}</span> (5% of principal).</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                 <div><div className="flex items-center gap-2 text-gray-500"><Calendar size={12} /><span className="text-[8px] font-black uppercase tracking-widest">Repay Date</span></div><p className="text-xs font-black tracking-tight">{calcResults.formattedDueDate}</p></div>
                                 <div className="text-right"><div><div className="flex items-center justify-end gap-2 text-gray-500"><ArrowDownToLine size={12} /><span className="text-[8px] font-black uppercase tracking-widest">Total</span></div><p className="text-lg font-black tracking-tighter text-indigo-400">R {calcResults.total.toLocaleString()}</p></div></div>
                              </div>
                           </div>
                        </div>
                     </div>
                     <button onClick={() => setIsAddModalOpen(true)} className="relative z-10 w-full py-5 bg-white text-[#1a1a1a] rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-4 group mt-10"><span className="relative z-10">Proceed with Request</span><ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" /></button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && userRole === UserRole.LENDER && (
            <div className="max-w-2xl mx-auto"><div className="bg-white p-6 md:p-10 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150 rotate-45" /><h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-3 relative z-10"><ShieldCheck size={20} className="text-indigo-600" />Platform Preferences</h3><div className="divide-y divide-gray-100 relative z-10">{[{ key: 'overdueAlerts', icon: Bell, title: t.prefOverdueAlerts, desc: t.prefOverdueDesc }, { key: 'whatsappAutomation', icon: Smartphone, title: t.prefSMSAuto, desc: t.prefSMSDesc }, { key: 'emailReports', icon: Mail, title: t.prefReports, desc: t.prefReportsDesc.replace('{email}', LENDER_EMAIL), action: handleManualReport }].map((pref) => (<div key={pref.key} className="py-8 flex flex-col gap-4 group"><div className="flex items-center justify-between"><div className="flex items-center gap-6"><div className="p-4 bg-gray-50 rounded-2xl text-gray-400 group-hover:text-indigo-600 transition-colors border border-gray-100"><pref.icon size={24} /></div><div><p className="text-base font-black text-gray-900 uppercase tracking-tight">{pref.title}</p><p className="text-xs text-gray-400 font-medium leading-relaxed max-w-sm mt-1">{pref.desc}</p></div></div><button onClick={() => setSettings(prev => ({...prev, [pref.key]: !prev[pref.key as keyof UserSettings]}))} className={`w-14 h-8 rounded-full relative transition-all duration-500 shadow-inner shrink-0 ${settings[pref.key as keyof UserSettings] ? 'bg-indigo-600' : 'bg-gray-200'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-500 ${settings[pref.key as keyof UserSettings] ? 'left-7' : 'left-1'}`} /></button></div></div>))}</div></div></div>
          )}
        </div>
      </Layout>

      {/* BORROWER PROFILE MODAL */}
      {selectedBorrowerId && (
        <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
           {(() => {
              const borrower = borrowers.find(b => b.idNumber === selectedBorrowerId);
              if (!borrower) return null;
              const tier = getTierLabel(borrower.score);
              const totalAmount = borrower.loans.reduce((acc, l) => acc + l.amountLoaned, 0);
              const repaidAmount = borrower.loans.filter(l => l.status === RepaymentStatus.PAID).reduce((acc, l) => acc + l.totalRepayment, 0);
              
              return (
                 <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="bg-[#1a1a1a] p-10 md:p-14 text-white relative flex-shrink-0">
                       <div className="absolute inset-0 opacity-10 xhosa-pattern rotate-12" />
                       <div className="flex justify-between items-start relative z-10">
                          <div className="flex items-center gap-8">
                             <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-4xl font-black shadow-2xl border border-white/20">{borrower.name[0]}</div>
                             <div className="space-y-2">
                                <h3 className="text-5xl font-black tracking-tighter uppercase leading-none">{borrower.name}</h3>
                                <div className="flex items-center gap-3">
                                   <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] ${tier.color} border border-white/10 shadow-lg flex items-center gap-2`}><tier.icon size={12} /> {tier.label}</div>
                                   <div className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 border border-white/10 text-gray-400">Score: {borrower.score}</div>
                                </div>
                             </div>
                          </div>
                          <button onClick={() => setSelectedBorrowerId(null)} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"><X size={32} /></button>
                       </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-10 md:p-14 space-y-14 custom-scrollbar">
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 grid grid-cols-3 gap-6">
                             <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Lifecycle Intake</p><p className="text-3xl font-black text-gray-900 font-mono">R {totalAmount.toLocaleString()}</p></div>
                             <div className="p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 shadow-sm"><p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">Successful Repayments</p><p className="text-3xl font-black text-emerald-700 font-mono">R {repaidAmount.toLocaleString()}</p></div>
                             <div className="p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 shadow-sm"><p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest mb-2">Portfolio Tenure</p><p className="text-3xl font-black text-indigo-700 font-mono">{borrower.loans.length} <span className="text-sm">Txns</span></p></div>
                          </div>
                          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Verified Contact Access</p>
                             <div className="space-y-4">
                                <div className="flex items-center gap-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Smartphone size={20} /></div><div><p className="text-[8px] font-black text-gray-400 uppercase">Mobile Identity</p><p className="text-sm font-bold text-gray-900 font-mono">{borrower.phone}</p></div></div>
                                <div className="flex items-center gap-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Mail size={20} /></div><div><p className="text-[8px] font-black text-gray-400 uppercase">Digital Mail</p><p className="text-sm font-bold text-gray-900">{borrower.email}</p></div></div>
                             </div>
                             <div className="flex gap-2 pt-2">
                                <a href={`https://wa.me/${borrower.phone.replace(/\s/g, '')}`} target="_blank" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"><MessageSquare size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span></a>
                                <button onClick={() => handleEditBorrower(borrower)} className="px-5 bg-gray-50 text-gray-400 border border-gray-100 rounded-2xl hover:text-indigo-600 transition-all"><Edit2 size={18} /></button>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-8">
                          <div className="flex items-center justify-between"><h4 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3"><History size={24} className="text-indigo-600" /> Transactional Motif</h4><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Community History</p></div>
                          <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
                             <table className="w-full text-left">
                                <thead className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                   <tr><th className="px-8 py-5">Txn ID</th><th className="px-8 py-5">Initiation Date</th><th className="px-8 py-5">Principal</th><th className="px-8 py-5">Total Repayable</th><th className="px-8 py-5">Status</th><th className="px-8 py-5 text-center">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                   {borrower.loans.map(loan => (
                                      <tr key={loan.id} className="hover:bg-gray-50/50 transition-all">
                                         <td className="px-8 py-6"><span className="font-mono font-black text-indigo-600">{loan.id}</span></td>
                                         <td className="px-8 py-6 text-sm font-bold text-gray-600">{loan.startDate}</td>
                                         <td className="px-8 py-6 font-black text-gray-900">R {loan.amountLoaned.toLocaleString()}</td>
                                         <td className="px-8 py-6 font-black text-indigo-600 font-mono">R {loan.totalRepayment.toLocaleString()}</td>
                                         <td className="px-8 py-6"><StatusBadge status={loan.status} /></td>
                                         <td className="px-8 py-6 text-center"><button onClick={() => { setSelectedLoan(loan); setSelectedBorrowerId(null); }} className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all"><Eye size={18} /></button></td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    </div>
                 </div>
              );
           })()}
        </div>
      )}

      {/* EDIT BORROWER MODAL */}
      {isEditBorrowerModalOpen && editingBorrower && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
              <div className="bg-[#1a1a1a] p-10 text-white flex justify-between items-center">
                 <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Update Member Identity</p><h3 className="text-3xl font-black uppercase tracking-tighter">Edit Ledger Info</h3></div>
                 <button onClick={() => setIsEditBorrowerModalOpen(false)} className="p-4 hover:bg-white/10 rounded-full border border-white/10 transition-colors"><X size={28} /></button>
              </div>
              <form onSubmit={handleSaveBorrowerChanges} className="p-10 space-y-6">
                 <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Member Name</label><input required value={editingBorrower.name} onChange={e => setEditingBorrower({...editingBorrower, name: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 shadow-inner" /></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">ID Number</label><input disabled value={editingBorrower.idNumber} className="w-full px-6 py-4 bg-gray-100 border-none rounded-2xl font-bold text-gray-400 font-mono shadow-inner cursor-not-allowed" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Mobile Identity</label><input required value={editingBorrower.phone} onChange={e => setEditingBorrower({...editingBorrower, phone: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 font-mono shadow-inner" /></div>
                 </div>
                 <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Residency Address</label><input required value={editingBorrower.address} onChange={e => setEditingBorrower({...editingBorrower, address: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 shadow-inner" /></div>
                 <div className="pt-6"><button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"><Save size={24} /> Commit Changes to Ledger</button></div>
              </form>
           </div>
        </div>
      )}

      {/* LOAN DETAIL MODAL */}
      {selectedLoan && (
        <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col h-[85vh]">
              <div className="bg-[#1a1a1a] p-8 md:p-12 text-white flex justify-between items-start shrink-0">
                 <div>
                    <div className="flex items-center gap-3 mb-2"><span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-lg font-mono">TXN: {selectedLoan.id}</span><StatusBadge status={selectedLoan.status} /></div>
                    <h3 className="text-4xl font-black tracking-tighter uppercase leading-none">{selectedLoan.borrowerName}</h3>
                 </div>
                 <button onClick={() => setSelectedLoan(null)} className="p-4 hover:bg-white/10 rounded-full border border-white/10 transition-colors"><X size={28} /></button>
              </div>
              <div className="p-8 md:p-12 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-12 custom-scrollbar">
                 <div className="space-y-10">
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Verified Identity Details</h4>
                       <div className="grid grid-cols-1 gap-6">
                          <div className="flex items-center gap-4"><div className="p-3 bg-gray-50 rounded-2xl text-indigo-600"><Smartphone size={20} /></div><div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mobile Number</p><p className="font-black text-gray-900 font-mono">{selectedLoan.borrowerNumber}</p></div></div>
                          <div className="flex items-center gap-4"><div className="p-3 bg-gray-50 rounded-2xl text-indigo-600"><Fingerprint size={20} /></div><div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">ID Identity</p><p className="font-black text-gray-900 font-mono">{selectedLoan.idNumber}</p></div></div>
                          <div className="flex items-center gap-4"><div className="p-3 bg-gray-50 rounded-2xl text-indigo-600"><MapPin size={20} /></div><div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Residency</p><p className="font-black text-gray-900 text-sm leading-tight">{selectedLoan.physicalAddress}</p></div></div>
                       </div>
                    </div>
                    {userRole === UserRole.LENDER && selectedLoan.status !== RepaymentStatus.PAID && (
                       <button onClick={() => handleMarkAsPaid(selectedLoan.id)} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-sm tracking-widest shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"><CheckCircle2 size={24} /> Record Full Repayment</button>
                    )}
                 </div>
                 <div className="space-y-8">
                    <div className="bg-indigo-50/50 rounded-[40px] p-8 border border-indigo-100 shadow-inner space-y-6">
                       <div className="flex justify-between items-end">
                          <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dues Remaining</p><p className="text-4xl font-black text-indigo-600 font-mono tracking-tighter">R {calculateRemainingBalance(selectedLoan).toLocaleString()}</p></div>
                          <div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Paid</p><p className="text-xl font-black text-emerald-600 font-mono">R {calculateTotalPaid(selectedLoan).toLocaleString()}</p></div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Audit History</h4>
                       <div className="space-y-3">
                          {selectedLoan.history.map((h, idx) => (<div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-colors shadow-sm"><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-400" /><span className="text-xs font-black text-gray-900 uppercase tracking-tight">{h.action}</span></div><span className="font-black text-indigo-600 text-xs font-mono">{h.date}</span></div>))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* BORROWER AUTH MODAL */}
      {!loggedInBorrowerId && userRole === UserRole.BORROWER && (
         <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white w-full max-md rounded-[48px] p-10 shadow-2xl space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-700">
               <div className="text-center"><div className="inline-block bg-indigo-600 p-6 rounded-[2.5rem] shadow-2xl mb-6"><Wallet size={48} className="text-white" /></div><h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">imali</h1><p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px]">Secure Gateway</p></div>
               <form onSubmit={(e) => { e.preventDefault(); const b = borrowers.find(x => x.idNumber === loginIdentifier || x.phone === loginIdentifier); if(b) setLoggedInBorrowerId(b.idNumber); else setLoginError('Account not found'); }} className="space-y-6">
                  <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-6">ID or Mobile</label><input required placeholder="Verification detail" value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-600 font-bold text-gray-900 shadow-inner" /></div>
                  {loginError && <p className="text-rose-500 text-[10px] font-black uppercase text-center">{loginError}</p>}
                  <button type="submit" className="w-full py-5 bg-[#1a1a1a] text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">Verify Identity <ShieldCheck size={20} /></button>
                  <button type="button" onClick={() => setUserRole(UserRole.LENDER)} className="w-full py-3 text-gray-400 font-black uppercase text-[9px] tracking-widest text-center hover:text-gray-600 transition-colors">Admin Access</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;