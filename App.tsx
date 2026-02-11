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
  Waves, Gauge, Star, ShieldAlert, UserPlus, Navigation, ToggleLeft, ToggleRight, Check, Globe, Languages, Building2, Briefcase, ArrowUpRight, CalendarClock, HelpCircle, MessageCircle
} from 'lucide-react';
import { 
  DEFAULT_INTEREST_RATE, 
  DEFAULT_PENALTY_RATE, 
  INITIAL_LOANS, 
  TRANSLATIONS 
} from './constants';

const LENDER_PASSWORD = 'imali-admin';

const EMPLOYMENT_STATUSES = [
  'Full-time',
  'Part-time',
  'Self-employed',
  'Contract',
  'Unemployed',
  'Student',
  'Retired'
];

const App: React.FC = () => {
  const [appLoading, setAppLoading] = useState(true);
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [userRole, setUserRole] = useState<UserRole>(UserRole.BORROWER); 
  const [isLenderAuthenticated, setIsLenderAuthenticated] = useState(false);
  const [lenderPassInput, setLenderPassInput] = useState('');
  const [lenderAuthError, setLenderAuthError] = useState(false);

  const [loggedInBorrowerId, setLoggedInBorrowerId] = useState<string | null>(null);
  
  const [showToast, setShowToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RepaymentStatus | 'All'>('All');

  // Deletion Confirmation States
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [borrowerToDelete, setBorrowerToDelete] = useState<{ idNumber: string, name: string } | null>(null);

  // Geolocation & City State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginId, setLoginId] = useState('');
  const [regForm, setRegForm] = useState({ name: '', id: '', phone: '', address: '' });
  
  const [currentWeather, setCurrentWeather] = useState<'sunny' | 'cloudy' | 'rainy'>('sunny');

  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('imali_loans_v1');
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [extraProfiles, setExtraProfiles] = useState<any[]>(() => {
    const saved = localStorage.getItem('imali_profiles_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // Settings State
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('imali_settings_v1');
    return saved ? JSON.parse(saved) : {
      overdueAlerts: true,
      whatsappAutomation: true,
      emailReports: false,
      emailNewAppAlerts: true,
      emailOverdueAlerts: true,
      darkMode: false
    };
  });

  // New Loan Form State
  const [newLoanForm, setNewLoanForm] = useState({
    borrowerName: '',
    idNumber: '',
    physicalAddress: '',
    borrowerNumber: '',
    employer: '',
    employmentStatus: 'Full-time',
    amountLoaned: 1000,
    dueDate: '',
    payoutMethod: PayoutMethod.MOBILE
  });

  useEffect(() => {
    localStorage.setItem('imali_profiles_v1', JSON.stringify(extraProfiles));
  }, [extraProfiles]);

  useEffect(() => {
    localStorage.setItem('imali_settings_v1', JSON.stringify(settings));
  }, [settings]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
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

  // Geolocation Effect
  useEffect(() => {
    if ("geolocation" in navigator && loggedInBorrowerId) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const data = await response.json();
            const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county;
            if (city) setDetectedCity(city);
          } catch (err) {
            console.error("Reverse geocoding failed", err);
          }
          
          setIsLocating(false);
        },
        (error) => {
          console.warn("Geolocation denied or unavailable:", error);
          setIsLocating(false);
        },
        { timeout: 10000 }
      );
    }
  }, [loggedInBorrowerId]);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(2500);
  const [calcInterest, setCalcInterest] = useState<number>(30);
  const [calcWeeks, setCalcWeeks] = useState<number>(4);
  const [calcFrequency, setCalcFrequency] = useState<'weekly' | 'fortnightly' | 'monthly'>('weekly');

  const calcResults = useMemo(() => {
    const interestAmount = Math.round(calcAmount * (calcInterest / 100));
    const total = calcAmount + interestAmount;
    let numInstallments = calcWeeks;
    if (calcFrequency === 'fortnightly') numInstallments = Math.max(1, Math.floor(calcWeeks / 2));
    if (calcFrequency === 'monthly') numInstallments = Math.max(1, Math.floor(calcWeeks / 4));
    
    const perInstallment = Math.round(total / numInstallments);
    return { interestAmount, total, perInstallment, numInstallments };
  }, [calcAmount, calcInterest, calcWeeks, calcFrequency]);

  useEffect(() => {
    const timer = setTimeout(() => { setAppLoading(false); }, 2800);
    return () => { clearTimeout(timer); };
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
      if (l.status === RepaymentStatus.PAID) score += 45;
      if (l.status === RepaymentStatus.OVERDUE) score -= 90;
      if (l.status === RepaymentStatus.DEFAULTED) score -= 250;
    });
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

  const handleLenderAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (lenderPassInput === LENDER_PASSWORD) {
      setIsLenderAuthenticated(true);
      setUserRole(UserRole.LENDER);
      setLenderAuthError(false);
      setLenderPassInput('');
      setLoggedInBorrowerId(null); // Clear borrower session when entering admin
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

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `T0${loans.length + 1}`;
    const interest = Math.round(newLoanForm.amountLoaned * (DEFAULT_INTEREST_RATE / 100));
    const newLoan: Loan = {
      id: newId,
      ...newLoanForm,
      interestRate: DEFAULT_INTEREST_RATE,
      penaltyRate: DEFAULT_PENALTY_RATE,
      totalRepayment: newLoanForm.amountLoaned + interest,
      startDate: new Date().toISOString().split('T')[0],
      status: RepaymentStatus.PENDING,
      applicationStatus: ApplicationStatus.SUBMITTED,
      history: [
        { date: new Date().toISOString().split('T')[0], action: 'Loan Application Submitted', amount: newLoanForm.amountLoaned }
      ]
    };
    setLoans(prev => [newLoan, ...prev]);
    setIsAddModalOpen(false);
    setShowToast(language === Language.XH ? 'Iakhawunti yemali ivuliwe!' : 'Loan account created successfully!');
    setTimeout(() => setShowToast(null), 3000);
    // Reset form
    setNewLoanForm({
      borrowerName: '',
      idNumber: '',
      physicalAddress: '',
      borrowerNumber: '',
      employer: '',
      employmentStatus: 'Full-time',
      amountLoaned: 1000,
      dueDate: '',
      payoutMethod: PayoutMethod.MOBILE
    });
  };

  const handleDeleteLoan = (loanId: string) => {
    setLoans(prev => prev.filter(l => l.id !== loanId));
    setLoanToDelete(null);
    setShowToast(language === Language.XH ? 'I-Loan icinyiwe!' : 'Loan record deleted!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleDeleteBorrower = (idNumber: string) => {
    setExtraProfiles(prev => prev.filter(p => p.idNumber !== idNumber));
    setLoans(prev => prev.filter(l => l.idNumber !== idNumber));
    setBorrowerToDelete(null);
    setSelectedBorrowerId(null);
    setShowToast(language === Language.XH ? 'Umboleki ucinyiwe!' : 'Borrower profile deleted!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleWhatsAppReminder = (loan: Loan) => {
    const penalty = calculatePenaltyDetails(loan).penalty;
    const total = loan.totalRepayment + penalty;
    const message = language === Language.XH 
      ? `Molo ${loan.borrowerName}, esi sisikhumbuzo se-imali yakho engu R${total.toLocaleString()} emayihlawulwe ngomhla ka ${loan.dueDate}. Enkosi!`
      : `Molo ${loan.borrowerName}, this is a friendly reminder for your imboleko of R${total.toLocaleString()} due on ${loan.dueDate}. Enkosi!`;
    
    // Clean phone number (remove spaces, ensure SA format)
    let phone = loan.borrowerNumber.replace(/\s+/g, '');
    if (phone.startsWith('0')) phone = '27' + phone.substring(1);
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
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
    
    const totalProfit = relevantLoans.reduce((acc, l) => {
      const interest = l.totalRepayment - l.amountLoaned;
      const penalty = calculatePenaltyDetails(l).penalty;
      return acc + interest + penalty;
    }, 0);

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const expectedInflow = relevantLoans.reduce((acc, l) => {
      if (l.status === RepaymentStatus.PAID) return acc;
      const dueDate = new Date(l.dueDate);
      if (dueDate >= today && dueDate <= nextWeek) {
        const penalty = calculatePenaltyDetails(l).penalty;
        return acc + l.totalRepayment + penalty;
      }
      return acc;
    }, 0);

    return { totalLoaned, repaymentRate, overdueCount, score, totalProfit, expectedInflow };
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

  const toggleRole = () => {
    if (userRole === UserRole.BORROWER) {
      setUserRole(UserRole.LENDER);
    } else {
      setLoggedInBorrowerId(null);
      setIsLenderAuthenticated(false);
      setUserRole(UserRole.BORROWER);
      setActiveTab('dashboard');
    }
  };

  const StatusDot = ({ status, showLabel = false, hasPenalty = false }: { status: RepaymentStatus, showLabel?: boolean, hasPenalty?: boolean }) => {
    const configs = {
      [RepaymentStatus.PAID]: { color: 'bg-emerald-500 ring-emerald-100', text: language === Language.XH ? 'Ihlawulwe' : 'Paid' },
      [RepaymentStatus.OVERDUE]: { color: 'bg-rose-500 ring-rose-100 animate-pulse', text: language === Language.XH ? 'Idlulile' : 'Overdue' },
      [RepaymentStatus.PENDING]: { color: 'bg-amber-500 ring-amber-100', text: language === Language.XH ? 'Isalindile' : 'Pending' },
      [RepaymentStatus.DEFAULTED]: { color: 'bg-gray-400 ring-gray-100', text: language === Language.XH ? 'Ayihlawulwanga' : 'Defaulted' },
    };
    const current = configs[status];
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`w-3.5 h-3.5 rounded-full ${current.color} ring-4`} />
          {hasPenalty && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full border border-white animate-bounce" />
          )}
        </div>
        {showLabel && (
           <div className="flex items-center gap-1.5">
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{current.text}</span>
             {hasPenalty && (
               <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 shadow-sm border border-amber-200">
                 <AlertTriangle size={8} className="animate-pulse" /> Penalty
               </span>
             )}
           </div>
        )}
      </div>
    );
  };

  const SummaryCard = ({ title, value, icon: Icon, colorClass, action, isUrgent, secondaryValue }: any) => (
    <div className="bg-white p-5 md:p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 p-1 opacity-5 xhosa-pattern-sm" />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex flex-col">
          <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${isUrgent ? 'text-rose-600' : 'text-gray-400'}`}>{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{value}</p>
            {secondaryValue && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{secondaryValue}</span>}
          </div>
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

  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setShowToast(t.updateSuccess);
    setTimeout(() => setShowToast(null), 2000);
  };

  const SettingRow = ({ title, description, icon: Icon, active, onToggle }: any) => (
    <div className="flex items-center justify-between p-6 bg-white rounded-[24px] border border-gray-100 shadow-sm group hover:border-indigo-100 transition-all">
      <div className="flex items-start gap-5">
        <div className={`p-3 rounded-2xl ${active ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'} group-hover:scale-110 transition-transform`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h4>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{description}</p>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`w-14 h-8 rounded-full p-1 transition-all duration-300 relative ${active ? 'bg-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.3)]' : 'bg-gray-100'}`}
      >
        <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${active ? 'translate-x-6' : 'translate-x-0'}`}>
           {active && <Check size={12} className="text-indigo-600" />}
        </div>
      </button>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
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
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-center text-2xl tracking-[0.5em] focus:ring-4 focus:ring-gray-900/5 transition-all shadow-inner text-gray-900"
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
        <div className="fixed inset-0 z-[200] bg-white flex flex-col overflow-hidden">
           {/* Clipped Background Container to prevent horizontal scroll */}
           <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute inset-0 opacity-[0.03] xhosa-pattern scale-150 rotate-12" />
           </div>
           
           <div className="flex flex-col h-full w-full relative animate-in fade-in duration-500">
              <div className="bead-accent w-full h-6 flex-shrink-0" />
              
              {/* Scrollable Content Wrapper */}
              <div className="flex-grow overflow-y-auto flex flex-col items-center custom-scrollbar">
                <div className="w-full max-w-xl flex-grow flex flex-col items-center">
                  <div className="flex flex-col items-center text-center mb-10 px-6 mt-10">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3 mb-6 relative group overflow-hidden">
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Wallet size={32} className="relative z-10" />
                    </div>
                    <h1 className="text-6xl font-black text-indigo-600 tracking-tighter uppercase mb-1 drop-shadow-sm">imali</h1>
                    <p className="text-[11px] text-indigo-400 font-black uppercase tracking-[0.3em] mb-8 drop-shadow-sm">Micro-Lending</p>
                    
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-4">
                      {language === Language.XH ? 'Uvimba Wababoleki' : 'Borrower Hub'}
                    </h2>
                    <p className="text-sm font-medium text-gray-500 max-w-xs md:max-w-sm">
                      {language === Language.XH 
                        ? 'Ngenisa iinkcukacha zakho ukuze uqhube ukhuseleke.' 
                        : 'Access your secure community financial profile.'}
                    </p>
                  </div>

                  {/* Flush Buttons */}
                  <div className="w-full flex bg-gray-100 p-1.5 rounded-none mb-10 border-y border-gray-200 flex-shrink-0">
                    <button onClick={() => setAuthMode('login')} className={`flex-1 py-5 text-[11px] font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white shadow-lg text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><LogIn size={16} className="inline mr-2" /> {language === Language.XH ? 'Ngena' : 'Login'}</button>
                    <button onClick={() => setAuthMode('register')} className={`flex-1 py-5 text-[11px] font-black uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-white shadow-lg text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><UserPlus size={16} className="inline mr-2" /> {language === Language.XH ? 'Bhalisa' : 'Join'}</button>
                  </div>

                  <div className="w-full px-6 flex-grow">
                    {authMode === 'login' ? (
                      <form onSubmit={handleLogin} className="space-y-8 pb-10">
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">{language === Language.XH ? 'Inombolo ye-ID' : 'ID Number'}</label>
                          <div className="relative group">
                            <Fingerprint className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={24} />
                            <input required value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="920101XXXX081" className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-8 py-5 font-black text-base tracking-widest focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner text-gray-900" />
                          </div>
                        </div>
                        <button type="submit" className="w-full py-6 bg-[#1a1a1a] text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-4"><span>Secure Access</span><ArrowRight size={20} /></button>
                      </form>
                    ) : (
                      <form onSubmit={handleRegister} className="space-y-6 pb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label><input required value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" /></div>
                          <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ID Number</label><input required value={regForm.id} onChange={e => setRegForm({...regForm, id: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" /></div>
                        </div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mobile Number</label><input required value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" /></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Physical Address</label><input required value={regForm.address} onChange={e => setRegForm({...regForm, address: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" /></div>
                        <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 mt-4"><span>Create Profile</span><ShieldCheck size={20} /></button>
                      </form>
                    )}
                  </div>

                  <div className="mt-4 mb-12 flex flex-col items-center gap-4 flex-shrink-0">
                    <button onClick={() => setUserRole(UserRole.LENDER)} className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-indigo-600 transition-colors py-4 px-8 rounded-full border border-transparent hover:border-gray-100">{language === Language.XH ? 'Ulawulo lwe-Admin (Lender)' : 'Lender Admin Access'}</button>
                  </div>
                </div>
              </div>
              
              <div className="bead-accent w-full h-6 opacity-40 flex-shrink-0" />
           </div>
        </div>
      ) : (
        <Layout 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          language={language} setLanguage={setLanguage} 
          userRole={userRole} toggleRole={toggleRole} 
          onRefresh={handleRefresh} userName={currentBorrowerAccount?.name}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
                  <SummaryCard title={userRole === UserRole.LENDER ? t.totalLoaned : "My Total Borrowed"} value={`R ${stats.totalLoaned.toLocaleString()}`} icon={Wallet} colorClass="bg-indigo-50 text-indigo-600" />
                  
                  {userRole === UserRole.LENDER && (
                    <>
                      <SummaryCard 
                        title={language === Language.XH ? "Inzala iyonke" : "Total Profit"} 
                        value={`R ${stats.totalProfit.toLocaleString()}`} 
                        icon={ArrowUpRight} 
                        colorClass="bg-emerald-50 text-emerald-600"
                        secondaryValue="Expected"
                      />
                      <SummaryCard 
                        title={language === Language.XH ? "Imali Engenayo (7 Days)" : "Expected Inflow"} 
                        value={`R ${stats.expectedInflow.toLocaleString()}`} 
                        icon={CalendarClock} 
                        colorClass="bg-indigo-50 text-indigo-600"
                        secondaryValue="Next 7 Days"
                      />
                    </>
                  )}

                  <SummaryCard title={userRole === UserRole.LENDER ? t.repaymentRate : "My Repayment Rate"} value={`${stats.repaymentRate.toFixed(1)}%`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" />
                  <SummaryCard title={userRole === UserRole.LENDER ? t.overdue : "Pending Dues"} value={stats.overdueCount} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" isUrgent={stats.overdueCount > 0} action={userRole === UserRole.LENDER && stats.overdueCount > 0 ? () => handleSendNotifications() : null} />
                  <SummaryCard title={userRole === UserRole.LENDER ? (language === Language.EN ? 'Network Trust' : 'Intembeko') : "My Trust Score"} value={stats.score} icon={userRole === UserRole.LENDER ? Users : Zap} colorClass="bg-indigo-50 text-indigo-600" />
                </div>

                {userRole === UserRole.BORROWER && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
                    <div 
                      className="p-6 md:p-10 rounded-[2.5rem] md:rounded-[48px] text-white shadow-2xl relative overflow-hidden group min-h-[460px] md:min-h-[520px] flex flex-col justify-between transition-all duration-700 bg-cover bg-center"
                      style={{ backgroundImage: "url('https://westharlem.art/wp-content/uploads/2021/02/gum-front-page-website-2.jpg')" }}
                    >
                      <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-[1px] transition-colors duration-700" />
                      
                      <div className="relative z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                          <div className="px-4 py-2 bg-black/30 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/20 shadow-lg flex items-center gap-2.5 overflow-hidden">
                            {detectedCity ? (
                              <>
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                <Navigation size={10} className="text-white/80" /> 
                                <span className="truncate max-w-[140px] font-black">{detectedCity} (Live)</span>
                              </>
                            ) : (
                              <>
                                <div className={`w-2 h-2 rounded-full ${isLocating ? 'bg-amber-400 animate-spin' : 'bg-gray-400'}`} />
                                <MapPin size={10} className="text-white/80" /> 
                                {isLocating ? 'Locating...' : 'East London'}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { icon: Thermometer, val: '24°', label: 'Temp' },
                            { icon: Wind, val: '12km/h', label: 'Wind' },
                            { icon: Droplets, val: '42%', label: 'Humid' }
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
                            <Zap size={10} fill="currentColor" /> High Growth Potential
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
                           <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-[#1a1a1a] flex items-center justify-center text-white shadow-2xl rotate-3"><UserCircle size={32} className="md:w-10 h-10" /></div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rating</p>
                              {currentBorrowerAccount && (
                                <div className={`px-4 py-1.5 ${getScoreRating(currentBorrowerAccount.score).bg} ${getScoreRating(currentBorrowerAccount.score).color} rounded-full text-[10px] font-black uppercase tracking-widest border ${getScoreRating(currentBorrowerAccount.score).border}`}>{getScoreRating(currentBorrowerAccount.score).label} ({getScoreRating(currentBorrowerAccount.score).rating})</div>
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
                     <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.search} className="w-full pl-12 pr-6 py-3 bg-white border-none rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium shadow-sm text-gray-900" />
                   </div>
                   <div className="flex flex-wrap gap-2">
                     <button onClick={() => setIsAddModalOpen(true)} className="flex-1 md:flex-none bg-[#1a1a1a] text-white px-6 md:px-8 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2"><Plus size={18} /> {userRole === UserRole.LENDER ? 'New Account' : 'Request Loan'}</button>
                   </div>
                </div>
                
                <div className="md:hidden divide-y divide-gray-50">
                  {filteredAndSortedLoans.map((loan) => {
                    const penaltyInfo = calculatePenaltyDetails(loan);
                    return (
                      <div key={loan.id} className="p-6 active:bg-gray-50 transition-colors flex justify-between items-center group">
                        <div onClick={() => setSelectedLoan(loan)} className="space-y-2 flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm">{loan.id}</div>
                            {penaltyInfo.penalty > 0 && (
                              <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </div>
                            )}
                            <StatusDot status={loan.status} hasPenalty={penaltyInfo.penalty > 0} />
                          </div>
                          <p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p>
                          <p className="text-[10px] font-bold text-gray-400 font-mono">DUE: {loan.dueDate}</p>
                          <div className="mt-1 flex items-center gap-2">
                             <p className="text-[10px] font-black text-indigo-600">TOTAL DUE: R {(loan.totalRepayment + penaltyInfo.penalty).toLocaleString()}</p>
                             {penaltyInfo.penalty > 0 && (
                               <span className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                 <AlertTriangle size={8} /> Penalty Applied
                               </span>
                             )}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-4">
                          <p className="text-sm font-black text-gray-900">R {loan.amountLoaned.toLocaleString()}</p>
                          <div className="flex gap-2 items-center">
                            {userRole === UserRole.LENDER && loan.status !== RepaymentStatus.PAID && (
                              <button onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(loan.id); }} className="p-2.5 bg-white text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-gray-100 shadow-sm" aria-label="Mark as Paid">
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {userRole === UserRole.LENDER && (
                              <button onClick={(e) => { e.stopPropagation(); handleWhatsAppReminder(loan); }} className="p-2.5 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm" aria-label="Send WhatsApp Reminder">
                                <MessageCircle size={16} />
                              </button>
                            )}
                            {userRole === UserRole.LENDER && (
                              <button onClick={(e) => { e.stopPropagation(); setLoanToDelete(loan); }} className="p-2.5 bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-gray-100 shadow-sm" aria-label="Delete Loan">
                                <Trash2 size={16} />
                              </button>
                            )}
                            <ChevronRight onClick={() => setSelectedLoan(loan)} size={16} className="text-gray-300 group-active:text-indigo-600 cursor-pointer" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto relative z-10 custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                      <tr>
                        <th className="px-8 py-5">Transaction ID</th>
                        <th className="px-8 py-5">Borrower Name</th>
                        <th className="px-8 py-5">Borrower Number</th>
                        <th className="px-8 py-5">Amount Loaned</th>
                        <th className="px-8 py-5">Due Date</th>
                        <th className="px-8 py-5 bg-indigo-50/50 text-indigo-600">Total Amount Due</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAndSortedLoans.map((loan) => {
                        const penaltyInfo = calculatePenaltyDetails(loan);
                        return (
                          <tr key={loan.id} className="hover:bg-gray-50/80 transition-all">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg rotate-1 inline-block uppercase tracking-tighter border border-white/20">
                                  {loan.id}
                                </div>
                                {penaltyInfo.penalty > 0 && (
                                  <div className="relative flex h-3 w-3" title="Penalty Active">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-white"></span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p>
                                  {penaltyInfo.penalty > 0 && (
                                    <span className="bg-amber-100 text-amber-600 text-[7px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-tighter border border-amber-200">
                                      <AlertTriangle size={8} /> Penalty
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6"><p className="font-bold text-gray-500 text-xs font-mono">{loan.borrowerNumber}</p></td>
                            <td className="px-8 py-6"><p className="font-black text-gray-900 text-sm">R {loan.amountLoaned.toLocaleString()}</p></td>
                            <td className="px-8 py-6 text-xs font-bold text-gray-600">{loan.dueDate}</td>
                            <td className="px-8 py-6 bg-indigo-50/30">
                              <div className="flex flex-col">
                                <p className="font-black text-indigo-700 font-mono text-base">R {(loan.totalRepayment + penaltyInfo.penalty).toLocaleString()}</p>
                                {penaltyInfo.penalty > 0 ? (
                                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter flex items-center gap-1">
                                    <AlertTriangle size={8} /> R{loan.amountLoaned} + R{loan.totalRepayment - loan.amountLoaned} Int + R{penaltyInfo.penalty} Pen
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                    R{loan.amountLoaned} + R{loan.totalRepayment - loan.amountLoaned} Int
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <StatusDot status={loan.status} showLabel hasPenalty={penaltyInfo.penalty > 0} />
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => setSelectedLoan(loan)} 
                                  className="p-3 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm flex items-center justify-center" 
                                  title="View Details"
                                >
                                  <Eye size={18} />
                                </button>
                                {userRole === UserRole.LENDER && (
                                  <button 
                                    onClick={() => handleWhatsAppReminder(loan)} 
                                    className="p-3 bg-white text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm flex items-center justify-center" 
                                    title="WhatsApp Reminder"
                                  >
                                    <MessageCircle size={18} />
                                  </button>
                                )}
                                {userRole === UserRole.LENDER && loan.status !== RepaymentStatus.PAID && (
                                  <button 
                                    onClick={() => handleMarkAsPaid(loan.id)} 
                                    className="p-3 bg-white text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-gray-100 shadow-sm flex items-center justify-center" 
                                    title="Mark as Paid"
                                  >
                                    <Check size={18} />
                                  </button>
                                )}
                                {userRole === UserRole.LENDER && (
                                  <button 
                                    onClick={() => setLoanToDelete(loan)} 
                                    className="p-3 bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-gray-100 shadow-sm flex items-center justify-center" 
                                    title="Delete Transaction"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
                          <div className={`px-4 py-2 rounded-2xl border font-black text-[12px] flex items-center gap-2 shadow-sm ${rating.bg} ${rating.color} ${rating.border} scale-110`}><rating.icon size={14} /><span className="opacity-60 uppercase tracking-tighter">TRUST:</span><span className="text-base">{borrower.score}</span></div>
                          <button onClick={() => setBorrowerToDelete(borrower)} className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
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
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-end"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount to Borrow</label><span className="font-black text-2xl text-gray-900 font-mono">R {calcAmount.toLocaleString()}</span></div>
                          <input type="range" min="200" max="25000" step="100" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-end"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Interest Rate</label><span className="font-black text-xl text-gray-900 font-mono">{calcInterest}%</span></div>
                          <input type="range" min="0" max="60" step="5" value={calcInterest} onChange={e => setCalcInterest(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-end"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration (Weeks)</label><span className="font-black text-xl text-gray-900 font-mono">{calcWeeks} Weeks</span></div>
                          <input type="range" min="1" max="24" step="1" value={calcWeeks} onChange={e => setCalcWeeks(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Repayment Frequency</label>
                          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                            {(['weekly', 'fortnightly', 'monthly'] as const).map(f => (
                              <button key={f} onClick={() => setCalcFrequency(f)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${calcFrequency === f ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#1a1a1a] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute inset-0 xhosa-pattern-sm opacity-5 pointer-events-none" />
                        <div className="relative z-10">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">{language === Language.EN ? 'Total Repayment' : 'Iyonke emayihlawulwe'}</p>
                          <p className="text-5xl font-black tracking-tighter leading-none mb-6">R {calcResults.total.toLocaleString()}</p>
                          
                          <div className="grid grid-cols-2 gap-4 mt-10">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Interest</p>
                               <p className="text-xl font-black text-indigo-400">R {calcResults.interestAmount.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Installments</p>
                               <p className="text-xl font-black text-white">{calcResults.numInstallments}x</p>
                            </div>
                          </div>
                        </div>

                        <div className="relative z-10 pt-8 border-t border-white/10 mt-8 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Installment Amount</p>
                            <p className="text-2xl font-black text-indigo-400">R {calcResults.perInstallment.toLocaleString()}</p>
                          </div>
                          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg rotate-3">
                            <ArrowRight size={20} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && userRole === UserRole.LENDER && (
              <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Settings size={32} /></div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">System Motifs</h2>
                    <p className="text-gray-500 font-medium">Configure operational triggers and communication alerts.</p>
                  </div>
                </div>

                <div className="space-y-12">
                   <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                        <Zap size={16} className="text-indigo-600" />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Operational Automation</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <SettingRow 
                          title={t.prefOverdueAlerts} 
                          description={t.prefOverdueDesc} 
                          icon={AlertCircle} 
                          active={settings.overdueAlerts} 
                          onToggle={() => toggleSetting('overdueAlerts')} 
                        />
                        <SettingRow 
                          title={t.prefSMSAuto} 
                          description={t.prefSMSDesc} 
                          icon={Smartphone} 
                          active={settings.whatsappAutomation} 
                          onToggle={() => toggleSetting('whatsappAutomation')} 
                        />
                      </div>
                   </section>

                   <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                        <Mail size={16} className="text-indigo-600" />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Communication Protocols</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <SettingRow 
                          title={t.prefReports} 
                          description={t.prefReportsDesc} 
                          icon={ReceiptText} 
                          active={settings.emailReports} 
                          onToggle={() => toggleSetting('emailReports')} 
                        />
                        <SettingRow 
                          title={t.prefEmailNewApp} 
                          description={t.prefEmailNewAppDesc} 
                          icon={MailIcon} 
                          active={settings.emailNewAppAlerts} 
                          onToggle={() => toggleSetting('emailNewAppAlerts')} 
                        />
                        <SettingRow 
                          title={t.prefEmailOverdue} 
                          description={t.prefEmailOverdueDesc} 
                          icon={AlertTriangle} 
                          active={settings.emailOverdueAlerts} 
                          onToggle={() => toggleSetting('emailOverdueAlerts')} 
                        />
                      </div>
                   </section>
                </div>
              </div>
            )}
          </div>
        </Layout>
      )}

      {/* Confirmation Modals */}
      {(loanToDelete || borrowerToDelete) && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm" onClick={() => { setLoanToDelete(null); setBorrowerToDelete(null); }} />
           <div className="bg-white max-w-sm w-full rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-gray-100 flex flex-col items-center text-center overflow-hidden">
             <div className="absolute inset-0 opacity-[0.03] xhosa-pattern-sm pointer-events-none" />
             <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-rose-100">
                <AlertTriangle size={32} />
             </div>
             <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Are you sure?</h3>
             <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
               {loanToDelete 
                 ? `This will permanently delete Loan Account ${loanToDelete.id} for ${loanToDelete.borrowerName}. This action cannot be reversed.`
                 : `This will permanently delete ${borrowerToDelete?.name}'s profile and ALL associated loans. This action cannot be reversed.`}
             </p>
             <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => { setLoanToDelete(null); setBorrowerToDelete(null); }}
                  className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => loanToDelete ? handleDeleteLoan(loanToDelete.id) : handleDeleteBorrower(borrowerToDelete!.idNumber)}
                  className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Delete
                </button>
             </div>
           </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
          <form onSubmit={handleCreateLoan} className="bg-white w-full max-w-4xl rounded-[2.5rem] md:rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
             <div className="p-6 md:p-8 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-20">
                <div className="flex items-center gap-3">
                   <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg"><Plus size={24} /></div>
                   <div>
                     <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Create Loan Account</h3>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">New commitment registration</p>
                   </div>
                </div>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 rounded-full transition-all"><X size={24} /></button>
             </div>
             
             <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar space-y-10">
                {/* Personal Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <UserCircle size={16} className="text-indigo-600" />
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Borrower Personal Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Borrower Full Name</label>
                      <input required value={newLoanForm.borrowerName} onChange={e => setNewLoanForm({...newLoanForm, borrowerName: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" placeholder="e.g. Sipho Mntungwa" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ID Number</label>
                      <input required value={newLoanForm.idNumber} onChange={e => setNewLoanForm({...newLoanForm, idNumber: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" placeholder="920101XXXX081" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Physical Address</label>
                      <input required value={newLoanForm.physicalAddress} onChange={e => setNewLoanForm({...newLoanForm, physicalAddress: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" placeholder="Street, Suburb, City" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mobile Number</label>
                      <input required value={newLoanForm.borrowerNumber} onChange={e => setNewLoanForm({...newLoanForm, borrowerNumber: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" placeholder="071 000 0000" />
                    </div>
                  </div>
                </section>

                {/* Employment Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <Building2 size={16} className="text-indigo-600" />
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Work & Stability Details</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Employer Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input required value={newLoanForm.employer} onChange={e => setNewLoanForm({...newLoanForm, employer: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" placeholder="Company or Organization" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Employment Status</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <select 
                          required 
                          value={newLoanForm.employmentStatus} 
                          onChange={e => setNewLoanForm({...newLoanForm, employmentStatus: e.target.value})} 
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900 appearance-none"
                        >
                          {EMPLOYMENT_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 rotate-90 pointer-events-none" size={18} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Financial Section */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                    <Wallet size={16} className="text-indigo-600" />
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Financial Terms</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Principal Amount (R)</label>
                      <input type="number" required value={newLoanForm.amountLoaned} onChange={e => setNewLoanForm({...newLoanForm, amountLoaned: Number(e.target.value)})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-black text-lg shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Due Date</label>
                      <input type="date" required value={newLoanForm.dueDate} onChange={e => setNewLoanForm({...newLoanForm, dueDate: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Payout Method</label>
                      <select required value={newLoanForm.payoutMethod} onChange={e => setNewLoanForm({...newLoanForm, payoutMethod: e.target.value as PayoutMethod})} className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-600 text-gray-900 appearance-none">
                        <option value={PayoutMethod.MOBILE}>{PayoutMethod.MOBILE}</option>
                        <option value={PayoutMethod.BANK}>{PayoutMethod.BANK}</option>
                      </select>
                    </div>
                  </div>
                </section>
             </div>
             
             <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-50 flex flex-wrap gap-4 justify-end">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-8 py-4 bg-white border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-all">Cancel</button>
                <button type="submit" className="px-10 py-4 bg-[#1a1a1a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center gap-3">
                  <Save size={16} /> Save Loan Account
                </button>
             </div>
          </form>
        </div>
      )}

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
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Financial Breakdown</h5>
                    <HelpCircle size={14} className="text-gray-300 hover:text-indigo-600 cursor-help transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.principal}</p>
                      <p className="text-lg font-black text-gray-900">R {selectedLoan.amountLoaned.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex flex-col justify-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.interest}</p>
                      <p className="text-lg font-black text-indigo-600">R {(selectedLoan.totalRepayment - selectedLoan.amountLoaned).toLocaleString()}</p>
                    </div>
                    {calculatePenaltyDetails(selectedLoan).penalty > 0 && (
                      <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute -right-2 -top-2 opacity-5 group-hover:rotate-12 transition-transform"><AlertTriangle size={48} /></div>
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Penalties</p>
                        <p className="text-lg font-black text-rose-600">R {calculatePenaltyDetails(selectedLoan).penalty.toLocaleString()}</p>
                        <p className="text-[8px] font-bold text-rose-400 uppercase mt-0.5">{calculatePenaltyDetails(selectedLoan).weeks} Weeks Overdue</p>
                      </div>
                    )}
                    <div className={`p-5 rounded-3xl border flex flex-col justify-center relative overflow-hidden ${calculatePenaltyDetails(selectedLoan).penalty > 0 ? 'bg-indigo-600 text-white border-indigo-700 shadow-xl md:col-span-1 col-span-2' : 'bg-indigo-50 border-indigo-100 text-indigo-600 md:col-span-2 col-span-2'}`}>
                      <div className="absolute inset-0 xhosa-pattern-sm opacity-[0.05]" />
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${calculatePenaltyDetails(selectedLoan).penalty > 0 ? 'text-indigo-200' : 'text-indigo-400'}`}>{t.totalDue}</p>
                      <p className="text-2xl font-black font-mono">R {(selectedLoan.totalRepayment + calculatePenaltyDetails(selectedLoan).penalty).toLocaleString()}</p>
                    </div>
                  </div>

                  {calculatePenaltyDetails(selectedLoan).penalty > 0 && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4 mt-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Info size={18} /></div>
                      <div>
                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Penalty Calculation Logic</p>
                        <p className="text-xs font-medium text-amber-700 leading-relaxed">
                          A penalty of <span className="font-bold">{selectedLoan.penaltyRate}%</span> of the principal (<span className="font-bold">R{selectedLoan.amountLoaned}</span>) is applied for every week overdue. 
                          This loan is <span className="font-bold">{calculatePenaltyDetails(selectedLoan).weeks} week(s)</span> late, resulting in <span className="font-bold">R{calculatePenaltyDetails(selectedLoan).penalty}</span> added to the balance.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                   <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2">Timeline Details</h5>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <Calendar size={18} className="text-indigo-600" />
                         <div><p className="text-[8px] font-black text-gray-400 uppercase">Started</p><p className="text-xs font-black text-gray-700">{selectedLoan.startDate}</p></div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <Clock size={18} className="text-indigo-600" />
                         <div><p className="text-[8px] font-black text-gray-400 uppercase">Due Date</p><p className="text-xs font-black text-gray-700">{selectedLoan.dueDate}</p></div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-50 flex flex-wrap gap-4 justify-end">
               {userRole === UserRole.LENDER && selectedLoan.status !== RepaymentStatus.PAID && (
                 <button 
                   onClick={() => { handleMarkAsPaid(selectedLoan.id); setSelectedLoan(null); }} 
                   className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                 >
                   <CheckCircle2 size={16} /> Mark as Paid
                 </button>
               )}
               <button onClick={() => setSelectedLoan(null)} className="flex-1 md:flex-none px-10 py-4 bg-[#1a1a1a] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all">Close Details</button>
             </div>
          </div>
        </div>
      )}

      {selectedBorrower && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-gray-950/40 backdrop-blur-xl" onClick={() => setSelectedBorrowerId(null)} />
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] md:rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header Section */}
            <div className="relative w-full h-40 bg-[#1a1a1a] p-8 flex items-start justify-end flex-shrink-0">
              <div className="absolute inset-0 opacity-[0.05] xhosa-pattern pointer-events-none" />
              <button 
                onClick={() => setSelectedBorrowerId(null)} 
                className="p-3 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all z-20 backdrop-blur-md border border-white/5"
              >
                <X size={24} />
              </button>
              
              {/* Profile Picture Overlap */}
              <div className="absolute left-8 bottom-0 translate-y-1/2 flex items-end gap-6 z-30">
                <div className="w-24 h-24 md:w-36 md:h-36 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl md:text-6xl font-black shadow-2xl border-4 border-white overflow-hidden relative group">
                  {selectedBorrower.name[0]}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="pt-16 md:pt-24 p-6 md:p-12 overflow-y-auto custom-scrollbar flex-grow">
              {/* Profile Identity Details (Moved below picture) */}
              <div className="mb-10">
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight leading-none mb-3">
                  {selectedBorrower.name}
                </h3>
                <div className={`px-3 py-1.5 rounded-full ${getScoreRating(selectedBorrower.score).bg} ${getScoreRating(selectedBorrower.score).color} text-[10px] font-black uppercase tracking-widest border ${getScoreRating(selectedBorrower.score).border} inline-flex items-center gap-2 shadow-sm`}>
                  <ShieldCheck size={12} /> Verified {getScoreRating(selectedBorrower.score).label} Member
                </div>
              </div>

              {/* Prominent Contact Bar */}
              <div className="flex flex-wrap items-center gap-6 p-5 bg-gray-50 rounded-[32px] border border-gray-100 mb-10 shadow-sm relative overflow-hidden group">
                <div className="absolute inset-0 xhosa-pattern-sm opacity-[0.03] pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                    <Smartphone size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Primary Mobile</p>
                    <p className="text-base font-black text-gray-900 tracking-tight">{selectedBorrower.phone}</p>
                  </div>
                </div>
                <div className="h-10 w-px bg-gray-200 hidden sm:block mx-2" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                    <MailIcon size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email Address</p>
                    <p className="text-base font-black text-gray-900 tracking-tight lowercase">{selectedBorrower.email}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2">Verification Info</h4>
                  <div className="space-y-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 rounded-xl"><Home size={18} className="text-indigo-600" /></div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Physical Address</p>
                        <p className="text-xs font-bold text-gray-600 leading-relaxed">{selectedBorrower.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-indigo-50 rounded-xl"><Fingerprint size={18} className="text-indigo-600" /></div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">National Identity</p>
                        <p className="text-xs font-bold text-gray-600 font-mono tracking-wider">{selectedBorrower.idNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2">Financial Motif</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group shadow-sm">
                      <div className={`absolute top-0 right-0 p-4 opacity-10 ${getScoreRating(selectedBorrower.score).color}`}><Zap size={48} fill="currentColor" /></div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Trust Score</p>
                      <div className="flex items-baseline gap-2">
                        <p className={`text-5xl font-black ${getScoreRating(selectedBorrower.score).color}`}>{selectedBorrower.score}</p>
                        <p className="text-gray-400 text-sm font-bold">/ 850</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 flex flex-col justify-center shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Account Health</p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Active</span>
                          <span className="text-xl font-black text-gray-900">{selectedBorrower.loans.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-rose-50 p-3 rounded-2xl border border-rose-100">
                          <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">Overdue</span>
                          <span className="text-xl font-black text-rose-600">{selectedBorrower.loans.filter(l => l.status === RepaymentStatus.OVERDUE).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex justify-between gap-4 flex-shrink-0">
              {userRole === UserRole.LENDER && (
                <button 
                  onClick={() => setBorrowerToDelete({ idNumber: selectedBorrower.idNumber, name: selectedBorrower.name })}
                  className="px-8 py-4 bg-rose-50 text-rose-600 rounded-[24px] text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-2"
                >
                  <Trash2 size={14} /> Delete Profile
                </button>
              )}
              <button 
                onClick={() => setSelectedBorrowerId(null)} 
                className="px-10 py-4 bg-white border border-gray-100 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all ml-auto"
              >
                Close Profile View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;