import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Loan, RepaymentStatus, PayoutMethod, Language, UserSettings, UserRole, ApplicationStatus } from './types';
import { 
  TrendingUp, AlertCircle, CheckCircle2, Plus, Smartphone, ShieldCheck, Bell, Mail, Save, Search, 
  ArrowRight, Wallet, ChevronRight, History, Info, X, Edit2, Loader2, Eye, MapPin, Fingerprint, 
  Key, Lock, UserCircle, ReceiptText, Zap, AlertTriangle,
  Shield, Users, BarChart3, Send, Info as InfoIcon, Sun, Cloud, CloudRain, Thermometer, Wind, Droplets,
  Calendar, Percent, Scale, Calculator, Settings, RefreshCw, Trash2
} from 'lucide-react';
import { 
  DEFAULT_INTEREST_RATE, 
  DEFAULT_PENALTY_RATE, 
  INITIAL_LOANS, 
  TRANSLATIONS 
} from './constants';

const LENDER_PASSWORD = 'imali-admin';

// Dynamic Weather Theme Definitions
const WEATHER_THEMES = {
  sunny: {
    bg: 'https://images.unsplash.com/photo-1590483736622-39da8af7ec8d?q=80&w=1974&auto=format&fit=crop',
    condition: 'Sunny',
    temp: '24°',
    icon: Sun,
    accent: 'text-yellow-400',
    tag: 'Perfect day for growth',
    overlay: 'bg-emerald-900/40'
  },
  cloudy: {
    bg: 'https://images.unsplash.com/photo-1534088568595-a066f7104218?q=80&w=2000&auto=format&fit=crop',
    condition: 'Overcast',
    temp: '19°',
    icon: Cloud,
    accent: 'text-blue-200',
    tag: 'Steady skies ahead',
    overlay: 'bg-emerald-950/50'
  },
  rainy: {
    bg: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1974&auto=format&fit=crop',
    condition: 'Rainy',
    temp: '16°',
    icon: CloudRain,
    accent: 'text-blue-400',
    tag: 'Rain brings abundance',
    overlay: 'bg-emerald-950/60'
  }
};

