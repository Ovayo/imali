
import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loan, RepaymentStatus, PayoutMethod, Language, UserSettings, UserRole, ApplicationStatus, LoanTemplate, ChatMessage } from './types';
import { 
  TrendingUp, AlertCircle, CheckCircle2, Clock, Plus, Phone, CreditCard,
  ChevronRight, Sparkles, History, Info, X, Check, User, MapPin, Fingerprint,
  Send, Building2, Smartphone, ShieldCheck, Bell, Mail, Save, Search, Filter,
  Tag, Globe, ExternalLink, Users, Activity, LogOut, ArrowRight,
  Wallet, Briefcase, Calendar, ChevronLeft, Shield, Edit2, MessageCircle, MessageSquare, Loader2, ChevronDown, ChevronUp, Calculator as CalcIcon, ClipboardCheck, XCircle, Eye, ArrowUpDown, ArrowLeftRight, Lock, HelpCircle, Download, Trash2, AlertTriangle, PiggyBank, BarChart3, PieChart as PieIcon, ListChecks, Printer
} from 'lucide-react';
import { getCreditRiskInsights, getChatResponse } from './services/geminiService';
import { 
  DEFAULT_INTEREST_RATE, 
  DEFAULT_PENALTY_RATE, 
  LOAN_TEMPLATES, 
  SA_BANKS, 
  INITIAL_LOANS, 
  TRANSLATIONS 
} from './constants';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Persistent State with LocalStorage
  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('imali_loans_v1');
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditBorrowerModalOpen, setIsEditBorrowerModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<{ idNumber: string, name: string, address: string, phone: string } | null>(null);
  const [loanToRemind, setLoanToRemind] = useState<Loan | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.BORROWER); 
  
  // Sorting State
  const [loanSortKey, setLoanSortKey] = useState<'date' | 'amount' | 'status'>('date');
  const [loanSortOrder, setLoanSortOrder] = useState<'asc' | 'desc'>('desc');
  const [borrowerSortKey, setBorrowerSortKey] = useState<'date' | 'status'>('date');
  const [borrowerSortOrder, setBorrowerSortOrder] = useState<'asc' | 'desc'>('desc');

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [appSubmitted, setAppSubmitted] = useState(false);
  const [applicationStep, setApplicationStep] = useState(0); 

  // Tracker state
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState<Loan | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(1000);
  const [calcInterest, setCalcInterest] = useState<number>(DEFAULT_INTEREST_RATE);
  const [calcWeeks, setCalcWeeks] = useState<number>(2);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [borrowerFilter, setBorrowerFilter] = useState<string>('All');

  // User Settings State
  const [settings, setSettings] = useState<UserSettings>({
    overdueAlerts: true,
    whatsappAutomation: true,
    emailReports: true,
    emailNewAppAlerts: true,
    emailOverdueAlerts: true,
    darkMode: false
  });

  const t = TRANSLATIONS[language];

  // Helper moved up to fix ReferenceError
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

  // --- DERIVED DATA ---
  const chartData = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    loans.forEach(loan => {
      const date = new Date(loan.startDate);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyMap.set(monthLabel, (monthlyMap.get(monthLabel) || 0) + loan.amountLoaned);
    });

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    const statusCounts = {
      [RepaymentStatus.PAID]: loans.filter(l => l.status === RepaymentStatus.PAID).length,
      [RepaymentStatus.PENDING]: loans.filter(l => l.status === RepaymentStatus.PENDING).length,
      [RepaymentStatus.OVERDUE]: loans.filter(l => l.status === RepaymentStatus.OVERDUE).length,
      [RepaymentStatus.DEFAULTED]: loans.filter(l => l.status === RepaymentStatus.DEFAULTED).length,
    };

    const statusData = [
      { name: 'Paid', value: statusCounts[RepaymentStatus.PAID], color: '#10b981' },
      { name: 'Pending', value: statusCounts[RepaymentStatus.PENDING], color: '#f59e0b' },
      { name: 'Overdue', value: statusCounts[RepaymentStatus.OVERDUE], color: '#ef4444' },
      { name: 'Defaulted', value: statusCounts[RepaymentStatus.DEFAULTED], color: '#1a1a1a' },
    ].filter(item => item.value > 0);

    return { monthlyData, statusData };
  }, [loans]);

  const recentActivity = useMemo(() => {
    return loans.flatMap(loan => 
      loan.history.map(h => ({ 
        ...h, 
        borrowerName: loan.borrowerName, 
        loanId: loan.id 
      }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);
  }, [loans]);

  // Save to localStorage whenever loans change
  useEffect(() => {
    localStorage.setItem('imali_loans_v1', JSON.stringify(loans));
  }, [loans]);

  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // New Loan Form State 
  const [newLoan, setNewLoan] = useState<Partial<Loan>>({
    borrowerName: '',
    idNumber: '',
    physicalAddress: '',
    borrowerNumber: '',
    amountLoaned: 0,
    dueDate: '',
    payoutMethod: PayoutMethod.MOBILE,
    employer: '',
    bankDetails: '',
    notes: '' 
  });

  // Helper to export CSV
  const exportToCSV = () => {
    const headers = ['Transaction ID', 'Borrower Name', 'ID Number', 'Mobile', 'Amount', 'Interest %', 'Due Date', 'Status', 'Total Repayment'];
    const rows = loans.map(l => [
      l.id,
      l.borrowerName,
      l.idNumber,
      l.borrowerNumber,
      l.amountLoaned,
      l.interestRate,
      l.dueDate,
      l.status,
      l.totalRepayment + calculatePenaltyDetails(l).penalty
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `imali_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowToast('Ledger exported to CSV!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all data? This will reset the app to initial factory settings.')) {
      setLoans(INITIAL_LOANS);
      localStorage.removeItem('imali_loans_v1');
      setShowToast('All data reset.');
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  // Global Refresh Handler for Pull-to-Refresh
  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1200)); 
    if (activeTab === 'dashboard') {
      await fetchAiInsights();
    }
    setShowToast(language === Language.XH ? 'Ihlaziyiwe!' : 'Data refreshed!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const isValidSAPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    return /^(0[6-8][0-9]{8})|(\+27[6-8][0-9]{8})$/.test(cleanPhone);
  };

  const borrowers = useMemo(() => {
    const map = new Map<string, { idNumber: string, name: string, address: string, phone: string, loans: Loan[] }>();
    loans.forEach(loan => {
      if (!map.has(loan.idNumber)) {
        map.set(loan.idNumber, { 
          idNumber: loan.idNumber, 
          name: loan.borrowerName, 
          address: loan.physicalAddress,
          phone: loan.borrowerNumber,
          loans: [] 
        });
      }
      map.get(loan.idNumber)!.loans.push(loan);
    });
    return Array.from(map.values());
  }, [loans]);

  const sortedBorrowerLoans = useMemo(() => {
    if (!selectedBorrowerId) return [];
    const borrower = borrowers.find(b => b.idNumber === selectedBorrowerId);
    if (!borrower) return [];

    return [...borrower.loans].sort((a, b) => {
      let comparison = 0;
      if (borrowerSortKey === 'date') {
        comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      } else {
        comparison = a.status.localeCompare(b.status);
      }
      return borrowerSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [selectedBorrowerId, borrowers, borrowerSortKey, borrowerSortOrder]);

  const stats = useMemo(() => {
    const totalLoaned = loans.reduce((acc, l) => acc + l.amountLoaned, 0);
    const paidCount = loans.filter(l => l.status === RepaymentStatus.PAID).length;
    const repaymentRate = loans.length > 0 ? (paidCount / loans.length) * 100 : 0;
    const overdueCount = loans.filter(l => l.status === RepaymentStatus.OVERDUE).length;
    const activeBorrowersCount = new Set(loans.map(l => l.idNumber)).size;

    return { totalLoaned, repaymentRate, overdueCount, activeBorrowers: activeBorrowersCount };
  }, [loans]);

  const filteredAndSortedLoans = useMemo(() => {
    const filtered = loans.filter(loan => {
      const matchesSearch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          loan.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || loan.status === statusFilter || loan.applicationStatus === statusFilter;
      const matchesBorrower = borrowerFilter === 'All' || loan.idNumber === borrowerFilter;
      return matchesSearch && matchesStatus && matchesBorrower;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (loanSortKey === 'date') {
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (loanSortKey === 'amount') {
        comparison = a.amountLoaned - b.amountLoaned;
      } else {
        comparison = a.status.localeCompare(b.status);
      }
      return loanSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [loans, searchTerm, statusFilter, borrowerFilter, loanSortKey, loanSortOrder]);

  const tableTotals = useMemo(() => {
    return filteredAndSortedLoans.reduce((acc, l) => {
      const { penalty } = calculatePenaltyDetails(l);
      const isPaid = l.status === RepaymentStatus.PAID;
      const paymentItem = l.history.find(h => h.action === 'Full Repayment Received');
      const currentTotal = isPaid ? (paymentItem?.amount || 0) : (l.totalRepayment + penalty);
      
      return {
        principal: acc.principal + l.amountLoaned,
        expected: acc.expected + currentTotal
      };
    }, { principal: 0, expected: 0 });
  }, [filteredAndSortedLoans]);

  const toggleSort = (key: 'date' | 'amount' | 'status') => {
    if (loanSortKey === key) {
      setLoanSortOrder(loanSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setLoanSortKey(key);
      setLoanSortOrder('desc');
    }
  };

  const calculatedInterest = (newLoan.amountLoaned || 0) * (DEFAULT_INTEREST_RATE / 100);
  const calculatedTotal = (newLoan.amountLoaned || 0) + calculatedInterest;

  const calcResults = useMemo(() => {
    const interest = calcAmount * (calcInterest / 100);
    const total = calcAmount + interest;
    const weeklyPenalty = calcAmount * (DEFAULT_PENALTY_RATE / 100);
    return { interest, total, weeklyPenalty, monthlyEquivalent: (total / (calcWeeks || 1)) * 4 };
  }, [calcAmount, calcInterest, calcWeeks]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setLoans(currentLoans => {
      let hasChanges = false;
      const updated = currentLoans.map(loan => {
        const dueDate = new Date(loan.dueDate);
        if (loan.status === RepaymentStatus.PENDING && dueDate < today) {
          hasChanges = true;
          return {
            ...loan,
            status: RepaymentStatus.OVERDUE,
            history: [...loan.history, { date: today.toISOString().split('T')[0], action: 'System: Marked as Overdue' }]
          };
        }
        return loan;
      });
      return hasChanges ? updated : currentLoans;
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const getBorrowerHealth = (borrowerLoans: Loan[]) => {
    const hasOverdue = borrowerLoans.some(l => l.status === RepaymentStatus.OVERDUE);
    const hasPaid = borrowerLoans.some(l => l.status === RepaymentStatus.PAID);
    if (hasOverdue) return { label: 'At Risk', color: 'bg-rose-50 text-rose-600 border-rose-100' };
    if (hasPaid) return { label: 'Good', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    return { label: 'New', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
  };

  const getAppStatusColor = (status?: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.SUBMITTED: return 'bg-amber-50 text-amber-600 border-amber-100';
      case ApplicationStatus.REVIEWING: return 'bg-blue-50 text-blue-600 border-blue-100';
      case ApplicationStatus.APPROVED: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case ApplicationStatus.REJECTED: return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-gray-50 text-gray-400 border-gray-100';
    }
  };

  const handleMarkAsPaid = (loanId: string) => {
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        const penaltyInfo = calculatePenaltyDetails(l);
        return {
          ...l,
          status: RepaymentStatus.PAID,
          history: [...l.history, { 
            date: new Date().toISOString().split('T')[0], 
            action: 'Full Repayment Received', 
            amount: l.totalRepayment + penaltyInfo.penalty 
          }]
        };
      }
      return l;
    }));
    
    // UI Feedback
    if (selectedLoan?.id === loanId) {
      setSelectedLoan(null);
    }
    setShowToast(language === Language.XH ? 'Intlawulo ifunyenwe! Siyabonga.' : 'Payment recorded! Enkosi.');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoan.borrowerName || !newLoan.idNumber || !newLoan.amountLoaned) return;
    if (!newLoan.borrowerNumber || !isValidSAPhone(newLoan.borrowerNumber)) {
      setShowToast('Please enter a valid SA mobile number.');
      return;
    }

    const id = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
    const amount = newLoan.amountLoaned || 0;
    const interest = (amount * DEFAULT_INTEREST_RATE) / 100;
    const dueDateVal = newLoan.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const loan: Loan = {
      ...newLoan as Loan,
      id,
      interestRate: DEFAULT_INTEREST_RATE,
      penaltyRate: DEFAULT_PENALTY_RATE,
      totalRepayment: amount + interest,
      startDate: new Date().toISOString().split('T')[0],
      dueDate: dueDateVal,
      status: RepaymentStatus.PENDING,
      applicationStatus: ApplicationStatus.SUBMITTED,
      history: [{ date: new Date().toISOString().split('T')[0], action: 'Application Submitted', amount }]
    };
    
    setLoans(prev => [...prev, loan]);
    setIsAddModalOpen(false);
    if (userRole === UserRole.BORROWER) setAppSubmitted(true);
    else setShowToast('New account created!');

    setNewLoan({
      borrowerName: '', idNumber: '', physicalAddress: '', borrowerNumber: '',
      amountLoaned: 0, dueDate: '', payoutMethod: PayoutMethod.MOBILE, employer: '', bankDetails: '', notes: ''
    });
    setApplicationStep(0);
    setTimeout(() => setShowToast(null), 5000);
  };

  const handleApplyTemplate = (template: LoanTemplate) => {
    setNewLoan(prev => ({ ...prev, amountLoaned: template.amount, notes: language === Language.XH ? template.purposeXh : template.purpose }));
  };

  const handleTrackApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const result = loans.filter(l => l.idNumber === trackingId).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    setTrackingResult(result || null);
  };

  const handleWhatsAppReminder = (loan: Loan) => setLoanToRemind(loan);

  const confirmAndSendWhatsApp = (loan: Loan) => {
    const { penalty } = calculatePenaltyDetails(loan);
    const total = loan.totalRepayment + penalty;
    let phone = loan.borrowerNumber.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '27' + phone.substring(1);
    else if (!phone.startsWith('27') && phone.length === 9) phone = '27' + phone;

    const msg = encodeURIComponent(`Molo ${loan.borrowerName}, this is a reminder regarding your Imali loan (${loan.id}). Your total outstanding amount is R${total.toLocaleString()}. Please make payment to avoid further penalties. Enkosi!`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    setLoanToRemind(null);
    setShowToast('WhatsApp reminder sent!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleEditBorrower = (borrower: { idNumber: string, name: string, address: string, phone: string }) => {
    setEditingBorrower(borrower);
    setIsEditBorrowerModalOpen(true);
  };

  const handleSaveBorrowerEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBorrower) return;

    setLoans(prevLoans => prevLoans.map(loan => {
      if (loan.idNumber === editingBorrower.idNumber) {
        return {
          ...loan,
          borrowerName: editingBorrower.name,
          borrowerNumber: editingBorrower.phone,
          physicalAddress: editingBorrower.address
        };
      }
      return loan;
    }));

    setIsEditBorrowerModalOpen(false);
    setEditingBorrower(null);
    setShowToast('Borrower details updated!');
    setTimeout(() => setShowToast(null), 3000);
  };

  const getTranslatedStatus = (status: string) => {
    switch (status) {
      case RepaymentStatus.PENDING: return t.pending;
      case RepaymentStatus.PAID: return t.paid;
      case RepaymentStatus.OVERDUE: return t.overdueStatus;
      case RepaymentStatus.DEFAULTED: return t.defaulted;
      default: return status;
    }
  };

  const fetchAiInsights = async () => {
    setIsLoadingAi(true);
    const result = await getCreditRiskInsights(loans);
    setAiInsight(result);
    setIsLoadingAi(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatTyping) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatTyping(true);
    const response = await getChatResponse(chatHistory, userMsg.text);
    const modelMsg: ChatMessage = { role: 'model', text: response };
    setChatHistory(prev => [...prev, modelMsg]);
    setIsChatTyping(false);
  };

  const handlePortalSwitch = () => {
    setUserRole(userRole === UserRole.LENDER ? UserRole.BORROWER : UserRole.LENDER);
    setActiveTab('dashboard');
    setApplicationStep(0);
    setSelectedBorrowerId(null);
  };

  const BorrowerPortal = () => {
    const stepsCount = 3;
    const nextStep = () => { if (applicationStep < stepsCount) setApplicationStep(applicationStep + 1); };
    const prevStep = () => { if (applicationStep > 1) setApplicationStep(applicationStep - 1); };
    const getTimelineStage = (status?: ApplicationStatus) => {
      if (status === ApplicationStatus.REJECTED || status === ApplicationStatus.APPROVED) return 3;
      if (status === ApplicationStatus.REVIEWING) return 2;
      return 1;
    };

    return (
      <div className="max-w-md mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-indigo-600/5 border border-gray-100 relative overflow-hidden cultural-card">
          {!appSubmitted && applicationStep > 0 && (
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-2 rounded-full transition-all duration-500 ${applicationStep >= s ? 'w-8 bg-[#1a1a1a]' : 'w-4 bg-gray-100'}`} />
                ))}
              </div>
              <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{t.step} {applicationStep} / {stepsCount}</span>
            </div>
          )}

          {appSubmitted ? (
            <div className="text-center py-10 space-y-4 animate-in zoom-in duration-500 relative z-10">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50 relative overflow-hidden">
                 <CheckCircle2 size={40} className="relative z-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{t.appSuccess}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{t.appSuccessDesc}</p>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between relative overflow-hidden">
                <span className="text-xs font-bold text-gray-400 uppercase relative z-10">Application Status</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest relative z-10 font-mono">{ApplicationStatus.SUBMITTED}</span>
              </div>
              <button onClick={() => { setAppSubmitted(false); setApplicationStep(0); }} className="text-indigo-600 font-bold text-sm hover:underline mt-4">Back to start</button>
            </div>
          ) : applicationStep === 0 ? (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 py-4 relative z-10">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{language === Language.XH ? 'Wamkelekile!' : 'Welcome!'}</h2>
                    <p className="text-gray-500 text-sm">{language === Language.XH ? 'Ufuna ukwenza ntoni namhlanje?' : 'What would you like to do today?'}</p>
                </div>
                <div className="space-y-4">
                    <button onClick={() => setApplicationStep(1)} className="w-full p-6 bg-[#1a1a1a] text-white rounded-[32px] shadow-xl shadow-black/10 hover:bg-black transition-all flex items-center gap-6 group relative overflow-hidden">
                        <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform relative z-10"><Plus size={32} /></div>
                        <div className="text-left relative z-10">
                            <p className="font-black text-xl leading-tight">{t.applyNow}</p>
                            <p className="text-[11px] font-bold uppercase tracking-widest opacity-50 mt-1">Start New Application</p>
                        </div>
                        <ChevronRight className="ml-auto opacity-40 group-hover:translate-x-1 transition-transform relative z-10" />
                    </button>
                    <button onClick={() => setApplicationStep(-1)} className="w-full p-6 bg-white border-2 border-gray-100 text-gray-900 rounded-[32px] shadow-sm hover:border-black/10 hover:shadow-md transition-all flex items-center gap-6 group relative overflow-hidden">
                        <div className="p-4 bg-gray-50 rounded-2xl group-hover:scale-110 transition-transform relative z-10 group-hover:bg-indigo-50 group-hover:text-indigo-600"><Search size={32} /></div>
                        <div className="text-left relative z-10">
                            <p className="font-black text-xl leading-tight">{language === Language.XH ? 'Landela isicelo' : 'Track Application'}</p>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Check Status Online</p>
                        </div>
                        <ChevronRight className="ml-auto opacity-20 group-hover:translate-x-1 transition-transform relative z-10" />
                    </button>
                </div>
            </div>
          ) : applicationStep === -1 ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 relative z-10">
                <button onClick={() => setApplicationStep(0)} className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"><ChevronLeft size={16} /> {t.previous}</button>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">{language === Language.XH ? 'Landela isimo sesicelo sakho' : 'Track your application status'}</h2>
                <form onSubmit={handleTrackApplication} className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.idNumber}</label>
                        <div className="relative group">
                            <Fingerprint size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input required value={trackingId} onChange={e => {setTrackingId(e.target.value); setHasSearched(false);}} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-[24px] focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-900 shadow-inner" placeholder="9401015555081" />
                            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#1a1a1a] text-white rounded-xl shadow-lg hover:bg-black active:scale-95 transition-all"><ArrowRight size={18} /></button>
                        </div>
                    </div>
                </form>
                {hasSearched && (
                    <div className="animate-in zoom-in-95 duration-300">
                        {trackingResult ? (
                            <div className="space-y-6">
                                <div className="bg-indigo-50/50 p-6 rounded-[32px] border-2 border-indigo-100 space-y-4 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-1 opacity-10 xhosa-pattern scale-50" />
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Application for</p>
                                            <p className="font-bold text-gray-900">{trackingResult.borrowerName}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border shadow-sm ${getAppStatusColor(trackingResult.applicationStatus)}`}>{trackingResult.applicationStatus || ApplicationStatus.SUBMITTED}</span>
                                    </div>
                                    <div className="beaded-divider" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Amount</p><p className="font-black text-gray-900 font-mono">R {trackingResult.amountLoaned.toLocaleString()}</p></div>
                                        <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Submitted On</p><p className="font-black text-gray-900 font-mono">{trackingResult.startDate}</p></div>
                                    </div>
                                </div>
                                <div className="p-6 bg-white border border-gray-100 rounded-[32px] shadow-sm relative overflow-hidden">
                                    <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 flex items-center gap-2"><Activity size={16} className="text-indigo-600" />Progress Tracker</h4>
                                    <div className="space-y-8 relative">
                                        <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-100" />
                                        <div className="flex gap-4 relative z-10">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${getTimelineStage(trackingResult.applicationStatus) >= 1 ? 'bg-[#1a1a1a] text-white border-black' : 'bg-white text-gray-300 border-gray-100'}`}><ClipboardCheck size={16} /></div>
                                            <div><p className={`text-sm font-bold ${getTimelineStage(trackingResult.applicationStatus) >= 1 ? 'text-gray-900' : 'text-gray-300'}`}>Submission Received</p><p className="text-[11px] text-gray-500 leading-relaxed">Your details have been successfully captured in our community ledger.</p></div>
                                        </div>
                                        <div className="flex gap-4 relative z-10">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border transition-all duration-700 ${getTimelineStage(trackingResult.applicationStatus) >= 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-300 border-gray-100'}`}><Search size={16} className={trackingResult.applicationStatus === ApplicationStatus.REVIEWING ? 'animate-pulse' : ''} /></div>
                                            <div><p className={`text-sm font-bold ${getTimelineStage(trackingResult.applicationStatus) >= 2 ? 'text-gray-900' : 'text-gray-300'}`}>Under Expert Review</p><p className="text-[11px] text-gray-500 leading-relaxed">Imali AI and our community lenders are verifying your details.</p></div>
                                        </div>
                                        <div className="flex gap-4 relative z-10">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${getTimelineStage(trackingResult.applicationStatus) >= 3 ? (trackingResult.applicationStatus === ApplicationStatus.REJECTED ? 'bg-rose-600 text-white border-rose-600' : 'bg-emerald-600 text-white border-emerald-600') : 'bg-white text-gray-300 border-gray-100'}`}>{trackingResult.applicationStatus === ApplicationStatus.REJECTED ? <XCircle size={16} /> : <ShieldCheck size={16} />}</div>
                                            <div>
                                                <p className={`text-sm font-bold ${getTimelineStage(trackingResult.applicationStatus) >= 3 ? (trackingResult.applicationStatus === ApplicationStatus.REJECTED ? 'text-rose-600' : 'text-emerald-600') : 'text-gray-300'}`}>{trackingResult.applicationStatus === ApplicationStatus.REJECTED ? 'Application Rejected' : trackingResult.applicationStatus === ApplicationStatus.APPROVED ? 'Application Approved' : 'Final Decision'}</p>
                                                <p className="text-[11px] text-gray-500 leading-relaxed">{trackingResult.applicationStatus === ApplicationStatus.APPROVED ? 'Congratulations! Funds have been disbursed.' : trackingResult.applicationStatus === ApplicationStatus.REJECTED ? 'Unfortunately, your application does not meet our current lending criteria.' : 'Once a decision is reached, you will be notified via WhatsApp.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 space-y-4 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 relative overflow-hidden"><div className="absolute inset-0 xhosa-pattern-sm opacity-[0.03]" /><div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto relative z-10 shadow-inner"><Search size={24} /></div><div className="space-y-1 relative z-10"><p className="font-bold text-gray-900">Molo! No record found.</p><p className="text-xs text-gray-500">We couldn't find an application for ID <span className="font-mono font-bold text-gray-700">{trackingId}</span>.</p></div></div>
                        )}
                    </div>
                )}
            </div>
          ) : (
            <form onSubmit={applicationStep === stepsCount ? handleAddLoan : (e) => { e.preventDefault(); nextStep(); }} className="space-y-6 relative z-10">
               <div className="pb-6 border-b border-gray-50 mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><button type="button" onClick={() => setApplicationStep(0)} className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 shadow-sm"><ChevronLeft size={24} /></button><h2 className="text-xl font-black text-gray-900 tracking-tight">New Application</h2></div></div>
              {applicationStep === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-black text-gray-900">{language === Language.XH ? 'Sazise ngawe' : 'Basic Information'}</h2>
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3 relative overflow-hidden group shadow-inner"><Shield className="text-blue-600 relative z-10" size={20} /><div className="relative z-10"><p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Platform Reputation</p><p className="text-sm font-bold text-blue-900">{stats.repaymentRate.toFixed(1)}% {language === Language.XH ? 'Ukuthembeka' : 'Trust Score'}</p></div></div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.fullName}</label>
                    <div className="relative group"><User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1a1a1a] transition-colors" /><input required value={newLoan.borrowerName} onChange={e => setNewLoan({...newLoan, borrowerName: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1a1a1a] transition-all font-bold text-gray-900 shadow-inner" placeholder="e.g. Sipho Khumalo" /></div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.idNumber}</label>
                    <div className="relative group"><Fingerprint size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" /><input required value={newLoan.idNumber} onChange={e => setNewLoan({...newLoan, idNumber: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1a1a1a] transition-all font-bold text-gray-900 font-mono shadow-inner" placeholder="9401015555081" /></div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.cellNumber}</label>
                    <div className="relative group"><Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1a1a1a] transition-colors" /><input required value={newLoan.borrowerNumber} onChange={e => setNewLoan({...newLoan, borrowerNumber: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1a1a1a] transition-all font-bold text-gray-900 font-mono shadow-inner" placeholder="071..." pattern="(0[6-8][0-9]{8})|(\+27[6-8][0-9]{8})" title="Please enter a valid South African mobile number" /></div>
                  </div>
                </div>
              )}
              {applicationStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-black text-gray-900">{language === Language.XH ? 'Iinkcukacha zemali' : 'Loan Details'}</h2>
                  <div className="space-y-3"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.quickTemplates}</label><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{LOAN_TEMPLATES.map(template => (<button key={template.id} type="button" onClick={() => handleApplyTemplate(template)} className="shrink-0 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"><Briefcase size={12} /> {language === Language.XH ? template.labelXh : template.label}</button>))}</div></div>
                  <div className="space-y-4"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.amount}</label><div className="relative group"><span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-gray-400 group-focus-within:text-[#1a1a1a]">R</span><input type="number" required value={newLoan.amountLoaned || ''} onChange={e => setNewLoan({...newLoan, amountLoaned: Number(e.target.value)})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1a1a1a] transition-all font-black text-gray-900 text-xl shadow-inner font-mono" placeholder="2500" /></div></div>
                  {newLoan.amountLoaned && newLoan.amountLoaned > 0 ? (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300">
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 relative overflow-hidden group shadow-inner"><p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1 relative z-10">{t.interest} ({DEFAULT_INTEREST_RATE}%)</p><p className="font-bold text-indigo-600 text-lg relative z-10 font-mono">R {calculatedInterest.toLocaleString()}</p></div>
                      <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 relative overflow-hidden group shadow-lg"><p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1 relative z-10">{t.totalDue}</p><p className="font-bold text-white text-lg relative z-10 font-mono">R {calculatedTotal.toLocaleString()}</p></div>
                    </div>
                  ) : null}
                  <div className="space-y-4"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.loanPurpose}</label><div className="relative group"><Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1a1a1a] transition-colors" /><input required value={newLoan.notes} onChange={e => setNewLoan({...newLoan, notes: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1a1a1a] transition-all font-bold text-gray-900 shadow-inner" placeholder="e.g. Transport, Grocery Stock" /></div></div>
                  <div className="space-y-4"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.dueDate}</label><div className="relative group"><Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#1a1a1a] transition-colors" /><input type="date" required value={newLoan.dueDate} onChange={e => setNewLoan({...newLoan, dueDate: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1a1a1a] transition-all font-bold text-gray-900 shadow-inner font-mono" /></div></div>
                </div>
              )}
              {applicationStep === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-black text-gray-900">{language === Language.XH ? 'Intlawulo' : 'Payout Method'}</h2>
                  <div className="space-y-4"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.payoutMethod}</label><div className="grid grid-cols-2 gap-4"><button type="button" onClick={() => setNewLoan({...newLoan, payoutMethod: PayoutMethod.MOBILE})} className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative overflow-hidden group shadow-sm ${newLoan.payoutMethod === PayoutMethod.MOBILE ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}><Smartphone size={20} className="relative z-10" /><span className="text-[10px] font-black uppercase tracking-widest relative z-10">{t.mobile}</span></button><button type="button" onClick={() => setNewLoan({...newLoan, payoutMethod: PayoutMethod.BANK})} className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative overflow-hidden group shadow-sm ${newLoan.payoutMethod === PayoutMethod.BANK ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}><Building2 size={20} className="relative z-10" /><span className="text-[10px] font-black uppercase tracking-widest relative z-10">{t.bank}</span></button></div></div>
                  {newLoan.payoutMethod === PayoutMethod.BANK && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      <div className="space-y-4"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.bankName}</label><div className="relative group"><select required value={newLoan.bankDetails?.split(' - ')[0] || ''} onChange={e => {const accNo = newLoan.bankDetails?.split(' - ')[1] || ''; setNewLoan({...newLoan, bankDetails: `${e.target.value}${accNo ? ` - ${accNo}` : ''}`});}} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1a1a1a] transition-all font-bold text-gray-900 appearance-none shadow-inner"><option value="">Select your bank</option>{SA_BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}</select><ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-[#1a1a1a]" /></div></div>
                      <div className="space-y-4"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">{t.bankAccountNumber}</label><input required value={newLoan.bankDetails?.split(' - ')[1] || ''} onChange={e => {const bankName = newLoan.bankDetails?.split(' - ')[0] || ''; setNewLoan({...newLoan, bankDetails: `${bankName ? `${bankName} - ` : ''}${e.target.value}`});}} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#1a1a1a] transition-all font-bold text-gray-900 shadow-inner font-mono" placeholder="e.g. 10123456789" /></div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-4 pt-6"><button type="button" onClick={prevStep} className="flex-1 py-5 border-2 border-gray-100 text-gray-400 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"><ChevronLeft size={20} /> {t.previous}</button><button type="submit" className="flex-[2] py-5 bg-[#1a1a1a] text-white rounded-[24px] font-black text-lg shadow-xl shadow-black/10 flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95 transition-all relative overflow-hidden group"><span className="relative z-10 uppercase tracking-widest">{applicationStep === stepsCount ? t.submitApp : t.next}</span><ArrowRight size={20} className="relative z-10" /></button></div>
            </form>
          )}
        </div>
      </div>
    );
  };

  const SummaryCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group"><div className="absolute top-0 right-0 p-1 opacity-5 xhosa-pattern-sm" /><div className="flex items-center justify-between relative z-10"><div className={`p-3 rounded-2xl ${colorClass}`}><Icon size={24} /></div><div className="text-right"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p><p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p></div></div></div>
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {userRole === UserRole.BORROWER ? (
        <div className="min-h-screen pt-20 px-4 relative">
          <div className="max-w-md mx-auto mb-10 flex justify-between items-center relative z-10"><div className="flex items-center gap-3"><div className="bg-[#1a1a1a] p-2 rounded-xl shadow-lg rotate-3 relative overflow-hidden group border border-white/10 shadow-2xl"><div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-50" /><Wallet size={24} className="text-white relative z-10" /></div><h1 className="text-2xl font-black tracking-tighter text-gray-900">Imali</h1></div><div className="flex items-center gap-3"><button onClick={handlePortalSwitch} className="text-[10px] font-black uppercase bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><ArrowLeftRight size={12} />Lender Portal</button><button onClick={() => setLanguage(language === Language.EN ? Language.XH : Language.EN)} className="text-[10px] font-black uppercase bg-white text-gray-900 border border-gray-100 px-4 py-2 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"><Globe size={12} className="text-[#1a1a1a]" />{language === Language.EN ? 'isiXhosa' : 'English'}</button></div></div>
          <BorrowerPortal />
        </div>
      ) : (
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} language={language} setLanguage={setLanguage} userRole={userRole} toggleRole={handlePortalSwitch} onRefresh={handleRefresh} adminProfile={{ name: 'Ovayo M.', email: 'ovayo@imali.co.za', pin: '1234' }}>
          {showToast && (<div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border border-white/10 relative overflow-hidden"><div className="absolute inset-0 xhosa-pattern-sm opacity-[0.05]" /><CheckCircle2 size={18} className="text-emerald-400 relative z-10" /><span className="text-sm font-bold relative z-10">{showToast}</span></div>)}
          <div className="space-y-8 pb-32 animate-in fade-in duration-500">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <SummaryCard title={t.totalLoaned} value={`R ${stats.totalLoaned.toLocaleString()}`} icon={Wallet} colorClass="bg-indigo-50 text-indigo-600" />
                  <SummaryCard title={t.repaymentRate} value={`${stats.repaymentRate.toFixed(1)}%`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" />
                  <SummaryCard title={t.overdue} value={stats.overdueCount} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" />
                  <SummaryCard title={t.borrowers} value={stats.activeBorrowers} icon={Users} colorClass="bg-amber-50 text-amber-600" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                  <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card">
                    <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><BarChart3 size={24} /></div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Monthly Disbursements</h3>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} formatter={(value: number) => [`R ${value.toLocaleString()}`, 'Amount']} />
                          <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} animationDuration={1500} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* RECENT ACTIVITY FEED */}
                  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Activity size={24} /></div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Activity Feed</h3>
                    </div>
                    <div className="space-y-6 relative">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-50" />
                      {recentActivity.map((activity, idx) => (
                        <div key={idx} className="flex gap-4 relative z-10 group cursor-default">
                          <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 shadow-sm border-4 border-white transition-all group-hover:scale-110 ${
                            activity.action.includes('Repayment') ? 'bg-emerald-500 text-white' : 
                            activity.action.includes('Disbursed') ? 'bg-indigo-500 text-white' : 'bg-gray-400 text-white'
                          }`}>
                            {activity.action.includes('Repayment') ? <Check size={12} /> : 
                             activity.action.includes('Disbursed') ? <ArrowRight size={12} /> : <Clock size={12} />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900 leading-tight mb-0.5">{activity.action}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activity.borrowerName} • R {activity.amount?.toLocaleString() || 'N/A'}</p>
                            <p className="text-[9px] font-medium text-gray-300 mt-1">{activity.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('loans')} className="w-full mt-8 py-3 bg-gray-50 hover:bg-[#1a1a1a] hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Full History</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                   <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card min-h-[400px]">
                    <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><PieIcon size={24} /></div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Status Distribution</h3>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData.statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" animationDuration={1500}>
                            {chartData.statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke="none" />))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} />
                          <Legend verticalAlign="bottom" align="center" iconType="circle" formatter={(value) => <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card">
                    <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                    <div className="flex items-center justify-between mb-8"><h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3"><Sparkles size={24} className="text-indigo-600" />{t.riskInsights}</h3><button onClick={fetchAiInsights} disabled={isLoadingAi} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50">{isLoadingAi ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}{t.generateInsights}</button></div>
                    <div className="bg-gray-50 rounded-3xl p-6 min-h-[200px] border border-gray-100 relative shadow-inner">{aiInsight ? (<div className="prose prose-indigo max-w-none text-sm text-gray-700 leading-relaxed whitespace-pre-line animate-in fade-in slide-in-from-top-2">{aiInsight}</div>) : (<div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40"><History size={40} className="text-gray-300" /><p className="text-xs font-bold uppercase tracking-widest text-gray-400">No Insights Generated Yet</p></div>)}</div>
                  </div>
                </div>
              </>
            )}
            {activeTab === 'loans' && (
              <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden relative cultural-card flex flex-col h-[75vh]">
                <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 shrink-0">
                   <div className="relative w-full md:w-80 group"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t.search} className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium shadow-inner" /></div>
                   <div className="flex flex-wrap gap-3">
                      <select value={borrowerFilter} onChange={e => setBorrowerFilter(e.target.value)} className="px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-bold text-gray-700 shadow-inner appearance-none min-w-[160px]"><option value="All">All Borrowers</option>{borrowers.map(b => (<option key={b.idNumber} value={b.idNumber}>{b.name}</option>))}</select>
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-6 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-bold text-gray-700 shadow-inner appearance-none"><option value="All">All Statuses</option><option value={RepaymentStatus.PENDING}>{t.pending}</option><option value={RepaymentStatus.PAID}>{t.paid}</option><option value={RepaymentStatus.OVERDUE}>{t.overdueStatus}</option></select>
                      <button onClick={() => setIsAddModalOpen(true)} className="bg-[#1a1a1a] text-white px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center gap-2"><Plus size={18} /> {language === Language.XH ? 'Mboleka' : 'New Loan'}</button>
                   </div>
                </div>
                <div className="flex-1 overflow-auto relative z-10 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] sticky top-0 z-20 backdrop-blur-md">
                      <tr className="border-b border-gray-100">
                        <th className="px-8 py-5">Loan ID</th>
                        <th className="px-8 py-5">Borrower</th>
                        <th className="px-8 py-5 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => toggleSort('amount')}>Principal <ArrowUpDown size={10} className="inline ml-1" /></th>
                        <th className="px-8 py-5">Interest</th>
                        <th className="px-8 py-5 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => toggleSort('date')}>Due Date <ArrowUpDown size={10} className="inline ml-1" /></th>
                        <th className="px-8 py-5">{t.totalDue}</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAndSortedLoans.map((loan) => {
                        const { penalty } = calculatePenaltyDetails(loan);
                        const interestAmount = loan.amountLoaned * (loan.interestRate / 100);
                        const isPaid = loan.status === RepaymentStatus.PAID;
                        const paymentHistoryItem = loan.history.find(h => h.action === 'Full Repayment Received');
                        const actualPaidAmount = paymentHistoryItem?.amount || 0;
                        const totalDueAtCurrent = isPaid ? actualPaidAmount : (loan.totalRepayment + penalty);

                        return (
                          <tr key={loan.id} className="hover:bg-gray-50/80 transition-all group">
                            <td className="px-8 py-6">
                              <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg rotate-1 inline-block uppercase tracking-tighter border border-white/20">
                                {loan.id}
                              </div>
                            </td>
                            <td className="px-8 py-6"><div><p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p><p className="text-[10px] text-gray-400 font-medium tracking-tight flex items-center gap-1"><Smartphone size={10} /> {loan.borrowerNumber}</p></div></td>
                            <td className="px-8 py-6"><p className="font-black text-gray-900 text-sm">R {loan.amountLoaned.toLocaleString()}</p></td>
                            <td className="px-8 py-6"><p className="text-xs font-bold text-indigo-600">R {interestAmount.toLocaleString()}</p></td>
                            <td className="px-8 py-6"><div className="flex items-center gap-2"><Clock size={14} className={loan.status === RepaymentStatus.OVERDUE ? 'text-rose-500' : 'text-gray-400'} /><span className={`text-xs font-bold ${loan.status === RepaymentStatus.OVERDUE ? 'text-rose-600' : 'text-gray-600'}`}>{loan.dueDate}</span></div></td>
                            <td className="px-8 py-6">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className={`font-mono text-sm font-black ${penalty > 0 && !isPaid ? 'text-rose-600' : 'text-gray-900'}`}>
                                    R {totalDueAtCurrent.toLocaleString()}
                                  </p>
                                  {penalty > 0 && !isPaid && <AlertTriangle size={14} className="text-rose-500" title="Penalty Applied" />}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                                loan.status === RepaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                loan.status === RepaymentStatus.OVERDUE ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse ring-1 ring-rose-500/20' : 'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                                {loan.status === RepaymentStatus.PAID && <CheckCircle2 size={12} />}
                                {loan.status === RepaymentStatus.OVERDUE && <AlertTriangle size={12} />}
                                {loan.status === RepaymentStatus.PENDING && <Clock size={12} />}
                                {getTranslatedStatus(loan.status)}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => setSelectedLoan(loan)} className="px-4 py-2 bg-white text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-gray-200 shadow-sm"><Eye size={12} className="text-indigo-500" /> {language === Language.XH ? 'Iinkcukacha' : 'View Details'}</button>
                                    {!isPaid && (
                                        <>
                                            <button onClick={() => handleWhatsAppReminder(loan)} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-emerald-200 shadow-sm"><Smartphone size={12} /> {language === Language.XH ? 'Khumbuza' : 'Remind'}</button>
                                            <button onClick={() => handleMarkAsPaid(loan.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95"><Check size={12} /> {language === Language.XH ? 'Hlawula' : 'Paid'}</button>
                                        </>
                                    )}
                                </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* TABLE FOOTER TOTALS */}
                <div className="bg-gray-50 border-t border-gray-100 p-6 px-12 flex justify-between items-center relative z-20 shrink-0">
                    <div className="flex items-center gap-8">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Active Principal</p>
                            <p className="text-lg font-black text-gray-900 font-mono">R {tableTotals.principal.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-10 bg-gray-200" />
                        <div>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Expected Inflow</p>
                            <p className="text-lg font-black text-indigo-600 font-mono">R {tableTotals.expected.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={exportToCSV} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"><Download size={14} /> Export View</button>
                    </div>
                </div>
              </div>
            )}
            {activeTab === 'borrowers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {borrowers.map((borrower) => {
                  const health = getBorrowerHealth(borrower.loans); 
                  const totalPaidByBorrower = borrower.loans.reduce((acc, loan) => {
                    const payment = loan.history.find(h => h.action === 'Full Repayment Received');
                    return acc + (payment?.amount || 0);
                  }, 0);

                  return (
                    <div key={borrower.idNumber} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group hover:shadow-xl transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150 group-hover:rotate-45 transition-transform duration-700" />
                      <div className="flex items-start justify-between mb-8 relative z-10">
                        <div className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-indigo-500 to-indigo-700 p-[1px] shadow-lg group-hover:scale-110 transition-transform">
                          <div className="w-full h-full rounded-[23px] bg-white flex items-center justify-center font-black text-xl text-indigo-600 relative overflow-hidden">
                            <div className="absolute inset-0 xhosa-pattern opacity-10" />
                            {borrower.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${health.color}`}>{health.label}</span>
                          <button onClick={() => handleEditBorrower(borrower)} className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm" title="Edit Borrower"><Edit2 size={16} /></button>
                        </div>
                      </div>
                      <div className="space-y-6 relative z-10">
                        <div>
                          <h4 className="text-xl font-black text-gray-900 tracking-tight">{borrower.name}</h4>
                          <p className="text-xs text-gray-400 font-bold tracking-widest uppercase flex items-center gap-2 mt-1"><Fingerprint size={12} className="text-indigo-400" /> {borrower.idNumber}</p>
                          <p className="text-xs text-gray-400 font-bold uppercase flex items-center gap-2 mt-1"><MapPin size={12} className="text-indigo-400" /> {borrower.address}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.totalBorrowerLoans}</p><p className="font-black text-gray-900">{borrower.loans.length}</p></div>
                          <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100"><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Paid</p><p className="font-black text-emerald-600 font-mono">R {totalPaidByBorrower.toLocaleString()}</p></div>
                        </div>
                        <button onClick={() => setSelectedBorrowerId(borrower.idNumber)} className="w-full py-4 bg-gray-50 hover:bg-[#1a1a1a] hover:text-white rounded-[24px] text-xs font-black uppercase tracking-widest transition-all border border-gray-100 flex items-center justify-center gap-3"><Eye size={16} /> {t.viewHistory}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'calculator' && (
              <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
                <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden cultural-card">
                  <div className="bg-[#1a1a1a] p-10 text-white relative overflow-hidden group"><div className="absolute inset-0 xhosa-accent-pattern opacity-20 rotate-45 scale-150 group-hover:scale-125 transition-transform duration-1000" /><div className="relative z-10 flex items-center gap-6"><div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl rotate-3"><CalcIcon size={40} /></div><div><h3 className="text-3xl font-black tracking-tighter uppercase">{t.loanCalculator}</h3><p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em]">{t.statsDesc}</p></div></div></div>
                  <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.02] xhosa-pattern pointer-events-none" />
                    <div className="space-y-8 relative z-10">
                       <div className="space-y-3"><div className="flex justify-between items-end px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.calcAmount}</label><span className="font-black text-2xl text-gray-900 font-mono">R {calcAmount.toLocaleString()}</span></div><input type="range" min="100" max="10000" step="100" value={calcAmount} onChange={e => setCalcAmount(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div>
                       <div className="space-y-3"><div className="flex justify-between items-end px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.calcInterest}</label><span className="font-black text-2xl text-indigo-600 font-mono">{calcInterest}%</span></div><input type="range" min="0" max="100" step="5" value={calcInterest} onChange={e => setCalcInterest(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div>
                       <div className="space-y-3"><div className="flex justify-between items-end px-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.calcDuration}</label><span className="font-black text-2xl text-gray-900 font-mono">{calcWeeks} Weeks</span></div><input type="range" min="1" max="52" step="1" value={calcWeeks} onChange={e => setCalcWeeks(Number(e.target.value))} className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" /></div>
                    </div>
                    <div className="bg-gray-50 rounded-[32px] p-8 border-2 border-dashed border-gray-200 flex flex-col justify-between relative shadow-inner group"><div className="absolute inset-0 opacity-[0.03] xhosa-pattern-sm pointer-events-none" /><div className="space-y-8 relative z-10"><div className="flex justify-between items-start"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{t.calcResult}</p><p className="text-4xl font-black text-gray-900 font-mono tracking-tighter">R {calcResults.total.toLocaleString()}</p></div><div className="text-right"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Weekly Profit</p><p className="text-xl font-black text-indigo-600 font-mono">R {(calcResults.interest / calcWeeks).toFixed(2)}</p></div></div><div className="beaded-divider opacity-40" /><div className="grid grid-cols-2 gap-6"><div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t.interest}</p><p className="font-black text-gray-900 font-mono">R {calcResults.interest.toLocaleString()}</p></div><div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t.calcPenalty}</p><p className="font-black text-rose-500 font-mono">R {calcResults.weeklyPenalty.toLocaleString()}</p></div></div></div><div className="mt-8 relative z-10"><div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4 group-hover:scale-[1.02] transition-transform"><div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg"><TrendingUp size={20} /></div><div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Monthly Growth Potential</p><p className="text-lg font-black text-emerald-900 font-mono">R {calcResults.monthlyEquivalent.toLocaleString()}</p></div></div></div></div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card">
                  <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-3"><ShieldCheck size={24} className="text-indigo-600" />{t.prefNotifications}</h3>
                  <div className="space-y-6">{[{ key: 'overdueAlerts', icon: Bell, title: t.prefOverdueAlerts, desc: t.prefOverdueDesc }, { key: 'whatsappAutomation', icon: Smartphone, title: t.prefSMSAuto, desc: t.prefSMSDesc }, { key: 'emailReports', icon: Mail, title: t.prefReports, desc: t.prefReportsDesc }, { key: 'emailNewAppAlerts', icon: Plus, title: t.prefEmailNewApp, desc: t.prefEmailNewAppDesc }].map((pref) => (<div key={pref.key} className="flex items-center justify-between p-6 bg-gray-50 rounded-[32px] border border-gray-100 hover:border-indigo-100 transition-all group"><div className="flex items-center gap-6"><div className="p-4 bg-white rounded-2xl shadow-sm text-gray-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all"><pref.icon size={24} /></div><div><p className="font-black text-gray-900">{pref.title}</p><p className="text-xs text-gray-500">{pref.desc}</p></div></div><button onClick={() => toggleSetting(pref.key as keyof UserSettings)} className={`w-14 h-8 rounded-full relative transition-all duration-500 shadow-inner ${settings[pref.key as keyof UserSettings] ? 'bg-indigo-600' : 'bg-gray-200'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-500 ${settings[pref.key as keyof UserSettings] ? 'left-7' : 'left-1'}`} /></button></div>))}</div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative overflow-hidden cultural-card">
                  <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8 flex items-center gap-3"><Save size={24} className="text-indigo-600" />Data Management</h3>
                  <div className="space-y-4">
                    <button onClick={exportToCSV} className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-indigo-50 transition-all group">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-600"><Download size={24} /></div>
                        <div className="text-left"><p className="font-black text-gray-900">Export All Transactions</p><p className="text-xs text-gray-500">Download your entire ledger as a CSV file.</p></div>
                      </div>
                      <ChevronRight className="text-gray-400" />
                    </button>
                    
                    <button onClick={clearData} className="w-full flex items-center justify-between p-6 bg-rose-50/50 rounded-[32px] border border-rose-100 hover:bg-rose-50 transition-all group">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-rose-600"><Trash2 size={24} /></div>
                        <div className="text-left"><p className="font-black text-rose-900">Reset Local Database</p><p className="text-xs text-rose-500">Clear all records and start fresh.</p></div>
                      </div>
                      <ChevronRight className="text-rose-300" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="fixed bottom-8 right-8 z-[150] flex flex-col items-end gap-4">{isChatOpen && (<div className="w-80 md:w-96 h-[500px] bg-white rounded-[32px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300"><div className="bg-[#1a1a1a] p-5 text-white flex justify-between items-center relative overflow-hidden"><div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-150 rotate-12 pointer-events-none" /><div className="flex items-center gap-3 relative z-10"><div className="p-2 bg-indigo-600 rounded-xl shadow-lg relative overflow-hidden group"><Sparkles size={20} className="relative z-10" /></div><h3 className="font-bold text-lg">{t.imaliChat}</h3></div><button onClick={() => setIsChatOpen(false)} className="relative z-10 p-1.5 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button></div><div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 custom-scrollbar relative"><div className="flex justify-start"><div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-sm text-gray-700 leading-relaxed border border-gray-100 relative overflow-hidden shadow-inner"><div className="absolute top-0 right-0 p-1 opacity-5 xhosa-pattern-sm" />{t.chatIntro}</div></div>{chatHistory.map((msg, idx) => (<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`p-3.5 rounded-2xl shadow-sm max-w-[85%] text-sm leading-relaxed border ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-700' : 'bg-white text-gray-700 rounded-tl-none border-gray-100'}`}>{msg.text}</div></div>))}{isChatTyping && (<div className="flex justify-start"><div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-2"><Loader2 size={16} className="animate-spin text-indigo-600" /><span className="text-xs text-gray-400">Imali is thinking...</span></div></div>)}<div ref={chatEndRef} /></div><form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={t.typeMessage} className="flex-1 px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium" /><button type="submit" className="p-2 bg-[#1a1a1a] text-white rounded-xl hover:bg-black transition-all"><Send size={18} /></button></form></div>)}<button onClick={() => setIsChatOpen(!isChatOpen)} className="w-16 h-16 bg-[#1a1a1a] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative group overflow-hidden"><div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-150 rotate-45 group-hover:rotate-90 transition-transform duration-700" />{isChatOpen ? <X size={28} className="relative z-10" /> : <MessageSquare size={28} className="relative z-10" />}</button></div>
        </Layout>
      )}

      {selectedLoan && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
           <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
              <div className="bg-[#1a1a1a] p-8 text-white relative overflow-hidden"><div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-150 rotate-12" /><div className="flex justify-between items-start relative z-10"><div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Transaction Details</p><h3 className="text-3xl font-black tracking-tighter uppercase">{selectedLoan.id}</h3></div><button onClick={() => setSelectedLoan(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button></div></div>
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar relative">
                <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Borrower</p>
                    <p className="font-black text-gray-900 text-lg leading-tight">{selectedLoan.borrowerName}</p>
                    <p className="text-xs text-gray-500 font-medium">{selectedLoan.borrowerNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${selectedLoan.status === RepaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : selectedLoan.status === RepaymentStatus.OVERDUE ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      {selectedLoan.status === RepaymentStatus.PAID && <CheckCircle2 size={14} />}
                      {selectedLoan.status === RepaymentStatus.OVERDUE && <AlertTriangle size={14} />}
                      {selectedLoan.status === RepaymentStatus.PENDING && <Clock size={14} />}
                      {getTranslatedStatus(selectedLoan.status)}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 xhosa-pattern-sm opacity-[0.03]" />
                  <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Principal</p><p className="font-black text-gray-900 text-xl font-mono">R {selectedLoan.amountLoaned.toLocaleString()}</p></div>
                    <div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Due Date</p><p className="font-black text-gray-900 text-xl font-mono">{selectedLoan.dueDate}</p></div>
                    <div><p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Interest</p><p className="font-black text-indigo-600 text-xl font-mono">R {(selectedLoan.amountLoaned * (selectedLoan.interestRate/100)).toLocaleString()}</p></div>
                    <div className={calculatePenaltyDetails(selectedLoan).penalty > 0 ? 'animate-in zoom-in duration-300' : ''}>
                      <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-1">Penalty Applied</p>
                      <p className={`font-black text-xl font-mono ${calculatePenaltyDetails(selectedLoan).penalty > 0 ? 'text-rose-600' : 'text-gray-400'}`}>R {calculatePenaltyDetails(selectedLoan).penalty.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center relative z-10">
                    <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Total Outstanding</p>
                    <p className="text-3xl font-black text-gray-900 font-mono tracking-tighter">R {selectedLoan.status === RepaymentStatus.PAID ? '0.00' : (selectedLoan.totalRepayment + calculatePenaltyDetails(selectedLoan).penalty).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><History size={14} className="text-indigo-600" />Detailed Activity Log</h4>
                  <div className="space-y-4">
                    {selectedLoan.history.map((h, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm z-10 border-2 border-white" />
                          {i !== selectedLoan.history.length - 1 && <div className="w-0.5 h-full bg-gray-100 -mt-0.5" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{h.action}</p>
                          <p className="text-[10px] text-gray-500 font-bold font-mono">{h.date} {h.amount ? ` • R ${h.amount.toLocaleString()}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                <button onClick={() => setSelectedLoan(null)} className="flex-1 py-4 border-2 border-gray-200 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Close</button>
                {selectedLoan.status !== RepaymentStatus.PAID && (
                  <button onClick={() => handleMarkAsPaid(selectedLoan.id)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Mark as Paid
                  </button>
                )}
              </div>
           </div>
        </div>
      )}

      {selectedBorrowerId && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
              <div className="bg-[#1a1a1a] p-8 text-white relative overflow-hidden shrink-0"><div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-150 rotate-12" /><div className="flex justify-between items-start relative z-10"><div className="flex items-center gap-6"><div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl font-black shadow-2xl border border-white/10 relative overflow-hidden"><div className="absolute inset-0 xhosa-pattern opacity-10" />{borrowers.find(b => b.idNumber === selectedBorrowerId)?.name.split(' ').map(n => n[0]).join('')}</div><div><h3 className="text-3xl font-black tracking-tighter uppercase">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.name}</h3><div className="flex gap-4 mt-1 opacity-60"><p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Fingerprint size={12} /> {selectedBorrowerId}</p><p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Smartphone size={12} /> {borrowers.find(b => b.idNumber === selectedBorrowerId)?.phone}</p></div></div></div><button onClick={() => setSelectedBorrowerId(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button></div></div>
              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar relative">
                <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100 shadow-inner">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Repayment Health</p>
                    <p className="text-2xl font-black text-emerald-600">{((borrowers.find(b => b.idNumber === selectedBorrowerId)?.loans.filter(l => l.status === RepaymentStatus.PAID).length || 0) / (borrowers.find(b => b.idNumber === selectedBorrowerId)?.loans.length || 1) * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100 shadow-inner">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Paid To Date</p>
                    <p className="text-2xl font-black text-emerald-700 font-mono">R {(borrowers.find(b => b.idNumber === selectedBorrowerId)?.loans.reduce((acc, l) => {
                      const payment = l.history.find(h => h.action === 'Full Repayment Received');
                      return acc + (payment?.amount || 0);
                    }, 0) || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-rose-50/50 p-6 rounded-[32px] border border-rose-100 shadow-inner">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Current Active Debt</p>
                    <p className="text-2xl font-black text-rose-600 font-mono">R {borrowers.find(b => b.idNumber === selectedBorrowerId)?.loans.filter(l => l.status !== RepaymentStatus.PAID).reduce((acc, l) => acc + (l.totalRepayment + calculatePenaltyDetails(l).penalty), 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6"><h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2"><History size={16} className="text-indigo-600" />Borrower History</h4><div className="flex gap-2"><button onClick={() => setBorrowerSortKey('date')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${borrowerSortKey === 'date' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>By Date</button><button onClick={() => setBorrowerSortKey('status')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${borrowerSortKey === 'status' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>By Status</button></div></div>
                  <div className="space-y-4">{sortedBorrowerLoans.map((loan) => {
                    const paymentInfo = loan.history.find(h => h.action === 'Full Repayment Received');
                    return (
                      <div key={loan.id} className="flex items-center justify-between p-6 bg-white border border-gray-50 rounded-[32px] hover:shadow-md transition-all group">
                        <div className="flex items-center gap-6"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${loan.status === RepaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : loan.status === RepaymentStatus.OVERDUE ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{loan.status === RepaymentStatus.PAID ? <CheckCircle2 size={24} /> : <Clock size={24} />}</div><div><div className="flex items-center gap-2"><p className="font-black text-gray-900">{loan.id}</p><span className="text-[10px] text-gray-500 font-bold uppercase font-mono">{loan.startDate}</span></div><p className="text-xs text-gray-500">{loan.notes || 'No notes'}</p></div></div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Principal: R {loan.amountLoaned.toLocaleString()}</p>
                          <p className="font-black text-gray-900 text-lg font-mono">R {(loan.status === RepaymentStatus.PAID ? paymentInfo?.amount : (loan.totalRepayment + calculatePenaltyDetails(loan).penalty))?.toLocaleString() || '0'}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${loan.status === RepaymentStatus.PAID ? 'text-emerald-500' : loan.status === RepaymentStatus.OVERDUE ? 'text-rose-500' : 'text-amber-500'}`}>{loan.status === RepaymentStatus.PAID ? 'Fully Repaid' : getTranslatedStatus(loan.status)}</p>
                        </div>
                      </div>
                    );
                  })}</div>
                </div>
              </div>
              <div className="p-8 bg-gray-50 border-t border-gray-100"><button onClick={() => setSelectedBorrowerId(null)} className="w-full py-4 border-2 border-gray-200 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all shadow-sm">Close Profile</button></div>
           </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative cultural-card"><div className="bead-accent absolute top-0 left-0 w-full opacity-50" /><div className="p-8 border-b border-gray-50 flex justify-between items-center relative z-10 bg-gray-50/50"><h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">New Disbursement</h3><button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-50 rounded-full transition-all text-gray-400"><X size={24} /></button></div><form onSubmit={handleAddLoan} className="p-10 space-y-6 relative z-10 max-h-[70vh] overflow-y-auto custom-scrollbar"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.fullName}</label><input required value={newLoan.borrowerName} onChange={e => setNewLoan({...newLoan, borrowerName: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 shadow-inner" placeholder="e.g. Sipho Khumalo" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.idNumber}</label><input required value={newLoan.idNumber} onChange={e => setNewLoan({...newLoan, idNumber: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 font-mono shadow-inner" placeholder="ID Number" /></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.cellNumber}</label><input required value={newLoan.borrowerNumber} onChange={e => setNewLoan({...newLoan, borrowerNumber: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 font-mono shadow-inner" placeholder="Mobile" /></div></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.amount}</label><div className="relative"><span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">R</span><input type="number" required value={newLoan.amountLoaned || ''} onChange={e => setNewLoan({...newLoan, amountLoaned: Number(e.target.value)})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-black text-gray-900 font-mono text-xl shadow-inner" /></div></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.dueDate}</label><input type="date" required value={newLoan.dueDate} onChange={e => setNewLoan({...newLoan, dueDate: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 font-mono shadow-inner" /></div><div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Note / Context</label><textarea value={newLoan.notes} onChange={e => setNewLoan({...newLoan, notes: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 min-h-[100px] shadow-inner" placeholder="Ubuntu note..." /></div><div className="pt-6"><button type="submit" className="w-full py-5 bg-[#1a1a1a] text-white rounded-[24px] font-black text-lg uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all relative overflow-hidden group"><div className="absolute inset-0 opacity-10 xhosa-accent-pattern rotate-45 scale-150" /><span className="relative z-10">Confirm & Disburse</span></button></div></form></div>
        </div>
      )}

      {/* Edit Borrower Modal */}
      {isEditBorrowerModalOpen && editingBorrower && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative cultural-card">
              <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
              <div className="p-8 border-b border-gray-50 flex justify-between items-center relative z-10 bg-gray-50/50">
                 <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{t.editBorrower}</h3>
                 <button onClick={() => { setIsEditBorrowerModalOpen(false); setEditingBorrower(null); }} className="p-2 hover:bg-gray-50 rounded-full transition-all text-gray-400"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveBorrowerEdit} className="p-10 space-y-6 relative z-10">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.fullName}</label>
                    <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input required value={editingBorrower.name} onChange={e => setEditingBorrower({...editingBorrower, name: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 shadow-inner" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 opacity-60">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.idNumber} (Read Only)</label>
                       <div className="relative">
                          <Fingerprint size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input disabled value={editingBorrower.idNumber} className="w-full pl-12 pr-6 py-4 bg-gray-100 border-none rounded-2xl font-bold text-gray-500 font-mono" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{t.cellNumber}</label>
                       <div className="relative group">
                          <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                          <input required value={editingBorrower.phone} onChange={e => setEditingBorrower({...editingBorrower, phone: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 font-mono shadow-inner" />
                       </div>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Physical Address</label>
                    <div className="relative group">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      <input required value={editingBorrower.address} onChange={e => setEditingBorrower({...editingBorrower, address: e.target.value})} className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-gray-900 shadow-inner" />
                    </div>
                 </div>
                 <div className="pt-6">
                    <button type="submit" className="w-full py-5 bg-[#1a1a1a] text-white rounded-[24px] font-black text-lg uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all relative overflow-hidden group">
                       <div className="absolute inset-0 opacity-10 xhosa-accent-pattern rotate-45 scale-150" />
                       <span className="relative z-10">{t.saveChanges}</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {loanToRemind && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full max-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative text-center border border-white/10"><div className="bg-[#1a1a1a] p-10 text-white relative overflow-hidden group"><div className="absolute inset-0 xhosa-accent-pattern opacity-20 rotate-45 scale-150 group-hover:scale-125 transition-transform duration-700" /><div className="bead-accent absolute top-0 left-0 w-full opacity-50" /><div className="relative z-10"><div className="w-20 h-20 bg-emerald-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl rotate-3 relative overflow-hidden"><div className="absolute inset-0 xhosa-pattern opacity-20" /><Smartphone size={40} className="relative z-10" /></div><h3 className="text-2xl font-black uppercase tracking-tight">{t.whatsappReminder}</h3></div></div><div className="p-10 space-y-8 relative overflow-hidden"><div className="absolute bottom-0 right-0 p-4 opacity-[0.03] xhosa-pattern pointer-events-none" /><p className="text-gray-500 font-medium leading-relaxed relative z-10">{t.confirmReminder} <span className="font-black text-gray-900">{loanToRemind.borrowerName}</span>?</p><div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 space-y-4 text-left relative z-10 shadow-inner"><div className="absolute top-0 right-0 p-1 opacity-10 xhosa-pattern-sm" /><div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Outstanding</p><p className="text-2xl font-black text-indigo-900 font-mono tracking-tighter">R {(loanToRemind.totalRepayment + calculatePenaltyDetails(loanToRemind).penalty).toLocaleString()}</p></div><p className="text-[11px] text-indigo-600 font-bold italic leading-tight">"Molo {loanToRemind.borrowerName}, this is a reminder regarding your Imali loan..."</p></div><div className="flex gap-4 relative z-10"><button onClick={() => setLoanToRemind(null)} className="flex-1 py-4 border-2 border-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-50 transition-all shadow-sm">Cancel</button><button onClick={() => confirmAndSendWhatsApp(loanToRemind)} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"><Smartphone size={16} /> Send WhatsApp</button></div></div></div>
        </div>
      )}
    </div>
  );
};

export default App;
