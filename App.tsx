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
  Calendar, Percent, Scale, Calculator, Settings, RefreshCw, Trash2, Home, Mail as MailIcon, Phone, Clock, LogIn,
  Waves, Gauge, Star, ShieldAlert, UserPlus
} from 'lucide-react';
import { 
  DEFAULT_INTEREST_RATE, 
  DEFAULT_PENALTY_RATE, 
  INITIAL_LOANS, 
  TRANSLATIONS 
} from './constants';

const LENDER_PASSWORD = 'imali-admin';

// Eastern Cape City Image Mapping
const CITY_IMAGES: Record<string, string> = {
  'East London': 'https://images.unsplash.com/photo-1549405626-ec49a7442168?q=80&w=2000&auto=format&fit=crop',
  'Gqeberha': 'https://images.unsplash.com/photo-1571401138243-98282367d344?q=80&w=2000&auto=format&fit=crop',
  'Mthatha': 'https://images.unsplash.com/photo-1523805081730-6144a77fb30b?q=80&w=2000&auto=format&fit=crop',
  'Qonce': 'https://images.unsplash.com/photo-1560935574-d45607062f6b?q=80&w=2000&auto=format&fit=crop',
  'Butterworth': 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?q=80&w=2000&auto=format&fit=crop',
  'Mdantsane': 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=2000&auto=format&fit=crop',
  'Alice': 'https://images.unsplash.com/photo-1523438097201-512ae7d59c44?q=80&w=2000&auto=format&fit=crop',
  'Eastern Cape': 'https://images.unsplash.com/photo-1590483736622-39da8af7ec8d?q=80&w=2000&auto=format&fit=crop'
};

const WEATHER_THEMES = {
  sunny: {
    condition: 'Sunny', temp: '24°', icon: Sun, accent: 'text-yellow-400', tag: 'Perfect day for growth',
    overlay: 'bg-emerald-900/40', wind: '12km/h', humidity: '42%', vibe: 'High Growth Potential'
  },
  cloudy: {
    condition: 'Overcast', temp: '19°', icon: Cloud, accent: 'text-blue-200', tag: 'Steady skies ahead',
    overlay: 'bg-emerald-950/50', wind: '8km/h', humidity: '65%', vibe: 'Calculated Stability'
  },
  rainy: {
    condition: 'Rainy', temp: '16°', icon: CloudRain, accent: 'text-blue-400', tag: 'Rain brings abundance',
    overlay: 'bg-emerald-950/60', wind: '18km/h', humidity: '88%', vibe: 'Seeding Prosperity'
  }
};