const App: React.FC = () => {
  const [appLoading, setAppLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.LENDER); 
  const [loggedInBorrowerId, setLoggedInBorrowerId] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Simulated Weather State
  const [currentWeather, setCurrentWeather] = useState<keyof typeof WEATHER_THEMES>('sunny');
  const theme = WEATHER_THEMES[currentWeather];

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
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);

  // Advanced Calculator States
  const [calcAmount, setCalcAmount] = useState<number>(2500);
  const [calcInterest, setCalcInterest] = useState<number>(30);
  const [calcWeeks, setCalcWeeks] = useState<number>(4);
  const [calcFrequency, setCalcFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>('weekly');

  const t = TRANSLATIONS[language];

  const calcResults = useMemo(() => {
    const interest = Math.round(calcAmount * (calcInterest / 100));
    const total = calcAmount + interest;
    
    // Calculate installments
    let numInstallments = 1;
    let daysStep = 7;
    
    if (calcFrequency === 'weekly') {
      numInstallments = calcWeeks;
      daysStep = 7;
    } else if (calcFrequency === 'fortnightly') {
      numInstallments = Math.max(1, Math.floor(calcWeeks / 2));
      daysStep = 14;
    } else {
      numInstallments = Math.max(1, Math.floor(calcWeeks / 4));
      daysStep = 30;
    }

    const perInstallment = Math.round(total / numInstallments);
    
    const schedule = Array.from({ length: numInstallments }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + (i + 1) * daysStep);
      return {
        installment: i + 1,
        date: date.toISOString().split('T')[0],
        amount: perInstallment
      };
    });

    return {
      interest,
      total,
      perInstallment,
      numInstallments,
      schedule,
      pieData: [
        { name: 'Principal', value: calcAmount, color: '#1a1a1a' },
        { name: 'Interest', value: interest, color: '#4f46e5' }
      ]
    };
  }, [calcAmount, calcInterest, calcWeeks, calcFrequency]);

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
    if (userRole === UserRole.BORROWER && (activeTab === 'borrowers' || activeTab === 'settings')) {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter] = useState<string>('All');
  const [showToast, setShowToast] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>({
    overdueAlerts: true,
    whatsappAutomation: true,
    emailReports: true,
    emailNewAppAlerts: true,
    emailOverdueAlerts: true,
    darkMode: false
  });

  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
    return 'text-indigo-600 bg-indigo-50 border-indigo-100';
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
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });
  }, [loans, searchTerm, statusFilter, userRole, loggedInBorrowerId]);

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
    const overdueLoans = targetLoan ? [targetLoan] : loans.filter(l => l.status === RepaymentStatus.OVERDUE);
    if (overdueLoans.length === 0) {
      setIsSendingNotifications(false);
      setShowToast(language === Language.XH ? 'Akukho mboleko idlulileyo ixesha.' : 'No overdue loans found.');
      setTimeout(() => setShowToast(null), 3000);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    setShowToast(t.notifSent);
    setIsSendingNotifications(false);
    setTimeout(() => setShowToast(null), 4000);
  };

  const handleDeleteLoan = (loanId: string) => {
    if (window.confirm(language === Language.XH ? 'Uqinisekile ufuna ukucima le mboleko?' : 'Are you sure you want to delete this loan record?')) {
      setLoans(prev => prev.filter(l => l.id !== loanId));
      setShowToast(language === Language.XH ? 'Imboleko icinyiwe!' : 'Loan record deleted!');
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const handleDeleteBorrower = (idNumber: string) => {
    if (window.confirm(language === Language.XH ? 'Uqinisekile ufuna ukucima lo mboleki nayo yonke imbali yakhe?' : 'Delete this borrower and ALL associated loan history? This cannot be undone.')) {
      setLoans(prev => prev.filter(l => l.idNumber !== idNumber));
      setShowToast(language === Language.XH ? 'Umboleki ucinyiwe!' : 'Borrower and history deleted!');
      setTimeout(() => setShowToast(null), 3000);
    }
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

  const handleLogout = () => {
    setLoggedInBorrowerId(null);
    setLoginIdentifier('');
    setLoginError(null);
  };

  const StatusDot = ({ status, showLabel = false }: { status: RepaymentStatus, showLabel?: boolean }) => {
    const configs = {
      [RepaymentStatus.PAID]: { color: 'bg-emerald-500 ring-emerald-100', text: language === Language.XH ? 'Ihlawulwe' : 'Paid' },
      [RepaymentStatus.OVERDUE]: { color: 'bg-rose-500 ring-rose-100 animate-pulse', text: language === Language.XH ? 'Idlulile' : 'Overdue' },
      [RepaymentStatus.PENDING]: { color: 'bg-amber-500 ring-amber-100', text: language === Language.XH ? 'Isalindile' : 'Pending' },
      [RepaymentStatus.DEFAULTED]: { color: 'bg-gray-400 ring-gray-100', text: language === Language.XH ? 'Ayihlawulwanga' : 'Defaulted' },
    };
    const current = configs[status];
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3.5 h-3.5 rounded-full ${current.color} ring-4`} />
        {showLabel && <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{current.text}</span>}
      </div>
    );
  };

  const SummaryCard = ({ title, value, icon: Icon, colorClass, action, isUrgent }: any) => (
    <div className="bg-white p-5 md:p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 p-1 opacity-5 xhosa-pattern-sm" />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col">
          <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${isUrgent ? 'text-rose-600' : 'text-gray-400'}`}>{title}</p>
          <p className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${colorClass} shrink-0`}><Icon size={18} /></div>
      </div>
      {action && (
        <button onClick={action} className="mt-4 w-full py-2.5 bg-gray-50 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-all border border-gray-100 flex items-center justify-center gap-2 group-hover:border-indigo-200 group-hover:text-indigo-600 text-gray-700">
          {isSendingNotifications ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
          {isSendingNotifications ? t.sendingNotifs : t.sendNotifications}
        </button>
      )}
    </div>
  );

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
        overdueCount={stats.overdueCount}
      >
        {showToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 xhosa-pattern-sm opacity-[0.05]" />
            <CheckCircle2 size={18} className="text-emerald-400 relative z-10" />
            <span className="text-sm font-bold relative z-10">{showToast}</span>
          </div>
        )}
        
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
                  isUrgent={stats.overdueCount > 0}
                  action={userRole === UserRole.LENDER && stats.overdueCount > 0 ? () => handleSendNotifications() : null}
                />
                <SummaryCard title={userRole === UserRole.LENDER ? t.borrowers : "My Trust Score"} value={stats.score} icon={userRole === UserRole.LENDER ? Users : Zap} colorClass="bg-indigo-50 text-indigo-600" />
              </div>

              {userRole === UserRole.BORROWER && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
                  <div 
                    className="p-6 md:p-8 rounded-[2.5rem] md:rounded-[40px] text-white shadow-2xl relative overflow-hidden group min-h-[420px] md:min-h-[480px] flex flex-col justify-between transition-all duration-700 bg-cover bg-center"
                    style={{ backgroundImage: `url('${theme.bg}')` }}
                  >
                    <div className={`absolute inset-0 ${theme.overlay} transition-colors duration-700`} />
                    <div className="relative z-10 flex flex-col justify-between h-full gap-4 md:gap-6">
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] border border-white/20 shadow-lg flex items-center gap-2">
                            <MapPin size={10} className="text-emerald-400" /> {currentBorrowerCity}
                          </div>
                          <button 
                            onClick={() => {
                              const states: (keyof typeof WEATHER_THEMES)[] = ['sunny', 'cloudy', 'rainy'];
                              const next = states[(states.indexOf(currentWeather) + 1) % states.length];
                              setCurrentWeather(next);
                            }}
                            className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all text-xs flex items-center gap-2 font-black uppercase tracking-widest"
                          >
                            <theme.icon size={14} className={theme.accent} /> {theme.condition} • {theme.temp}
                          </button>
                        </div>
                        <div className="bg-emerald-900/20 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 shadow-xl mt-2 group/widget hover:bg-emerald-800/30 transition-all duration-500">
                           <div className="flex items-end justify-between mb-6">
                              <div className="flex items-center gap-4">
                                 <theme.icon size={48} className={`${theme.accent} drop-shadow-lg animate-pulse`} />
                                 <div>
                                    <p className="text-5xl font-black leading-none tracking-tighter">{theme.temp}</p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-1">High: 27° Low: 16°</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-none drop-shadow-md">New Loan Request</h3>
                          <p className="text-emerald-50 text-[10px] md:text-xs font-black uppercase tracking-widest">{theme.tag}</p>
                        </div>
                      </div>
                      <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-emerald-950 w-full py-5 rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl hover:bg-emerald-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group/btn">
                         <span>Start Fast Application</span>
                         <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                       <div className="flex items-center gap-4 mb-4">
                         <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-white shadow-lg">
                           <UserCircle size={24} className="md:w-8 md:h-8" />
                         </div>
                         <div>
                           <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">Verified Member</h3>
                           <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest">Digital Vault Secure</p>
                         </div>
                       </div>
                       <p className="text-xs md:text-sm text-gray-500 font-medium mb-6 leading-relaxed">Access your secure profile, update contact information, and track your credit motif.</p>
                       <div className="flex gap-3">
                         <button onClick={() => setSelectedBorrowerId(loggedInBorrowerId)} className="flex-1 bg-[#1a1a1a] text-white py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                           <Eye size={16} /> Profile
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 md:mt-8">
                <div className="bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card min-h-[350px] md:min-h-[400px]">
                  <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><BarChart3 size={20} /></div>
                    <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight">{userRole === UserRole.LENDER ? 'Portfolio Activity' : 'Disbursement History'}</h3>
                  </div>
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
            </>
          )}

          {activeTab === 'loans' && (
            <div className="bg-white rounded-[2rem] md:rounded-[40px] border border-gray-100 shadow-sm overflow-hidden relative">
              <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative z-10 bg-gray-50/20">
                 <div className="relative w-full md:w-80 group">
                   <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                   <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.search} className="w-full pl-12 pr-6 py-3 bg-white border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium shadow-sm" />
                 </div>
                 <div className="flex flex-wrap gap-2">
                   <button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none bg-[#1a1a1a] text-white px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2">
                     <Plus size={18} /> {userRole === UserRole.LENDER ? 'New Account' : 'Request Loan'}
                   </button>
                 </div>
              </div>
              
              <div className="md:hidden divide-y divide-gray-50">
                {filteredAndSortedLoans.map((loan) => (
                  <div key={loan.id} className="p-6 active:bg-gray-50 transition-colors flex justify-between items-center group">
                    <div onClick={() => setSelectedLoan(loan)} className="space-y-2 flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm">{loan.id}</div>
                        <StatusDot status={loan.status} />
                      </div>
                      <p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p>
                      <p className="text-[10px] font-bold text-gray-400 font-mono">DUE: {loan.dueDate}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-sm font-black text-gray-900">R {loan.amountLoaned.toLocaleString()}</p>
                      <div className="flex gap-2">
                        {userRole === UserRole.LENDER && (
                          <button onClick={() => handleDeleteLoan(loan.id)} className="p-2 text-rose-400 hover:text-rose-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <ChevronRight onClick={() => setSelectedLoan(loan)} size={16} className="text-gray-300 group-active:text-indigo-600 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto relative z-10 custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5">Transaction ID</th>
                      <th className="px-8 py-5">Borrower Name</th>
                      <th className="px-8 py-5">Amount Loaned</th>
                      <th className="px-8 py-5">Due Date</th>
                      <th className="px-8 py-5">Total Amount Due</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAndSortedLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-gray-50/80 transition-all">
                        <td className="px-8 py-6">
                          <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg rotate-1 inline-block uppercase tracking-tighter border border-white/20">
                            {loan.id}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-black text-gray-900 text-sm">R {loan.amountLoaned.toLocaleString()}</p>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-gray-600">{loan.dueDate}</td>
                        <td className="px-8 py-6">
                          <p className="font-black text-indigo-600 font-mono text-sm">R {(loan.totalRepayment + calculatePenaltyDetails(loan).penalty).toLocaleString()}</p>
                        </td>
                        <td className="px-8 py-6"><StatusDot status={loan.status} showLabel /></td>
                        <td className="px-8 py-6 flex justify-center gap-2">
                          <button onClick={() => setSelectedLoan(loan)} className="p-3 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm">
                            <Eye size={18} />
                          </button>
                          {userRole === UserRole.LENDER && (
                            <button onClick={() => handleDeleteLoan(loan.id)} className="p-3 bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-gray-100 shadow-sm">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'calculator' && (
            <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                  <Calculator size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Advanced Loan Planner</h2>
                  <p className="text-gray-500 font-medium">Professional micro-lending projection & schedule tool.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-pattern-sm" />
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-2">
                      <Settings size={20} className="text-indigo-600" /> 
                      {language === Language.EN ? 'Configure Motif' : 'Seta iinkcukacha'}
                    </h3>

                    <div className="space-y-10">
                      {/* Principal Slider */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.principal}</label>
                          <span className="font-black text-2xl text-gray-900 font-mono">R {calcAmount.toLocaleString()}</span>
                        </div>
                        <input 
                          type="range" 
                          min="200" 
                          max="25000" 
                          step="100" 
                          value={calcAmount} 
                          onChange={e => setCalcAmount(Number(e.target.value))} 
                          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                        />
                      </div>

                      {/* Interest Rate Slider */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{language === Language.EN ? 'Interest Rate' : 'Inzala'}</label>
                          <span className="font-black text-2xl text-indigo-600 font-mono">{calcInterest}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="5" 
                          value={calcInterest} 
                          onChange={e => setCalcInterest(Number(e.target.value))} 
                          className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                        />
                      </div>

                      {/* Duration & Frequency Split */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} /> {language === Language.EN ? 'Duration' : 'Ixesha'}
                          </label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="number" 
                              value={calcWeeks} 
                              onChange={e => setCalcWeeks(Math.max(1, Number(e.target.value)))}
                              className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 font-black text-lg focus:ring-2 focus:ring-indigo-600"
                            />
                            <span className="text-xs font-black uppercase text-gray-400">{language === Language.EN ? 'Wks' : 'Iiv'}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <RefreshCw size={14} /> {language === Language.EN ? 'Frequency' : 'Amaxesha'}
                          </label>
                          <select 
                            value={calcFrequency}
                            onChange={e => setCalcFrequency(e.target.value as any)}
                            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 font-black text-sm uppercase tracking-widest focus:ring-2 focus:ring-indigo-600 appearance-none"
                          >
                            <option value="weekly">{language === Language.EN ? 'Weekly' : 'Ngeveki'}</option>
                            <option value="fortnightly">{language === Language.EN ? 'Bi-Weekly' : 'Ngeeviki ezi-2'}</option>
                            <option value="monthly">{language === Language.EN ? 'Monthly' : 'Ngenyanga'}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Analysis & Schedule Panel */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#1a1a1a] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 xhosa-pattern-sm opacity-5 pointer-events-none" />
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">{language === Language.EN ? 'Total Repayment' : 'Iyonke emayihlawulwe'}</p>
                      <p className="text-4xl font-black tracking-tighter leading-none mb-6">R {calcResults.total.toLocaleString()}</p>
                      <div className="flex justify-between items-center pt-6 border-t border-white/10">
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{language === Language.EN ? 'Installment' : 'Isavenge'}</p>
                          <p className="text-xl font-black text-indigo-400">R {calcResults.perInstallment.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{language === Language.EN ? 'Count' : 'Inani'}</p>
                          <p className="text-xl font-black text-white">{calcResults.numInstallments}x</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex items-center justify-between">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Interest Contribution</p>
                          <p className="text-2xl font-black text-indigo-600 font-mono">+ R {calcResults.interest.toLocaleString()}</p>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                          <div className="bg-[#1a1a1a] h-full transition-all duration-500" style={{ width: `${(calcAmount / calcResults.total) * 100}%` }} />
                          <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${(calcResults.interest / calcResults.total) * 100}%` }} />
                        </div>
                      </div>
                      <div className="w-24 h-24 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={calcResults.pieData}
                              innerRadius={25}
                              outerRadius={40}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {calcResults.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Table */}
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <History size={16} className="text-indigo-600" />
                        {language === Language.EN ? 'Repayment Schedule' : 'Uluhlu lweentlawulo'}
                      </h4>
                      <div className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-black text-gray-500 uppercase">
                        {calcResults.numInstallments} {language === Language.EN ? 'Payments' : 'Iintlawulo'}
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white border-b border-gray-50 z-10">
                          <tr>
                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">#</th>
                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date / Umhla</th>
                            <th className="px-8 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Amount / Isixa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {calcResults.schedule.map((item) => (
                            <tr key={item.installment} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="px-8 py-4">
                                <span className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                  {item.installment}
                                </span>
                              </td>
                              <td className="px-8 py-4 font-bold text-gray-600 text-sm font-mono">{item.date}</td>
                              <td className="px-8 py-4 text-right">
                                <span className="font-black text-gray-900 text-sm">R {item.amount.toLocaleString()}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-start gap-4">
                    <InfoIcon size={20} className="text-indigo-600 shrink-0 mt-1" />
                    <p className="text-xs text-indigo-900/70 font-medium leading-relaxed">
                      {language === Language.EN 
                        ? 'Repayment dates are projections based on the today. Adjusting the frequency recalculated installments automatically. Penalty rates are applied manually during the active loan phase if repayments are missed.'
                        : 'Imihla yeentlawulo luqikelelo olusekwe namhlanje. Ukutshintsha i-frequency kuhlaziya isixa semali ngokuzenzekelayo. Iziporo (Penalties) zongezwa ngesandla xa intlawulo ithe yaphoswa.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'borrowers' && userRole === UserRole.LENDER && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {borrowers.map((borrower) => {
                const scoreColor = getScoreColor(borrower.score);
                return (
                  <div key={borrower.idNumber} className={`bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group hover:shadow-md transition-all`}>
                    <div className="flex items-start justify-between mb-6 md:mb-8 relative z-10">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[24px] bg-indigo-600 flex items-center justify-center font-black text-lg md:text-xl text-white shadow-lg">{borrower.name[0]}</div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl border font-black text-[10px] md:text-[12px] flex items-center gap-1 shadow-sm ${scoreColor}`}>
                          <span className="opacity-60 uppercase">Score</span> {borrower.score}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditBorrower(borrower)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-gray-100 shadow-sm">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => handleDeleteBorrower(borrower.idNumber)} className="p-2 bg-gray-50 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-gray-100 shadow-sm">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 md:space-y-6 relative z-10">
                      <div>
                        <div className="flex items-center justify-between mb-1 md:mb-2">
                          <h4 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-none">{borrower.name}</h4>
                          {borrower.score >= 700 ? <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg border-2 border-white"><CheckCircle2 size={12} /></div> : borrower.score < 400 ? <div className="bg-rose-500 text-white p-1 rounded-full shadow-lg border-2 border-white"><AlertTriangle size={12} /></div> : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Smartphone size={10} /> {borrower.phone}</span>
                          <span className="flex items-center gap-1"><Fingerprint size={10} /> {borrower.idNumber}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="bg-gray-50/50 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100">
                          <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                          <p className="text-xs md:text-sm font-black text-gray-900">{borrower.loans.length} Loans</p>
                        </div>
                        <div className="bg-gray-50/50 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100">
                          <p className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active</p>
                          <p className="text-xs md:text-sm font-black text-indigo-600">{borrower.loans.filter(l => l.status !== RepaymentStatus.PAID).length} Active</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedBorrowerId(borrower.idNumber)} className="w-full py-3.5 md:py-4 bg-[#1a1a1a] text-white rounded-xl md:rounded-[24px] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3">
                        <Eye size={14} /> Profile Detail
                      </button>
                    </div>
                  </div>
                );
              })}
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
                      { key: 'emailReports', icon: Mail, title: t.prefReports, desc: t.prefReportsDesc.replace('{email}', currentUserEmail), action: handleManualReport }
                    ].map((pref) => (
                      <div key={pref.key} className="py-6 md:py-8 flex flex-col gap-4 group">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-4 md:gap-6"><div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl text-gray-400 group-hover:text-indigo-600 transition-colors border border-gray-100"><pref.icon size={20} className="md:w-6 md:h-6" /></div><div><p className="text-sm md:text-base font-black text-gray-900 uppercase tracking-tight">{pref.title}</p><p className="text-[10px] md:text-xs text-gray-400 font-medium leading-relaxed max-w-[200px] md:max-w-sm mt-1">{pref.desc}</p></div></div><button onClick={() => toggleSetting(pref.key as keyof UserSettings)} className={`w-12 h-7 md:w-14 md:h-8 rounded-full relative transition-all duration-500 shadow-inner shrink-0 ${settings[pref.key as keyof UserSettings] ? 'bg-indigo-600' : 'bg-gray-200'}`}><div className={`absolute top-1 w-5 h-5 md:w-6 md:h-6 bg-white rounded-full shadow-md transition-all duration-500 ${settings[pref.key as keyof UserSettings] ? 'left-6 md:left-7' : 'left-1'}`} /></button></div>
                        {pref.key === 'emailReports' && settings[pref.key as keyof UserSettings] && (
                           <div className="pl-14 md:pl-20 flex flex-wrap gap-2"><button onClick={pref.action} disabled={isSendingReport} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg disabled:opacity-50">{isSendingReport ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}{isSendingReport ? 'Sending...' : 'Test Email'}</button></div>
                        )}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </Layout>
    </div>
  );
};

export default App;