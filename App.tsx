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
  Wallet, Briefcase, Calendar, ChevronLeft, Shield, Edit2, MessageCircle, MessageSquare, Loader2, ChevronDown, ChevronUp, Calculator as CalcIcon, ClipboardCheck, XCircle, Eye, ArrowUpDown, ArrowLeftRight, Lock, HelpCircle, Download, Trash2, AlertTriangle, PiggyBank, BarChart3, PieChart as PieIcon, ListChecks, Printer, Crown, ShieldAlert, Coins, Star, Heart
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

const StatusDot = ({ status }: { status: RepaymentStatus }) => {
  const colors = {
    [RepaymentStatus.PAID]: 'bg-emerald-500 shadow-emerald-200',
    [RepaymentStatus.OVERDUE]: 'bg-rose-500 shadow-rose-200 animate-pulse',
    [RepaymentStatus.PENDING]: 'bg-amber-500 shadow-amber-200',
    [RepaymentStatus.DEFAULTED]: 'bg-gray-400 shadow-gray-200',
  };
  return (
    <div className="flex items-center justify-center group/dot relative">
      <div 
        className={`w-3 h-3 rounded-full ${colors[status]} shadow-lg transition-transform group-hover/dot:scale-125`} 
      />
      <span className="absolute bottom-full mb-2 hidden group-hover/dot:block bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-md whitespace-nowrap z-50">
        {status}
      </span>
    </div>
  );
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('imali_loans_v1');
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditBorrowerModalOpen, setIsEditBorrowerModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [editingBorrower, setEditingBorrower] = useState<{ idNumber: string, name: string, address: string, phone: string } | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.LENDER); 
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatTyping, setIsChatTyping] = useState(false);

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

  const stats = useMemo(() => {
    const totalLoaned = loans.reduce((acc, l) => acc + l.amountLoaned, 0);
    const paidCount = loans.filter(l => l.status === RepaymentStatus.PAID).length;
    const repaymentRate = loans.length > 0 ? (paidCount / loans.length) * 100 : 0;
    const overdueCount = loans.filter(l => l.status === RepaymentStatus.OVERDUE).length;
    const activeBorrowersCount = new Set(loans.map(l => l.idNumber)).size;
    
    const totalOutstanding = loans.reduce((acc, l) => {
      if (l.status === RepaymentStatus.PAID) return acc;
      const { penalty } = calculatePenaltyDetails(l);
      return acc + l.totalRepayment + penalty;
    }, 0);

    return { totalLoaned, repaymentRate, overdueCount, activeBorrowers: activeBorrowersCount, totalOutstanding };
  }, [loans]);

  const statusDistributionData = useMemo(() => {
    const counts = {
      [RepaymentStatus.PAID]: loans.filter(l => l.status === RepaymentStatus.PAID).length,
      [RepaymentStatus.PENDING]: loans.filter(l => l.status === RepaymentStatus.PENDING).length,
      [RepaymentStatus.OVERDUE]: loans.filter(l => l.status === RepaymentStatus.OVERDUE).length,
    };
    return [
      { name: 'Paid', value: counts[RepaymentStatus.PAID], color: '#10b981' },
      { name: 'Pending', value: counts[RepaymentStatus.PENDING], color: '#f59e0b' },
      { name: 'Overdue', value: counts[RepaymentStatus.OVERDUE], color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [loans]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatTyping(true);
    
    try {
      const response = await getChatResponse(chatHistory, userMsg);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Error connecting to service." }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleRefreshInsights = async () => {
    setIsLoadingAi(true);
    try {
      const insight = await getCreditRiskInsights(loans);
      setAiInsight(insight);
    } catch (error) {
      setAiInsight("Failed to fetch insights.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleMarkAsPaid = (loanId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setLoans(prevLoans => prevLoans.map(loan => {
      if (loan.id === loanId) {
        const { penalty } = calculatePenaltyDetails(loan);
        const totalWithPenalty = loan.totalRepayment + penalty;
        return {
          ...loan,
          status: RepaymentStatus.PAID,
          history: [
            ...loan.history,
            { 
              date: today, 
              action: 'Full Repayment Received', 
              amount: totalWithPenalty 
            }
          ]
        };
      }
      return loan;
    }));
    setShowToast(t.updateSuccess);
    setTimeout(() => setShowToast(null), 3000);
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
    setShowToast(t.updateSuccess);
    setTimeout(() => setShowToast(null), 3000);
  };

  const getBorrowerHealth = (borrowerLoans: Loan[]) => {
    const hasOverdue = borrowerLoans.some(l => l.status === RepaymentStatus.OVERDUE);
    const paidCount = borrowerLoans.filter(l => l.status === RepaymentStatus.PAID).length;
    const totalCount = borrowerLoans.length;

    if (hasOverdue) return { label: 'Action Required', color: 'bg-rose-50 text-rose-600 border-rose-100', type: 'bad', icon: AlertTriangle };
    
    if (paidCount === totalCount && totalCount >= 3) {
      return { label: 'Elite Member', color: 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-500/10', type: 'elite', icon: Crown };
    }
    
    if (paidCount === totalCount && totalCount > 0) {
      return { label: 'Trusted Member', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/10', type: 'good', icon: CheckCircle2 };
    }
    
    return { label: 'Good Standing', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', type: 'neutral', icon: ShieldCheck };
  };

  useEffect(() => {
    localStorage.setItem('imali_loans_v1', JSON.stringify(loans));
  }, [loans]);

  const SummaryCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden cultural-card group hover:shadow-lg transition-all">
      <div className="flex items-center justify-between relative z-10">
        <div className={`p-4 rounded-2xl ${colorClass} shadow-sm group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      language={language}
      setLanguage={setLanguage}
      userRole={userRole}
      toggleRole={() => setUserRole(prev => prev === UserRole.LENDER ? UserRole.BORROWER : UserRole.LENDER)}
      onRefresh={handleRefreshInsights}
    >
      {showToast && (
        <div className="fixed top-8 right-8 z-[300] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase text-xs tracking-widest animate-in slide-in-from-right-8 duration-300 flex items-center gap-3">
          <CheckCircle2 size={18} /> {showToast}
        </div>
      )}

      <div className="space-y-8 animate-in fade-in duration-500">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard title={t.totalLoaned} value={`R ${stats.totalLoaned.toLocaleString()}`} icon={Wallet} colorClass="bg-indigo-50 text-indigo-600" />
              <SummaryCard title="Amount Outstanding" value={`R ${stats.totalOutstanding.toLocaleString()}`} icon={Coins} colorClass="bg-amber-50 text-amber-600" />
              <SummaryCard title={t.repaymentRate} value={`${stats.repaymentRate.toFixed(1)}%`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" />
              <SummaryCard title={t.overdue} value={stats.overdueCount} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-600" />
                  Disbursement Trends
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={loans.slice(-10).map(l => ({ name: l.borrowerName.split(' ')[0], amount: l.amountLoaned }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '1rem' }}
                        cursor={{ fill: '#f9fafb' }}
                      />
                      <Bar dataKey="amount" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 p-4 opacity-10 xhosa-accent-pattern scale-150 rotate-45" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg rotate-3"><Sparkles size={20} /></div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Imali Risk Analysis</h3>
                  </div>
                  <div className="flex-1">
                    {isLoadingAi ? (
                      <div className="flex flex-col items-center py-10 gap-4 opacity-50">
                        <Loader2 className="animate-spin text-indigo-400" size={32} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Analyzing ledger...</span>
                      </div>
                    ) : aiInsight ? (
                      <div className="bg-white/5 p-6 rounded-3xl border border-white/5 mb-6 max-h-[200px] overflow-y-auto custom-scrollbar">
                        <p className="text-sm leading-relaxed text-indigo-50">{aiInsight}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 mb-8 leading-relaxed">Let AI analyze your current community portfolio to identify risks and growth opportunities.</p>
                    )}
                  </div>
                  <button 
                    onClick={handleRefreshInsights}
                    disabled={isLoadingAi}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl disabled:opacity-50 mt-auto"
                  >
                    Refresh Analysis
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                  <PieIcon size={18} className="text-indigo-600" />
                  Loan Status Distribution
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        animationDuration={1500}
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '1rem' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        align="center"
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-600" />
                  Recent Ledger Entries
                </h3>
                <div className="space-y-4 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                  {loans.slice(-10).reverse().map((loan, idx) => (
                    <div key={loan.id + idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white shadow-sm`}>
                          <StatusDot status={loan.status} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900">{loan.borrowerName}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{loan.id} • R {loan.amountLoaned.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-900">{loan.startDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'borrowers' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="relative flex-1 max-w-md group">
                <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Khangela umboleki..."
                  className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium"
                />
              </div>
              <button onClick={() => setIsAddModalOpen(true)} className="px-8 py-4 bg-[#1a1a1a] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 hover:bg-black transition-all">
                <Plus size={18} /> New Borrower
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {borrowers.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())).map((borrower) => {
                const health = getBorrowerHealth(borrower.loans);
                const activeDebt = borrower.loans.filter(l => l.status !== RepaymentStatus.PAID).reduce((acc, l) => acc + (l.totalRepayment + calculatePenaltyDetails(l).penalty), 0);
                const HealthIcon = health.icon;
                const isElite = health.type === 'elite';
                const isGood = health.type === 'good';
                
                return (
                  <div key={borrower.idNumber} className={`group bg-white p-8 rounded-[3rem] border-2 transition-all duration-300 relative overflow-hidden cultural-card ${
                    isElite ? 'border-amber-200 shadow-xl shadow-amber-500/10' : 
                    isGood ? 'border-emerald-100 shadow-xl shadow-emerald-500/10' : 
                    health.type === 'bad' ? 'border-rose-100 shadow-xl shadow-rose-500/10' : 
                    'border-gray-50 shadow-sm'
                  }`}>
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] xhosa-accent-pattern scale-150 group-hover:rotate-12 transition-transform" />
                    
                    <div className="flex items-start justify-between mb-8 relative z-10">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl text-white shadow-lg relative overflow-hidden group-hover:scale-110 transition-transform ${
                        isElite ? 'bg-amber-600' : 
                        isGood ? 'bg-emerald-600' : 
                        health.type === 'bad' ? 'bg-rose-600' : 
                        'bg-indigo-600'
                      }`}>
                        <div className="absolute inset-0 xhosa-pattern opacity-10" />
                        {borrower.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-1.5 ${health.color}`}>
                        <HealthIcon size={12} className={health.type === 'bad' ? 'animate-pulse' : ''} />
                        {health.label}
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div>
                        <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1 flex items-center gap-2">
                          {borrower.name}
                          {isElite && <Crown size={16} className="text-amber-500" />}
                          {isGood && <CheckCircle2 size={16} className="text-emerald-500" />}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1"><Smartphone size={10} className="text-indigo-400" /> {borrower.phone}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1"><Fingerprint size={10} className="text-indigo-400" /> {borrower.idNumber}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 shadow-inner group-hover:bg-white transition-colors">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Portfolio</p>
                          <p className="font-black text-gray-900">{borrower.loans.length} Loans</p>
                        </div>
                        <div className={`p-4 rounded-3xl border shadow-inner transition-colors ${activeDebt > 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Debt</p>
                          <p className={`font-black font-mono ${activeDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>R {activeDebt.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setSelectedBorrowerId(borrower.idNumber)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${
                          isElite ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' : 
                          isGood ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 
                          'bg-gray-50 text-gray-900 border-gray-100 hover:bg-gray-100'
                        }`}>
                          <Eye size={14} /> Profile History
                        </button>
                        <button onClick={() => { setEditingBorrower({ idNumber: borrower.idNumber, name: borrower.name, address: borrower.address, phone: borrower.phone }); setIsEditBorrowerModalOpen(true); }} className="p-4 bg-white text-gray-400 rounded-2xl hover:text-indigo-600 transition-all border border-gray-100 shadow-sm">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden relative cultural-card flex flex-col h-[75vh]">
            <div className="absolute top-0 right-0 p-4 opacity-5 xhosa-accent-pattern scale-150" />
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 shrink-0">
               <div className="relative w-full md:w-80 group">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input placeholder="Search Ledger..." className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium shadow-inner" />
               </div>
               <button onClick={() => setIsAddModalOpen(true)} className="bg-[#1a1a1a] text-white px-8 py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center gap-3">
                 <Plus size={18} /> New Loan
               </button>
            </div>
            <div className="flex-1 overflow-auto relative z-10 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] sticky top-0 z-20 backdrop-blur-md">
                  <tr className="border-b border-gray-100">
                    <th className="px-8 py-6">Loan ID</th>
                    <th className="px-8 py-6">Borrower</th>
                    <th className="px-8 py-6">Principal</th>
                    <th className="px-8 py-6">Due Date</th>
                    <th className="px-8 py-6 text-center">Status</th>
                    <th className="px-8 py-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <div className="inline-block px-4 py-2 bg-[#1a1a1a] text-white rounded-xl font-black text-[11px] uppercase shadow-lg shadow-black/10 tracking-widest border-2 border-indigo-500/20">
                          {loan.id}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div>
                          <p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{loan.borrowerNumber}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-gray-900 font-mono">R {loan.amountLoaned.toLocaleString()}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={loan.status === RepaymentStatus.OVERDUE ? 'text-rose-500' : 'text-gray-400'} />
                          <span className={`text-xs font-bold ${loan.status === RepaymentStatus.OVERDUE ? 'text-rose-600' : 'text-gray-600'}`}>{loan.dueDate}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <StatusDot status={loan.status} />
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button onClick={() => setSelectedLoan(loan)} className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {['calculator', 'settings'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center p-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300">
            <Clock size={64} className="mb-6 opacity-20" />
            <h3 className="text-xl font-black uppercase tracking-[0.2em]">Under Construction</h3>
          </div>
        )}
      </div>

      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-8 right-8 md:bottom-12 md:right-12 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 hover:rotate-6 transition-all z-50 group border-2 border-white/20"
        >
          <div className="absolute inset-0 xhosa-pattern opacity-10 group-hover:opacity-20 transition-opacity" />
          <MessageCircle size={28} className="relative z-10" />
        </button>
      )}

      {isChatOpen && (
        <div className="fixed bottom-24 right-4 md:right-10 w-[calc(100%-2rem)] md:w-96 h-[550px] bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          <div className="p-6 bg-[#1a1a1a] text-white flex justify-between items-center relative shrink-0">
            <div className="absolute inset-0 xhosa-pattern opacity-5 pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare size={20} />
              </div>
              <h4 className="font-black uppercase tracking-tight text-sm">Assistant</h4>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 custom-scrollbar">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-gray-800 shadow-sm border border-gray-100'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>
          <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about loans..."
              className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
            />
            <button 
              onClick={handleSendChat}
              disabled={!chatInput.trim() || isChatTyping}
              className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}

      {isEditBorrowerModalOpen && editingBorrower && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#1a1a1a] p-8 text-white relative">
              <div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-150 rotate-12" />
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-2xl font-black tracking-tighter uppercase">{t.editBorrower}</h3>
                <button onClick={() => setIsEditBorrowerModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
              </div>
            </div>
            <form onSubmit={handleSaveBorrowerEdit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">{t.fullName}</label>
                <input 
                  required
                  value={editingBorrower.name}
                  onChange={(e) => setEditingBorrower({...editingBorrower, name: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">{t.cellNumber}</label>
                <input 
                  required
                  value={editingBorrower.phone}
                  onChange={(e) => setEditingBorrower({...editingBorrower, phone: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Physical Address</label>
                <textarea 
                  required
                  value={editingBorrower.address}
                  onChange={(e) => setEditingBorrower({...editingBorrower, address: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all h-24 resize-none"
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsEditBorrowerModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2">
                  <Save size={16} /> {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBorrowerId && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
            <div className="bg-[#1a1a1a] p-10 text-white relative shrink-0">
              <div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-150 rotate-12" />
              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-3xl font-black shadow-2xl">
                    {borrowers.find(b => b.idNumber === selectedBorrowerId)?.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tighter uppercase">{borrowers.find(b => b.idNumber === selectedBorrowerId)?.name}</h3>
                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">{selectedBorrowerId}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedBorrowerId(null)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar relative">
              <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Loan History</h4>
                <div className="space-y-4">
                  {borrowers.find(b => b.idNumber === selectedBorrowerId)?.loans.map(loan => (
                    <div key={loan.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border bg-white">
                          <StatusDot status={loan.status} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{loan.id}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{loan.startDate} • R {loan.amountLoaned.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900 font-mono text-lg">R {loan.totalRepayment.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setSelectedBorrowerId(null)} className="w-full py-5 bg-white border border-gray-200 text-gray-500 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all">Close History</button>
            </div>
          </div>
        </div>
      )}

      {selectedLoan && (
        <div className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col">
            <div className="bg-[#1a1a1a] p-8 text-white relative shrink-0">
              <div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-150 rotate-12" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Transaction</p>
                  <h3 className="text-3xl font-black tracking-tighter uppercase">{selectedLoan.id}</h3>
                </div>
                <button onClick={() => setSelectedLoan(null)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Borrower</h4>
                  <p className="text-xl font-black text-gray-900">{selectedLoan.borrowerName}</p>
                  <p className="text-xs text-gray-500 font-medium">{selectedLoan.borrowerNumber}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-right">Current Status</h4>
                  <div className="flex justify-end"><StatusDot status={selectedLoan.status} /></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 space-y-4">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase">Principal</span><span className="font-black text-gray-900 font-mono">R {selectedLoan.amountLoaned.toLocaleString()}</span></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase">Interest</span><span className="font-black text-indigo-600 font-mono">R {(selectedLoan.amountLoaned * selectedLoan.interestRate / 100).toLocaleString()}</span></div>
                {calculatePenaltyDetails(selectedLoan).penalty > 0 && (
                  <div className="flex justify-between items-center text-rose-600 animate-in slide-in-from-top-2"><span className="text-xs font-black uppercase">Active Penalty</span><span className="font-black font-mono">+ R {calculatePenaltyDetails(selectedLoan).penalty.toLocaleString()}</span></div>
                )}
                <div className="pt-4 border-t border-gray-200 flex justify-between items-center"><span className="text-sm font-black uppercase text-gray-900">Total Outstanding</span><span className="text-2xl font-black text-gray-900 font-mono">R {(selectedLoan.totalRepayment + calculatePenaltyDetails(selectedLoan).penalty).toLocaleString()}</span></div>
              </div>
              {selectedLoan.status !== RepaymentStatus.PAID && (
                <button onClick={() => { handleMarkAsPaid(selectedLoan.id); setSelectedLoan(null); }} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                  <CheckCircle2 size={18} /> Mark as Fully Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;