const App: React.FC = () => {
  const [appLoading, setAppLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Security States
  const [userRole, setUserRole] = useState<UserRole>(UserRole.BORROWER); 
  const [isLenderAuthenticated, setIsLenderAuthenticated] = useState(false);
  const [lenderPassInput, setLenderPassInput] = useState('');
  const [lenderAuthError, setLenderAuthError] = useState(false);

  const [loggedInBorrowerId, setLoggedInBorrowerId] = useState<string | null>(null);
  
  const [showToast, setShowToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RepaymentStatus | 'All'>('All');

  // Auth Form State for Borrowers
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginId, setLoginId] = useState('');
  const [regForm, setRegForm] = useState({ name: '', id: '', phone: '', address: '' });
  
  // Simulated Weather State
  const [currentWeather, setCurrentWeather] = useState<keyof typeof WEATHER_THEMES>('sunny');
  const weather = WEATHER_THEMES[currentWeather];

  const LENDER_EMAIL = 'montiovayo@gmail.com';

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('imali_loans_v1');
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [extraProfiles, setExtraProfiles] = useState<any[]>(() => {
    const saved = localStorage.getItem('imali_profiles_v1');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('imali_profiles_v1', JSON.stringify(extraProfiles));
  }, [extraProfiles]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditBorrowerModalOpen, setIsEditBorrowerModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<{ idNumber: string, name: string, address: string, phone: string, email: string } | null>(null);
  
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);

  const handleSendNotifications = () => {
    setIsSendingNotifications(true);
    setTimeout(() => {
      setIsSendingNotifications(false);
      setShowToast(language === Language.XH ? 'Izaziso zithunyelwe!' : 'Notifications sent!');
      setTimeout(() => setShowToast(null), 3000);
    }, 2000);
  };

  const t = TRANSLATIONS[language];

  // Advanced Calculator Logic
  const [calcAmount, setCalcAmount] = useState<number>(2500);
  const [calcInterest, setCalcInterest] = useState<number>(30);
  const [calcWeeks, setCalcWeeks] = useState<number>(4);
  const [calcFrequency, setCalcFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>('weekly');

  const calcResults = useMemo(() => {
    const interest = Math.round(calcAmount * (calcInterest / 100));
    const total = calcAmount + interest;
    let numInstallments = 1;
    let daysStep = 7;
    
    if (calcFrequency === 'weekly') { numInstallments = calcWeeks; daysStep = 7; }
    else if (calcFrequency === 'fortnightly') { numInstallments = Math.max(1, Math.floor(calcWeeks / 2)); daysStep = 14; }
    else { numInstallments = Math.max(1, Math.floor(calcWeeks / 4)); daysStep = 30; }

    const perInstallment = Math.round(total / numInstallments);
    const schedule = Array.from({ length: numInstallments }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + (i + 1) * daysStep);
      return { installment: i + 1, date: date.toISOString().split('T')[0], amount: perInstallment };
    });

    return { interest, total, perInstallment, numInstallments, schedule, pieData: [
      { name: 'Principal', value: calcAmount, color: '#1a1a1a' },
      { name: 'Interest', value: interest, color: '#4f46e5' }
    ]};
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
    return () => { clearTimeout(timer); clearInterval(stepInterval); };
  }, []);

  useEffect(() => {
    localStorage.setItem('imali_loans_v1', JSON.stringify(loans));
  }, [loans]);

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

  const calculateCreditScore = (borrowerLoans: Loan[]) => {
    let score = 600;
    borrowerLoans.forEach(l => {
      if (l.status === RepaymentStatus.PAID) {
        score += 45;
        const payDate = l.history.find(h => h.action.includes('Full Repayment Received'))?.date;
        if (payDate && new Date(payDate) <= new Date(l.dueDate)) score += 15;
      }
      if (l.status === RepaymentStatus.OVERDUE) score -= 90;
      if (l.status === RepaymentStatus.DEFAULTED) score -= 250;
      if (l.status === RepaymentStatus.PENDING) {
        if (new Date(l.dueDate) > new Date()) score += 5;
      }
    });
    const completed = borrowerLoans.filter(l => l.status === RepaymentStatus.PAID).length;
    if (completed >= 3) score += 40;
    if (completed >= 10) score += 60;
    return Math.min(850, Math.max(300, score));
  };

  const getScoreRating = (score: number) => {
    if (score >= 750) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', rating: 'A+', icon: Star };
    if (score >= 680) return { label: 'Good', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', rating: 'B', icon: ShieldCheck };
    if (score >= 500) return { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', rating: 'C', icon: Info };
    return { label: 'Risk', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', rating: 'D', icon: ShieldAlert };
  };

  const borrowers = useMemo(() => {
    const map = new Map<string, { idNumber: string, name: string, address: string, phone: string, email: string, score: number, loans: Loan[] }>();
    loans.forEach(loan => {
      if (!map.has(loan.idNumber)) {
        map.set(loan.idNumber, { 
          idNumber: loan.idNumber, name: loan.borrowerName, address: loan.physicalAddress,
          phone: loan.borrowerNumber, email: loan.email || loan.idNumber.substring(0, 5) + '@biz.co.za',
          loans: [], score: 0
        });
      }
      map.get(loan.idNumber)!.loans.push(loan);
    });
    extraProfiles.forEach(p => {
      if (!map.has(p.idNumber)) {
        map.set(p.idNumber, { ...p, loans: [], score: 600 });
      }
    });
    map.forEach(b => { b.score = calculateCreditScore(b.loans); });
    return Array.from(map.values());
  }, [loans, extraProfiles]);

  const currentBorrowerAccount = useMemo(() => {
    if (!loggedInBorrowerId) return null;
    return borrowers.find(b => b.idNumber === loggedInBorrowerId) || null;
  }, [borrowers, loggedInBorrowerId]);

  const currentBorrowerCity = useMemo(() => {
    if (!currentBorrowerAccount) return "East London";
    const parts = currentBorrowerAccount.address.split(',');
    return parts[0].trim();
  }, [currentBorrowerAccount]);

  const cityBackground = useMemo(() => {
    return CITY_IMAGES[currentBorrowerCity] || CITY_IMAGES['Eastern Cape'];
  }, [currentBorrowerCity]);

  // Auth Handlers
  const handleLenderAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (lenderPassInput === LENDER_PASSWORD) {
      setIsLenderAuthenticated(true);
      setUserRole(UserRole.LENDER);
      setLenderAuthError(false);
      setLenderPassInput('');
      setShowToast(language === Language.XH ? 'Umnini-fana uloge ngempumelelo!' : 'Lender admin authenticated!');
    } else {
      setLenderAuthError(true);
      setTimeout(() => setLenderAuthError(false), 2000);
    }
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = borrowers.find(b => b.idNumber === loginId);
    if (found) {
      setLoggedInBorrowerId(found.idNumber);
      setShowToast(language === Language.XH ? `Wamkelekile, ${found.name}!` : `Welcome back, ${found.name}!`);
    } else {
      setShowToast(language === Language.XH ? "ID ayifunyanwanga. Nceda ubhalise." : "ID not found. Please register as a new member.");
    }
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (borrowers.find(b => b.idNumber === regForm.id)) {
      setShowToast(language === Language.XH ? "Lo ID sele ekhona." : "This ID is already registered.");
      setTimeout(() => setShowToast(null), 3000);
      return;
    }
    const newProfile = {
      idNumber: regForm.id,
      name: regForm.name,
      phone: regForm.phone,
      address: regForm.address,
      email: regForm.id.substring(0, 5) + '@imali.co.za'
    };
    setExtraProfiles(prev => [...prev, newProfile]);
    setLoggedInBorrowerId(newProfile.idNumber);
    setShowToast(language === Language.XH ? "Ubhalise ngempumelelo!" : "Registration successful! Welcome to the community.");
    setTimeout(() => setShowToast(null), 3000);
  };

  const filteredAndSortedLoans = useMemo(() => {
    let baseLoans = [...loans];
    if (userRole === UserRole.BORROWER) baseLoans = baseLoans.filter(l => l.idNumber === loggedInBorrowerId);
    const filtered = baseLoans.filter(loan => {
      const matchesSearch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) || loan.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || loan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    return [...filtered].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [loans, searchTerm, statusFilter, userRole, loggedInBorrowerId]);

  const stats = useMemo(() => {
    const relevantLoans = userRole === UserRole.LENDER ? loans : loans.filter(l => l.idNumber === loggedInBorrowerId);
    const totalLoaned = relevantLoans.reduce((acc, l) => acc + l.amountLoaned, 0);
    const paidCount = relevantLoans.filter(l => l.status === RepaymentStatus.PAID).length;
    const repaymentRate = relevantLoans.length > 0 ? (paidCount / relevantLoans.length) * 100 : 0;
    const overdueCount = relevantLoans.filter(l => l.status === RepaymentStatus.OVERDUE).length;
    const score = userRole === UserRole.BORROWER ? (currentBorrowerAccount?.score || 600) : new Set(relevantLoans.map(l => l.idNumber)).size;
    return { totalLoaned, repaymentRate, overdueCount, score };
  }, [loans, userRole, loggedInBorrowerId, currentBorrowerAccount]);

  const chartData = useMemo(() => {
    const relevantLoans = userRole === UserRole.LENDER ? loans : loans.filter(l => l.idNumber === loggedInBorrowerId);
    const monthlyMap = new Map<string, number>();
    relevantLoans.forEach(loan => {
      const date = new Date(loan.startDate);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyMap.set(monthLabel, (monthlyMap.get(monthLabel) || 0) + loan.amountLoaned);
    });
    return { monthlyData: Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amount })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()) };
  }, [loans, userRole, loggedInBorrowerId]);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    setShowToast(language === Language.XH ? 'Ihlaziyiwe!' : 'Data refreshed!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleMarkAsPaid = (loanId: string) => {
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        const penaltyInfo = calculatePenaltyDetails(l);
        return {
          ...l, status: RepaymentStatus.PAID,
          history: [...l.history, { date: new Date().toISOString().split('T')[0], action: 'Full Repayment Received', amount: l.totalRepayment + penaltyInfo.penalty }]
        };
      }
      return l;
    }));
    setShowToast(language === Language.XH ? 'Intlawulo ifunyenwe!' : 'Payment recorded!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleLogout = () => {
    setLoggedInBorrowerId(null);
    setIsLenderAuthenticated(false);
    setUserRole(UserRole.BORROWER);
    setActiveTab('dashboard');
  };

  const toggleRole = () => {
    if (userRole === UserRole.BORROWER) {
      // Trying to access Lender
      if (!isLenderAuthenticated) {
        setUserRole(UserRole.LENDER); // Trigger Lender login view
      } else {
        setUserRole(UserRole.LENDER);
      }
    } else {
      // Switching to Borrower
      handleLogout();
    }
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

  const selectedBorrower = useMemo(() => {
    return borrowers.find(b => b.idNumber === selectedBorrowerId) || null;
  }, [borrowers, selectedBorrowerId]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* SECURITY GATE: Lender Portal Authentication */}
      {userRole === UserRole.LENDER && !isLenderAuthenticated ? (
        <div className="fixed inset-0 z-[300] bg-gray-950 flex items-center justify-center p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05] xhosa-pattern scale-150 rotate-45" />
          <div className={`max-w-md w-full bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl relative transition-all duration-300 ${lenderAuthError ? 'shake border-4 border-rose-500' : 'border border-gray-100'}`}>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gray-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mb-8 -rotate-6">
                <Shield size={40} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">Admin Security</h2>
              <p className="text-sm font-medium text-gray-400 mb-10">Lender access requires enterprise authentication.</p>
              
              <form onSubmit={handleLenderAuth} className="w-full space-y-6">
                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Access Key</label>
                  <input 
                    autoFocus
                    type="password"
                    required
                    value={lenderPassInput}
                    onChange={e => setLenderPassInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-center text-2xl tracking-[0.5em] focus:ring-4 focus:ring-gray-900/5 transition-all shadow-inner"
                  />
                </div>
                <button type="submit" className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  <span>Enter Vault</span>
                  <ArrowRight size={18} />
                </button>
              </form>
              
              <button 
                onClick={() => {
                  setUserRole(UserRole.BORROWER);
                  setLenderPassInput('');
                }}
                className="mt-8 text-[10px] font-black text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
              >
                Cancel and return to Borrower Hub
              </button>
            </div>
          </div>
        </div>
      ) : userRole === UserRole.BORROWER && !loggedInBorrowerId ? (
        /* SECURITY GATE: Borrower Authentication */
        <div className="fixed inset-0 z-[200] bg-[#1a1a1a] flex items-center justify-center p-6 overflow-hidden">
           <div className="absolute inset-0 opacity-[0.03] xhosa-pattern scale-150 rotate-12" />
           <div className="max-w-xl w-full bg-white rounded-[2.5rem] md:rounded-[40px] shadow-2xl relative animate-in fade-in zoom-in duration-500 overflow-hidden flex flex-col">
              <div className="bead-accent absolute top-0 left-0 w-full opacity-20" />
              
              <div className="p-8 md:p-12">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3 mb-6 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <UserCircle size={32} className="relative z-10" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none mb-4">
                    {language === Language.XH ? 'Uvimba Wababoleki' : 'Borrower Hub'}
                  </h2>
                  <p className="text-sm font-medium text-gray-400 max-w-xs">
                    {language === Language.XH 
                      ? 'Ngenisa iinkcukacha zakho ukuze uqhube.' 
                      : 'Access your community financial profile securely.'}
                  </p>
                </div>

                <div className="flex bg-gray-50 p-1 rounded-2xl mb-8 border border-gray-100">
                  <button 
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${authMode === 'login' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <LogIn size={14} /> {language === Language.XH ? 'Ngena' : 'Login'}
                  </button>
                  <button 
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${authMode === 'register' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <UserPlus size={14} /> {language === Language.XH ? 'Bhalisa' : 'Join Community'}
                  </button>
                </div>

                {authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                        {language === Language.XH ? 'Inombolo ye-ID' : 'ID Number'}
                      </label>
                      <div className="relative group">
                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                        <input 
                          required
                          value={loginId}
                          onChange={e => setLoginId(e.target.value)}
                          placeholder="e.g. 9201010001081"
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-4 font-black text-sm tracking-widest focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-5 bg-[#1a1a1a] text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                      <span>Secure Access</span>
                      <ArrowRight size={18} />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                        <input required value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-xs shadow-inner focus:ring-2 focus:ring-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">ID Number</label>
                        <input required value={regForm.id} onChange={e => setRegForm({...regForm, id: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-xs shadow-inner focus:ring-2 focus:ring-indigo-600" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Mobile Number</label>
                      <input required value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-xs shadow-inner focus:ring-2 focus:ring-indigo-600" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Physical Address</label>
                      <input required value={regForm.address} onChange={e => setRegForm({...regForm, address: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-xs shadow-inner focus:ring-2 focus:ring-indigo-600" />
                    </div>
                    <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 mt-2">
                      <span>Create Profile</span>
                      <ShieldCheck size={18} />
                    </button>
                  </form>
                )}

                <button 
                  onClick={() => setUserRole(UserRole.LENDER)}
                  className="w-full py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  {language === Language.XH ? 'Ulawulo lwe-Admin (Lender)' : 'Lender Admin Access'}
                </button>
              </div>
           </div>
        </div>
      ) : (
        <Layout 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          language={language} 
          setLanguage={setLanguage} 
          userRole={userRole} 
          toggleRole={toggleRole} 
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
                  <SummaryCard title={userRole === UserRole.LENDER ? (language === Language.EN ? 'Network Trust' : 'Intembeko') : "My Trust Score"} value={stats.score} icon={userRole === UserRole.LENDER ? Users : Zap} colorClass="bg-indigo-50 text-indigo-600" />
                </div>

                {userRole === UserRole.BORROWER && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
                    <div 
                      className="p-6 md:p-10 rounded-[2.5rem] md:rounded-[48px] text-white shadow-2xl relative overflow-hidden group min-h-[460px] md:min-h-[520px] flex flex-col justify-between transition-all duration-700 bg-cover bg-center"
                      style={{ backgroundImage: "url('https://westharlem.art/wp-content/uploads/2021/02/gum-front-page-website-2.jpg')" }}
                    >
                      <div className={`absolute inset-0 ${weather.overlay} backdrop-blur-[1px] transition-colors duration-700`} />
                      
                      <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="px-4 py-2 bg-black/30 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20 shadow-lg flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            <MapPin size={10} className="text-white/80" /> {currentBorrowerCity}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { icon: Thermometer, val: weather.temp, label: 'Temp' },
                            { icon: Wind, val: weather.wind, label: 'Wind' },
                            { icon: Droplets, val: weather.humidity, label: 'Humid' }
                          ].map((item, idx) => (
                            <div key={idx} className="bg-black/30 backdrop-blur-md rounded-3xl p-4 border border-white/10 hover:bg-black/40 transition-all">
                              <item.icon size={14} className="text-white/60 mb-2" />
                              <p className="text-sm font-black tracking-tight">{item.val}</p>
                              <p className="text-[8px] font-black uppercase tracking-widest text-white/60">{item.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-emerald-950 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg">
                            <Zap size={10} fill="currentColor" /> {weather.vibe}
                          </div>
                          <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] drop-shadow-2xl text-white">Unlock Your <br />Financial Flow</h3>
                        </div>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-emerald-950 w-full py-5 rounded-[28px] font-black text-xs md:text-sm uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-emerald-50 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group/btn overflow-hidden relative">
                           <span className="relative z-10">Start Fast Application</span>
                           <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform relative z-10" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[48px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card flex flex-col justify-between">
                      <div className="relative z-10">
                         <div className="flex items-center justify-between mb-8">
                           <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-[#1a1a1a] flex items-center justify-center text-white shadow-2xl rotate-3">
                             <UserCircle size={32} className="md:w-10 h-10" />
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rating</p>
                              {currentBorrowerAccount && (
                                <div className={`px-4 py-1.5 ${getScoreRating(currentBorrowerAccount.score).bg} ${getScoreRating(currentBorrowerAccount.score).color} rounded-full text-[10px] font-black uppercase tracking-widest border ${getScoreRating(currentBorrowerAccount.score).border}`}>
                                  {getScoreRating(currentBorrowerAccount.score).label} ({getScoreRating(currentBorrowerAccount.score).rating})
                                </div>
                              )}
                           </div>
                         </div>
                         <div className="space-y-2 mb-8">
                           <h3 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">Member Dashboard</h3>
                           <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.3em]">Trust Score: <span className="text-lg">{stats.score}</span> / 850</p>
                         </div>
                         <p className="text-xs md:text-sm text-gray-500 font-medium mb-10 leading-relaxed max-w-xs">Access your historical motif, adjust your payout preferences, and monitor your trust score in real-time.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 relative z-10">
                         <button onClick={() => setActiveTab('loans')} className="bg-gray-50 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-100 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"><History size={14} /> History</button>
                         <button onClick={() => setSelectedBorrowerId(loggedInBorrowerId)} className="bg-[#1a1a1a] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"><Eye size={14} /> Profile</button>
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
                        <ChevronRight onClick={() => setSelectedLoan(loan)} size={16} className="text-gray-300 group-active:text-indigo-600 cursor-pointer" />
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
                          <td className="px-8 py-6"><div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg rotate-1 inline-block uppercase tracking-tighter border border-white/20">{loan.id}</div></td>
                          <td className="px-8 py-6"><p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p></td>
                          <td className="px-8 py-6"><p className="font-black text-gray-900 text-sm">R {loan.amountLoaned.toLocaleString()}</p></td>
                          <td className="px-8 py-6 text-xs font-bold text-gray-600">{loan.dueDate}</td>
                          <td className="px-8 py-6"><p className="font-black text-indigo-600 font-mono text-sm">R {(loan.totalRepayment + calculatePenaltyDetails(loan).penalty).toLocaleString()}</p></td>
                          <td className="px-8 py-6"><StatusDot status={loan.status} showLabel /></td>
                          <td className="px-8 py-6 flex justify-center gap-2">
                            <button onClick={() => setSelectedLoan(loan)} className="p-3 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm"><Eye size={18} /></button>
                            {userRole === UserRole.LENDER && loan.status !== RepaymentStatus.PAID && (
                              <button onClick={() => handleMarkAsPaid(loan.id)} className="p-3 bg-white text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-gray-100 shadow-sm"><CheckCircle2 size={18} /></button>
                            )}
                          </td>
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
                  const rating = getScoreRating(borrower.score);
                  return (
                    <div key={borrower.idNumber} className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-6 md:mb-8 relative z-10">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[24px] bg-indigo-600 flex items-center justify-center font-black text-lg md:text-xl text-white shadow-lg">{borrower.name[0]}</div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={`px-4 py-2 rounded-2xl border font-black text-[12px] flex items-center gap-2 shadow-sm ${rating.bg} ${rating.color} ${rating.border} scale-110`}>
                            <rating.icon size={14} /><span className="opacity-60 uppercase tracking-tighter">TRUST:</span><span className="text-base">{borrower.score}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 md:space-y-6 relative z-10">
                        <div><h4 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-none">{borrower.name}</h4><div className={`${rating.bg} ${rating.color} px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${rating.border} mt-1 inline-block`}>{rating.label} Member</div></div>
                        <div className="space-y-1.5"><div className="flex justify-between items-center text-[8px] font-black text-gray-400 uppercase tracking-widest"><span>Risk (300)</span><span>Excellent (850)</span></div><div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ease-out ${rating.color.replace('text-', 'bg-')}`} style={{ width: `${((borrower.score - 300) / 550) * 100}%` }} /></div></div>
                        <div className="grid grid-cols-2 gap-3 md:gap-4"><div className="bg-gray-50/50 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100"><p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p><p className="text-xs md:text-sm font-black text-gray-900">{borrower.loans.length} Loans</p></div><div className="bg-gray-50/50 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100"><p className="text-[8px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Active</p><p className="text-xs md:text-sm font-black text-indigo-600">{borrower.loans.filter(l => l.status !== RepaymentStatus.PAID).length} Active</p></div></div>
                        <button onClick={() => setSelectedBorrowerId(borrower.idNumber)} className="w-full py-3.5 md:py-4 bg-[#1a1a1a] text-white rounded-xl md:rounded-[24px] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3"><Eye size={14} /> Profile Detail</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'calculator' && (
              <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Calculator size={32} /></div>
                  <div><h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Loan Planner</h2><p className="text-gray-500 font-medium">Financial growth projections for the community.</p></div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.principal}</label><span className="font-black text-2xl text-gray-900 font-mono">R {calcAmount.toLocaleString()}</span></div>
                      <input type="range" min="200" max="25000" step="100" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                      <div className="bg-[#1a1a1a] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 xhosa-pattern-sm opacity-5 pointer-events-none" />
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">{language === Language.EN ? 'Total Repayment' : 'Iyonke emayihlawulwe'}</p>
                        <p className="text-4xl font-black tracking-tighter leading-none mb-6">R {calcResults.total.toLocaleString()}</p>
                        <div className="flex justify-between items-center pt-6 border-t border-white/10">
                          <div><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Installment</p><p className="text-xl font-black text-indigo-400">R {calcResults.perInstallment.toLocaleString()}</p></div>
                          <div className="text-right"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Count</p><p className="text-xl font-black text-white">{calcResults.numInstallments}x</p></div>
                        </div>
                      </div>
                      <div className="space-y-4 justify-center flex flex-col">
                        <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-start gap-4">
                          <InfoIcon size={20} className="text-indigo-600 shrink-0 mt-1" />
                          <p className="text-xs text-indigo-900/70 font-medium leading-relaxed">
                            {language === Language.EN 
                              ? 'Repayment dates are projections based on today. Adjusting the frequency recalculated installments automatically.'
                              : 'Imihla yeentlawulo luqikelelo olusekwe namhlanje. Ukutshintsha i-frequency kuhlaziya isixa semali ngokuzenzekelayo.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Layout>
      )}

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-md" onClick={() => setSelectedLoan(null)} />
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] md:rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg rotate-1 uppercase tracking-tighter">{selectedLoan.id}</div>
                   <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{language === Language.EN ? 'Transaction Detail' : 'Iinkcukacha Zentengiselwano'}</h3>
                </div>
                <button onClick={() => setSelectedLoan(null)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-full transition-all"><X size={24} /></button>
             </div>
             <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-8">
                <div className="flex items-center gap-6"><div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-indigo-600 border border-gray-100"><UserCircle size={48} /></div><div><h4 className="text-2xl font-black text-gray-900 leading-none mb-2">{selectedLoan.borrowerName}</h4><div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-400 font-black uppercase tracking-widest"><span className="flex items-center gap-1"><Smartphone size={12} /> {selectedLoan.borrowerNumber}</span><span className="flex items-center gap-1"><Fingerprint size={12} /> {selectedLoan.idNumber}</span></div></div></div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4"><div className="bg-gray-50 p-5 rounded-3xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.principal}</p><p className="text-lg font-black text-gray-900">R {selectedLoan.amountLoaned.toLocaleString()}</p></div><div className="bg-gray-50 p-5 rounded-3xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.interest}</p><p className="text-lg font-black text-indigo-600">R {(selectedLoan.totalRepayment - selectedLoan.amountLoaned).toLocaleString()}</p></div><div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100 col-span-2 md:col-span-1 relative overflow-hidden"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">{t.totalDue}</p><p className="text-lg font-black text-indigo-600">R {(selectedLoan.totalRepayment + calculatePenaltyDetails(selectedLoan).penalty).toLocaleString()}</p></div></div>
             </div>
             <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-50 flex flex-wrap gap-4 justify-end">
                <button onClick={() => setSelectedLoan(null)} className="w-full md:w-auto px-8 py-3.5 bg-[#1a1a1a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all">Close Detail</button>
             </div>
          </div>
        </div>
      )}

      {/* Borrower Profile Modal */}
      {selectedBorrower && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-xl" onClick={() => setSelectedBorrowerId(null)} />
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] md:rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-40 bg-[#1a1a1a] p-8 flex items-end">
              <div className="absolute top-4 right-4"><button onClick={() => setSelectedBorrowerId(null)} className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all"><X size={24} /></button></div>
              <div className="flex items-center gap-6 translate-y-16">
                <div className="w-24 h-24 md:w-36 md:h-36 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl md:text-6xl font-black shadow-2xl border-4 border-white overflow-hidden relative group">{selectedBorrower.name[0]}</div>
                <div className="mb-2"><h3 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight">{selectedBorrower.name}</h3><div className={`px-3 py-1 rounded-full ${getScoreRating(selectedBorrower.score).bg} ${getScoreRating(selectedBorrower.score).color} text-[10px] font-black uppercase tracking-widest border ${getScoreRating(selectedBorrower.score).border} mt-1 inline-block`}>Verified {getScoreRating(selectedBorrower.score).label} Member</div></div>
              </div>
            </div>
            <div className="pt-24 md:pt-32 p-6 md:p-12 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="space-y-6"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Contact Details</h4><div className="space-y-4"><div className="flex items-center gap-3 text-sm font-bold text-gray-600"><Smartphone size={16} className="text-indigo-600" /> {selectedBorrower.phone}</div><div className="flex items-center gap-3 text-sm font-bold text-gray-600"><Home size={16} className="text-indigo-600" /> {selectedBorrower.address}</div><div className="flex items-center gap-3 text-sm font-bold text-gray-600"><Fingerprint size={16} className="text-indigo-600" /> {selectedBorrower.idNumber}</div></div></div>
                <div className="col-span-1 md:col-span-2 space-y-6"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Financial Motif</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group"><div className={`absolute top-0 right-0 p-4 opacity-10 ${getScoreRating(selectedBorrower.score).color}`}><Zap size={48} fill="currentColor" /></div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Trust Score</p><div className="flex items-baseline gap-2"><p className={`text-5xl font-black ${getScoreRating(selectedBorrower.score).color}`}>{selectedBorrower.score}</p><p className="text-gray-400 text-sm font-bold">/ 850</p></div></div><div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 flex flex-col justify-center"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Health</p><div className="space-y-4"><div className="flex justify-between items-center"><span className="text-sm font-bold text-gray-600">Total Loans</span><span className="text-xl font-black text-gray-900">{selectedBorrower.loans.length}</span></div><div className="flex justify-between items-center"><span className="text-sm font-bold text-rose-600">Overdue</span><span className="text-xl font-black text-rose-600">{selectedBorrower.loans.filter(l => l.status === RepaymentStatus.OVERDUE).length}</span></div></div></div></div></div>
              </div>
            </div>
            <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex justify-end gap-4"><button onClick={() => setSelectedBorrowerId(null)} className="px-8 py-4 bg-white border border-gray-100 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-all">Close Detail</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;