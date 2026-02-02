
import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import Layout from './components/Layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Loan, RepaymentStatus, PayoutMethod, Language, UserSettings, UserRole, ApplicationStatus, ChatMessage } from './types';
import { 
  TrendingUp, AlertCircle, CheckCircle2, Clock, Plus, Phone, CreditCard,
  X, Check, User, MapPin, Fingerprint,
  Send, Smartphone, ShieldCheck, Bell, Mail, Save, Search, 
  Wallet, ArrowRight,
  Edit2, MessageCircle, MessageSquare, Loader2, Calculator as CalcIcon, Eye, ArrowLeftRight, Trash2, AlertTriangle, Coins, Crown, Sparkles, ToggleLeft, ToggleRight,
  ClipboardList,
  Building,
  Activity,
  Info,
  Briefcase
} from 'lucide-react';
import { getCreditRiskInsights, getChatResponse } from './services/geminiService';
import { 
  DEFAULT_INTEREST_RATE, 
  DEFAULT_PENALTY_RATE,
  INITIAL_LOANS, 
  TRANSLATIONS,
  LOAN_TEMPLATES,
  SA_BANKS
} from './constants';

const StatusDot = ({ status }: { status: RepaymentStatus }) => {
  const colors = {
    [RepaymentStatus.PAID]: 'bg-emerald-500 shadow-emerald-200 ring-emerald-100',
    [RepaymentStatus.OVERDUE]: 'bg-rose-500 shadow-rose-200 animate-pulse ring-rose-100',
    [RepaymentStatus.PENDING]: 'bg-amber-500 shadow-amber-200 ring-amber-100',
    [RepaymentStatus.DEFAULTED]: 'bg-gray-400 shadow-gray-200 ring-gray-100',
  };
  return (
    <div className="flex items-center justify-center group/dot relative">
      <div className={`w-3.5 h-3.5 rounded-full ${colors[status]} shadow-lg ring-4 transition-transform group-hover/dot:scale-125`} />
      <span className="absolute bottom-full mb-2 hidden group-hover/dot:block bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-md whitespace-nowrap z-50">
        {status}
      </span>
    </div>
  );
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.LENDER); 
  
  // Persistent Loans
  const [loans, setLoans] = useState<Loan[]>(() => {
    const saved = localStorage.getItem('imali_loans_v1');
    return saved ? JSON.parse(saved) : INITIAL_LOANS;
  });

  // Persistent Settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('imali_settings_v1');
    return saved ? JSON.parse(saved) : {
      overdueAlerts: true,
      whatsappAutomation: true,
      emailReports: true,
      emailNewAppAlerts: true,
      emailOverdueAlerts: true,
      darkMode: false
    };
  });

  // Calculator State
  const [calcAmount, setCalcAmount] = useState(1000);
  const [calcWeeks, setCalcWeeks] = useState(4);

  // Modals & UI
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Borrower Portal States
  const [borrowerSearchId, setBorrowerSearchId] = useState('');
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [hasSearchedMyLoans, setHasSearchedMyLoans] = useState(false);
  const [borrowerActiveView, setBorrowerActiveView] = useState<'track' | 'apply'>('track');

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
        map.set(loan.idNumber, { idNumber: loan.idNumber, name: loan.borrowerName, address: loan.physicalAddress, phone: loan.borrowerNumber, loans: [] });
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
    const totalOutstanding = loans.reduce((acc, l) => {
      if (l.status === RepaymentStatus.PAID) return acc;
      const { penalty } = calculatePenaltyDetails(l);
      return acc + l.totalRepayment + penalty;
    }, 0);
    return { totalLoaned, repaymentRate, overdueCount, totalOutstanding };
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
      setChatHistory(prev => [...prev, { role: 'model', text: "Service unavailable." }]);
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
        return { ...loan, status: RepaymentStatus.PAID, history: [...loan.history, { date: today, action: 'Full Repayment Received', amount: totalWithPenalty }] };
      }
      return loan;
    }));
    setShowToast(t.updateSuccess);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleMarkAsPending = (loanId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setLoans(prevLoans => prevLoans.map(loan => {
      if (loan.id === loanId) {
        return { 
          ...loan, 
          status: RepaymentStatus.PENDING, 
          history: [...loan.history, { date: today, action: 'Marked as Pending' }] 
        };
      }
      return loan;
    }));
    setShowToast("Status updated to Pending");
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleSendReminder = (loan: Loan) => {
    setShowToast(`WhatsApp reminder sent to ${loan.borrowerName}`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleAddLoan = (newLoan: Loan) => {
    setLoans(prev => [...prev, newLoan]);
    setIsAddModalOpen(false);
    setShowToast("New loan created successfully!");
    setTimeout(() => setShowToast(null), 3000);
  };

  const getBorrowerHealth = (borrowerLoans: Loan[]) => {
    const hasOverdue = borrowerLoans.some(l => l.status === RepaymentStatus.OVERDUE);
    const paidCount = borrowerLoans.filter(l => l.status === RepaymentStatus.PAID).length;
    const totalCount = borrowerLoans.length;
    if (hasOverdue) return { label: 'Action Required', color: 'bg-rose-50 text-rose-600 border-rose-100', type: 'bad', icon: AlertTriangle };
    if (paidCount === totalCount && totalCount >= 3) return { label: 'Elite Member', color: 'bg-amber-50 text-amber-600 border-amber-200', type: 'elite', icon: Crown };
    if (paidCount === totalCount && totalCount > 0) return { label: 'Trusted Member', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', type: 'good', icon: CheckCircle2 };
    return { label: 'Good Standing', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', type: 'neutral', icon: ShieldCheck };
  };

  const handleSearchMyLoans = () => {
    const results = loans.filter(l => l.idNumber === borrowerSearchId || l.borrowerNumber === borrowerSearchId);
    setMyLoans(results);
    setHasSearchedMyLoans(true);
  };

  useEffect(() => {
    localStorage.setItem('imali_loans_v1', JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem('imali_settings_v1', JSON.stringify(settings));
  }, [settings]);

  // ---------------------------------------------------------------------------
  // RENDER: BORROWER PORTAL
  // ---------------------------------------------------------------------------

  if (userRole === UserRole.BORROWER) {
    return (
      <Layout
        activeTab={activeTab} setActiveTab={setActiveTab}
        language={language} setLanguage={setLanguage}
        userRole={userRole} toggleRole={() => setUserRole(UserRole.LENDER)}
      >
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
          {/* Borrower Hero Section */}
          <div className="bg-white rounded-[3.5rem] p-12 border border-gray-100 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-600"><Sparkles size={160} /></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <h2 className="text-5xl font-black tracking-tighter text-gray-900 leading-none">Welcome to the Borrower Portal</h2>
                <p className="text-lg text-gray-500 font-medium">Manage your loans, track payments, or apply for new financial support in a few simple steps.</p>
                <div className="flex gap-4 pt-4">
                   <button 
                     onClick={() => setBorrowerActiveView('track')}
                     className={`px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${borrowerActiveView === 'track' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                   >
                     <Search size={18} /> Track My Loan
                   </button>
                   <button 
                     onClick={() => setBorrowerActiveView('apply')}
                     className={`px-8 py-4 rounded-3xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${borrowerActiveView === 'apply' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                   >
                     <ClipboardList size={18} /> Apply for Loan
                   </button>
                </div>
              </div>
              <div className="w-full md:w-80 h-80 bg-indigo-50 rounded-[3rem] border-2 border-dashed border-indigo-200 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 xhosa-pattern opacity-10" />
                <div className="text-center relative z-10">
                  <Coins size={64} className="text-indigo-400 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Village Lending Motif</p>
                </div>
              </div>
            </div>
          </div>

          {/* View Content */}
          {borrowerActiveView === 'track' ? (
            <div className="space-y-8">
              <div className="bg-[#1a1a1a] p-10 rounded-[3rem] text-white shadow-2xl space-y-6 relative overflow-hidden">
                <div className="absolute inset-0 xhosa-pattern opacity-5 rotate-12" />
                <h3 className="text-xl font-black uppercase tracking-widest relative z-10">Search My Records</h3>
                <div className="flex flex-col md:flex-row gap-4 relative z-10">
                  <input 
                    value={borrowerSearchId}
                    onChange={(e) => setBorrowerSearchId(e.target.value)}
                    placeholder="Enter ID Number or Mobile..."
                    className="flex-1 px-8 py-5 bg-white/10 border border-white/20 rounded-3xl text-white font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                  />
                  <button onClick={handleSearchMyLoans} className="px-10 py-5 bg-white text-gray-900 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Find My Loan</button>
                </div>
              </div>

              {hasSearchedMyLoans && (
                <div className="animate-in slide-in-from-bottom-8 duration-500 space-y-6">
                  {myLoans.length > 0 ? (
                    myLoans.map(loan => (
                      <div key={loan.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-8">
                           <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 shadow-sm">
                              <StatusDot status={loan.status} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{loan.id}</p>
                              <h4 className="text-2xl font-black text-gray-900 leading-tight">R {loan.amountLoaned.toLocaleString()}</h4>
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">Due on {loan.dueDate}</p>
                           </div>
                        </div>
                        <div className="text-center md:text-right space-y-1">
                           <p className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${loan.status === RepaymentStatus.PAID ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                              {loan.status}
                           </p>
                           <p className="text-xs text-gray-400 font-black uppercase tracking-widest pt-2">Total Balance: R {(loan.totalRepayment + calculatePenaltyDetails(loan).penalty).toLocaleString()}</p>
                        </div>
                        <button onClick={() => setSelectedLoan(loan)} className="p-5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.5rem] border border-gray-100 transition-all">
                           <Eye size={24} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white p-24 rounded-[3.5rem] border-2 border-dashed border-gray-100 text-center text-gray-300">
                      <AlertCircle size={64} className="mx-auto mb-6 opacity-20" />
                      <p className="text-xl font-black uppercase tracking-widest">No matching records found.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm animate-in zoom-in-95 duration-500">
              <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-8 uppercase">Loan Application</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Legal Name</label>
                       <input className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner" placeholder="As per SA ID Document" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">ID Number</label>
                       <input className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner" placeholder="13 Digit National ID" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Loan Amount (R)</label>
                       <select className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner appearance-none">
                          <option>R 500</option>
                          <option>R 1,000</option>
                          <option>R 2,500</option>
                          <option>R 5,000</option>
                       </select>
                    </div>
                 </div>
                 <div className="space-y-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Purpose</label>
                       <textarea className="w-full h-[120px] px-8 py-5 bg-gray-50 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-indigo-600 transition-all shadow-inner resize-none" placeholder="What will you use the funds for?" />
                    </div>
                    <div className="p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 space-y-4">
                       <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase">Estimated Repayment</span><span className="font-black text-indigo-600">Calculated on Approval</span></div>
                       <p className="text-[10px] text-indigo-400 font-bold leading-relaxed">By submitting, you consent to a credit check and agree to our community lending terms.</p>
                    </div>
                 </div>
              </div>
              <div className="mt-12">
                 <button className="w-full py-6 bg-[#1a1a1a] text-white rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-4">
                   <Send size={20} /> Submit Application
                 </button>
              </div>
            </div>
          )}
        </div>
        {selectedLoan && <LoanDetailModal loan={selectedLoan} onClose={() => setSelectedLoan(null)} onPay={handleMarkAsPaid} onMarkPending={handleMarkAsPending} calcPenalty={calculatePenaltyDetails} />}
      </Layout>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: LENDER PAGE (LEDGER / DASHBOARD)
  // ---------------------------------------------------------------------------

  return (
    <Layout
      activeTab={activeTab} setActiveTab={setActiveTab}
      language={language} setLanguage={setLanguage}
      userRole={userRole} toggleRole={() => setUserRole(UserRole.BORROWER)}
      onRefresh={handleRefreshInsights}
    >
      {showToast && <div className="fixed top-8 right-8 z-[300] bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3"><CheckCircle2 size={18} /> {showToast}</div>}

      <div className="space-y-10 animate-in fade-in duration-500 pb-20">
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard title="Total Loaned" value={`R ${stats.totalLoaned.toLocaleString()}`} icon={Wallet} colorClass="bg-indigo-50 text-indigo-600" />
              <SummaryCard title="Outstanding" value={`R ${stats.totalOutstanding.toLocaleString()}`} icon={Coins} colorClass="bg-amber-50 text-amber-600" />
              <SummaryCard title="Repayment Rate" value={`${stats.repaymentRate.toFixed(1)}%`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" />
              <SummaryCard title="Overdue" value={stats.overdueCount} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" />
            </div>

            {/* AI and Trends Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-10 flex items-center gap-2"><Activity size={20} className="text-indigo-600" /> Disbursement Activity</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={loans.slice(-12).map(l => ({ name: l.borrowerName.split(' ')[0], amount: l.amountLoaned }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                        <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '1rem' }} />
                        <Bar dataKey="amount" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-[#1a1a1a] rounded-[3.5rem] p-10 text-white shadow-2xl flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 text-indigo-400 group-hover:scale-110 transition-transform duration-700"><Sparkles size={120} /></div>
                  <div className="relative z-10 flex flex-col h-full space-y-8">
                     <div className="flex items-center gap-3"><div className="p-3 bg-indigo-600 rounded-2xl shadow-lg"><Sparkles size={24} /></div><h3 className="font-black uppercase tracking-widest text-xs">AI Risk Analysis</h3></div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {isLoadingAi ? <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-400" size={40} /></div> :
                        aiInsight ? <div className="bg-white/5 p-6 rounded-3xl border border-white/5"><p className="text-sm leading-relaxed text-indigo-50 font-medium">{aiInsight}</p></div> :
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">Review patterns, motifs, and borrower stability using our advanced Ubuntu-scoring AI engine.</p>}
                     </div>
                     <button onClick={handleRefreshInsights} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-[0.97]">Regenerate Analysis</button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* Lender Page: Ledger (Loans Table with Required Columns) */}
        {activeTab === 'loans' && (
          <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden relative flex flex-col h-[75vh]">
             <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10 shrink-0">
                <div className="relative w-full md:w-96 group">
                   <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                   <input 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Transaction ID, Name..." 
                    className="w-full pl-14 pr-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium shadow-inner" 
                   />
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-[#1a1a1a] text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center gap-4">
                  <Plus size={20} /> Add New Entry
                </button>
             </div>
             <div className="flex-1 overflow-auto relative z-10 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] sticky top-0 z-20 backdrop-blur-md">
                      <tr className="border-b border-gray-100">
                         <th className="px-10 py-8">Transaction ID</th>
                         <th className="px-10 py-8">Borrower Name</th>
                         <th className="px-10 py-8">Borrower Number</th>
                         <th className="px-10 py-8">Amount Loaned</th>
                         <th className="px-10 py-8">
                            <div className="flex items-center gap-2">
                               Total Amount Due
                               <div className="group/total-info relative cursor-help">
                                  <Info size={14} className="text-gray-400 hover:text-indigo-600 transition-colors" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/total-info:block w-48 p-4 bg-[#1a1a1a] text-white text-[10px] font-medium leading-relaxed rounded-2xl shadow-2xl z-50">
                                     <p className="font-black uppercase tracking-widest text-indigo-400 mb-1">Calculation Motif</p>
                                     Principal + Interest + (Penalty % x Principal per week overdue).
                                  </div>
                               </div>
                            </div>
                         </th>
                         <th className="px-10 py-8 text-center">Status</th>
                         <th className="px-10 py-8 text-center">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {loans.filter(l => 
                        l.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        l.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        l.borrowerNumber.includes(searchTerm)
                      ).map((loan) => {
                         const penaltyInfo = calculatePenaltyDetails(loan);
                         const totalDue = loan.totalRepayment + penaltyInfo.penalty;
                         
                         return (
                           <tr key={loan.id} className="hover:bg-indigo-50/20 transition-all group">
                              <td className="px-10 py-8">
                                 <div className="inline-block px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl font-black text-[11px] uppercase border-2 border-indigo-500/20 shadow-lg shadow-black/5">
                                   {loan.id}
                                 </div>
                              </td>
                              <td className="px-10 py-8 font-black text-gray-900 text-sm tracking-tight">{loan.borrowerName}</td>
                              <td className="px-10 py-8 font-bold text-gray-400 text-xs">{loan.borrowerNumber}</td>
                              <td className="px-10 py-8">
                                 <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-500 font-mono text-sm">R {loan.amountLoaned.toLocaleString()}</span>
                                    {penaltyInfo.penalty > 0 && (
                                      <div className="group/penalty relative flex items-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-sm shadow-rose-200" />
                                        <AlertTriangle size={14} className="text-rose-500 ml-1.5" />
                                        <span className="absolute left-full ml-3 hidden group-hover/penalty:block bg-rose-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg whitespace-nowrap z-50 shadow-xl ring-2 ring-white/20">
                                          Penalty Applied
                                        </span>
                                      </div>
                                    )}
                                 </div>
                              </td>
                              <td className="px-10 py-8">
                                 <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                       <span className="font-black text-gray-900 font-mono text-base">
                                          R {totalDue.toLocaleString()}
                                       </span>
                                       {penaltyInfo.penalty > 0 && (
                                          <div className="group/row-penalty relative cursor-help">
                                             <Info size={12} className="text-rose-500" />
                                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/row-penalty:block w-40 p-3 bg-white border border-rose-100 text-gray-600 text-[10px] font-bold rounded-xl shadow-xl z-50">
                                                {loan.penaltyRate}% penalty applied for {penaltyInfo.weeks} week(s) overdue.
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                    {penaltyInfo.penalty > 0 && (
                                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Incl. Penalties</span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-10 py-8 text-center"><StatusDot status={loan.status} /></td>
                              <td className="px-10 py-8">
                                 <div className="flex items-center justify-center gap-2">
                                    <button 
                                      onClick={() => setSelectedLoan(loan)} 
                                      title="View Details"
                                      className="p-3 bg-white text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 shadow-sm"
                                    >
                                       <Eye size={18} />
                                    </button>

                                    {loan.status !== RepaymentStatus.PAID && (
                                      <button 
                                        onClick={() => handleSendReminder(loan)}
                                        title="Send WhatsApp Reminder"
                                        className="p-3 bg-white text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-xl transition-all border border-gray-100 shadow-sm"
                                      >
                                         <MessageSquare size={18} />
                                      </button>
                                    )}

                                    {loan.status !== RepaymentStatus.PAID && (
                                      <button 
                                        onClick={() => handleMarkAsPaid(loan.id)}
                                        title="Mark as Paid"
                                        className="p-3 bg-white text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-xl transition-all border border-gray-100 shadow-sm"
                                      >
                                         <Check size={18} />
                                      </button>
                                    )}

                                    {loan.status !== RepaymentStatus.PENDING && loan.status !== RepaymentStatus.PAID && (
                                      <button 
                                        onClick={() => handleMarkAsPending(loan.id)}
                                        title="Mark as Pending"
                                        className="p-3 bg-white text-amber-600 hover:text-white hover:bg-amber-600 rounded-xl transition-all border border-gray-100 shadow-sm"
                                      >
                                         <Clock size={18} />
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

        {/* Other Management Tabs */}
        {activeTab === 'borrowers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {borrowers.map(borrower => {
                const health = getBorrowerHealth(borrower.loans);
                const Icon = health.icon;
                return (
                  <div key={borrower.idNumber} className={`group bg-white p-10 rounded-[3.5rem] border-2 transition-all duration-500 hover:shadow-2xl relative overflow-hidden ${health.type === 'elite' ? 'border-amber-200 shadow-amber-500/5' : health.type === 'good' ? 'border-emerald-100 shadow-emerald-500/5' : 'border-gray-50'}`}>
                     <div className="flex items-start justify-between mb-10">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-xl">{borrower.name[0]}</div>
                        <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${health.color}`}><Icon size={12} /> {health.label}</div>
                     </div>
                     <div className="space-y-6">
                        <div><h4 className="text-2xl font-black text-gray-900 tracking-tighter leading-none mb-2">{borrower.name}</h4><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{borrower.phone}</p></div>
                        <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 shadow-inner group-hover:bg-white transition-colors"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Lifetime Portfolio</p><p className="font-black text-gray-900 text-lg">{borrower.loans.length} Loans Issued</p></div>
                        <button onClick={() => setSelectedBorrowerId(borrower.idNumber)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all">View Full Profile</button>
                     </div>
                  </div>
                );
             })}
          </div>
        )}

        {/* Shared Financial Projections Tool */}
        {activeTab === 'calculator' && (
           <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-12 duration-700">
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full bead-accent opacity-20" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  <div className="space-y-12">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Growth Calculator</h3>
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-4"><label className="text-sm font-black text-gray-400 uppercase tracking-widest">Principal Amount</label><span className="text-2xl font-black text-indigo-600 font-mono">R {calcAmount}</span></div>
                        <input type="range" min="100" max="10000" step="100" value={calcAmount} onChange={(e) => setCalcAmount(parseInt(e.target.value))} className="w-full h-3 bg-indigo-50 rounded-xl appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-4"><label className="text-sm font-black text-gray-400 uppercase tracking-widest">Loan Period</label><span className="text-2xl font-black text-indigo-600 font-mono">{calcWeeks} Weeks</span></div>
                        <input type="range" min="1" max="52" step="1" value={calcWeeks} onChange={(e) => setCalcWeeks(parseInt(e.target.value))} className="w-full h-3 bg-indigo-50 rounded-xl appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#1a1a1a] p-12 rounded-[3rem] text-white flex flex-col justify-center items-center text-center space-y-6 shadow-2xl relative group">
                    <div className="absolute inset-0 opacity-10 xhosa-pattern rotate-45 scale-150 group-hover:rotate-90 transition-transform duration-[2000ms]" />
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Estimated Repayment</p>
                    <p className="text-6xl font-black tracking-tighter leading-none">R {Math.round(calcAmount * (1 + DEFAULT_INTEREST_RATE/100)).toLocaleString()}</p>
                    <div className="w-24 h-1 bg-indigo-600/30 rounded-full" />
                    <div className="flex justify-between w-full px-8"><span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Weekly Motif</span><span className="font-black text-indigo-400 text-lg">R {Math.round((calcAmount * (1 + DEFAULT_INTEREST_RATE/100)) / calcWeeks).toLocaleString()}</span></div>
                  </div>
                </div>
              </div>
           </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-500">
             <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 relative">
                <h3 className="text-3xl font-black text-gray-900 tracking-tighter mb-12 uppercase">Preferences</h3>
                <div className="divide-y divide-gray-50">
                  <SettingToggle icon={Bell} title="System Alerts" description="Status updates for all active ledger entries." isActive={settings.overdueAlerts} onToggle={() => setSettings({...settings, overdueAlerts: !settings.overdueAlerts})} />
                  <SettingToggle icon={MessageSquare} title="WhatsApp Sync" description="Enable automated Ubuntu reminders to clients." isActive={settings.whatsappAutomation} onToggle={() => setSettings({...settings, whatsappAutomation: !settings.whatsappAutomation})} />
                  <SettingToggle icon={Mail} title="Weekly Motif Report" description="Receive a full portfolio breakdown via email." isActive={settings.emailReports} onToggle={() => setSettings({...settings, emailReports: !settings.emailReports})} />
                </div>
                <div className="pt-12">
                   <button className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">Save Operations Motif</button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Shared Modals */}
      {selectedLoan && <LoanDetailModal loan={selectedLoan} onClose={() => setSelectedLoan(null)} onPay={handleMarkAsPaid} onMarkPending={handleMarkAsPending} calcPenalty={calculatePenaltyDetails} />}
      {selectedBorrowerId && <BorrowerHistoryModal borrower={borrowers.find(b => b.idNumber === selectedBorrowerId)!} onClose={() => setSelectedBorrowerId(null)} calcPenalty={calculatePenaltyDetails} />}
      {isAddModalOpen && <AddLoanModal onClose={() => setIsAddModalOpen(false)} onAdd={handleAddLoan} />}
      
      {/* AI Chat Assistant */}
      <ChatAssistant isOpen={isChatOpen} setIsOpen={setIsChatOpen} chatHistory={chatHistory} chatInput={chatInput} setChatInput={setChatInput} handleSendChat={handleSendChat} isChatTyping={isChatTyping} />
    </Layout>
  );
};

// --- SUB-COMPONENTS ---

const SettingToggle = ({ icon: Icon, title, description, isActive, onToggle }: any) => (
  <div className="py-10 flex items-center justify-between group">
    <div className="flex items-center gap-8">
      <div className={`p-5 rounded-2xl border transition-all ${isActive ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}><Icon size={28} /></div>
      <div><p className="font-black text-gray-900 text-lg tracking-tight uppercase">{title}</p><p className="text-sm text-gray-400 font-medium">{description}</p></div>
    </div>
    <button onClick={onToggle} className="transition-all p-2">{isActive ? <ToggleRight size={56} className="text-indigo-600" /> : <ToggleLeft size={56} className="text-gray-200" />}</button>
  </div>
);

const SummaryCard = ({ title, value, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all">
    <div className="flex items-center justify-between relative z-10">
      <div className={`p-5 rounded-[1.5rem] ${colorClass} shadow-lg group-hover:scale-110 transition-transform`}><Icon size={28} /></div>
      <div className="text-right">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{title}</p>
        <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  </div>
);

const LoanDetailModal = ({ loan, onClose, onPay, onMarkPending, calcPenalty }: any) => (
  <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md flex items-center justify-center p-6">
    <div className="bg-white w-full max-w-xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col">
      <div className="bg-[#1a1a1a] p-12 text-white relative shrink-0">
        <div className="flex justify-between items-start relative z-10">
          <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Transaction Ledger</p><h3 className="text-4xl font-black tracking-tighter uppercase">{loan.id}</h3></div>
          <button onClick={onClose} className="p-4 hover:bg-white/10 rounded-full transition-all border border-white/10"><X size={28} /></button>
        </div>
      </div>
      <div className="p-12 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Borrower</h4>
            <p className="text-2xl font-black text-gray-900">{loan.borrowerName}</p>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{loan.borrowerNumber}</p>
            {loan.employer && <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1 flex items-center gap-1"><Briefcase size={12} /> {loan.employer} ({loan.employmentStatus})</p>}
          </div>
          <div className="text-right"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-right">Repayment Status</h4><div className="flex justify-end"><StatusDot status={loan.status} /></div></div>
        </div>
        
        <div className="bg-indigo-50/50 rounded-[2.5rem] p-10 border border-indigo-100/50 space-y-6">
          <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-500 uppercase tracking-widest">Principal</span><span className="font-black text-gray-900 text-lg">R {loan.amountLoaned.toLocaleString()}</span></div>
          <div className="flex justify-between items-center"><span className="text-xs font-black text-gray-500 uppercase tracking-widest">Calculated Interest</span><span className="font-black text-indigo-600 text-lg">R {(loan.amountLoaned * loan.interestRate / 100).toLocaleString()}</span></div>
          {calcPenalty(loan).penalty > 0 && <div className="flex justify-between items-center text-rose-600"><span className="text-xs font-black uppercase">Active Penalty</span><span className="font-black text-lg">+ R {calcPenalty(loan).penalty.toLocaleString()}</span></div>}
          <div className="pt-6 border-t border-indigo-100 flex justify-between items-center"><span className="text-sm font-black uppercase text-gray-900 tracking-widest">Total Repayment Due</span><span className="text-4xl font-black text-gray-900 font-mono">R {(loan.totalRepayment + calcPenalty(loan).penalty).toLocaleString()}</span></div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Actions</h4>
          <div className="grid grid-cols-2 gap-4">
            {loan.status !== RepaymentStatus.PAID && (
              <button onClick={() => { onPay(loan.id); onClose(); }} className="py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                <CheckCircle2 size={18} /> Mark Paid
              </button>
            )}
            {loan.status !== RepaymentStatus.PENDING && loan.status !== RepaymentStatus.PAID && (
              <button onClick={() => { onMarkPending(loan.id); onClose(); }} className="py-5 bg-amber-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-3">
                <Clock size={18} /> Mark Pending
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Audit History</h4>
          <div className="space-y-3">
            {loan.history.map((h: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{h.action}</span>
                  <span className="text-[9px] text-gray-400 font-bold">{h.date}</span>
                </div>
                {h.amount && <span className="font-black text-indigo-600 text-xs font-mono">R {h.amount.toLocaleString()}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AddLoanModal = ({ onClose, onAdd }: any) => {
  const [formData, setFormData] = useState({
    borrowerName: '',
    idNumber: '',
    borrowerNumber: '',
    amountLoaned: 1000,
    employer: '',
    employmentStatus: 'Full-time',
    dueDate: '',
    physicalAddress: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `T${Math.floor(Math.random() * 900) + 100}`;
    const totalRepayment = formData.amountLoaned * (1 + DEFAULT_INTEREST_RATE/100);
    const newLoan: Loan = {
      ...formData,
      id,
      interestRate: DEFAULT_INTEREST_RATE,
      penaltyRate: DEFAULT_PENALTY_RATE,
      totalRepayment,
      startDate: new Date().toISOString().split('T')[0],
      status: RepaymentStatus.PENDING,
      history: [{ date: new Date().toISOString().split('T')[0], action: 'Loan Disbursed', amount: formData.amountLoaned }],
      payoutMethod: PayoutMethod.MOBILE,
    } as any;
    onAdd(newLoan);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col">
        <div className="bg-[#1a1a1a] p-12 text-white flex justify-between items-center relative shrink-0">
          <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Intake Operations</p><h3 className="text-3xl font-black tracking-tighter uppercase">New Loan Entry</h3></div>
          <button onClick={onClose} className="p-4 hover:bg-white/10 rounded-full border border-white/10"><X size={28} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-12 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Full Name</label>
              <input required value={formData.borrowerName} onChange={e => setFormData({...formData, borrowerName: e.target.value})} className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Ms. Nomsa..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">SA ID Number</label>
              <input required value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="13 Digits" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Employer Name</label>
              <input required value={formData.employer} onChange={e => setFormData({...formData, employer: e.target.value})} className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Company Name" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Employment Status</label>
              <select value={formData.employmentStatus} onChange={e => setFormData({...formData, employmentStatus: e.target.value})} className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 shadow-inner appearance-none">
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Self-employed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Loan Amount (R)</label>
              <input required type="number" value={formData.amountLoaned} onChange={e => setFormData({...formData, amountLoaned: parseInt(e.target.value)})} className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 shadow-inner font-mono font-black" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Due Date</label>
              <input required type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-8 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 shadow-inner" />
            </div>
          </div>
          <button type="submit" className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 mt-4">
            <Plus size={20} /> Create Ledger Entry
          </button>
        </form>
      </div>
    </div>
  );
};

const BorrowerHistoryModal = ({ borrower, onClose, calcPenalty }: any) => (
  <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-md flex items-center justify-center p-6">
    <div className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
      <div className="bg-[#1a1a1a] p-12 text-white relative shrink-0">
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white/10">{borrower.name[0]}</div>
            <div><h3 className="text-4xl font-black tracking-tighter uppercase leading-none">{borrower.name}</h3><p className="text-xs text-indigo-400 font-black uppercase tracking-[0.3em] mt-2">{borrower.idNumber}</p></div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-white/10 rounded-full border border-white/10"><X size={28} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-12 space-y-10 custom-scrollbar">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b border-gray-100 pb-4">Transaction Motif History</h4>
        <div className="space-y-6">
          {borrower.loans.map((loan:any) => (
            <div key={loan.id} className="flex items-center justify-between p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 hover:bg-white transition-all group shadow-sm hover:shadow-md">
              <div className="flex items-center gap-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border bg-white group-hover:border-indigo-100 transition-colors"><StatusDot status={loan.status} /></div>
                <div><p className="font-black text-indigo-600 uppercase tracking-widest text-xs">{loan.id}</p><p className="text-xl font-black text-gray-900 mt-1">R {loan.amountLoaned.toLocaleString()}</p></div>
              </div>
              <div className="text-right font-mono font-black text-gray-900 text-lg">R {(loan.totalRepayment + calcPenalty(loan).penalty).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ChatAssistant = ({ isOpen, setIsOpen, chatHistory, chatInput, setChatInput, handleSendChat, isChatTyping }: any) => (
  <>
    {!isOpen && (
      <button onClick={() => setIsOpen(true)} className="fixed bottom-10 right-10 w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-2xl flex items-center justify-center hover:scale-110 hover:-rotate-6 transition-all z-50 group border-4 border-white shadow-indigo-100">
        <MessageCircle size={32} className="relative z-10" />
      </button>
    )}
    {isOpen && (
      <div className="fixed bottom-32 right-6 md:right-12 w-[calc(100%-3rem)] md:w-[450px] h-[650px] bg-white rounded-[4rem] shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-12 duration-300">
        <div className="p-10 bg-[#1a1a1a] text-white flex justify-between items-center relative shrink-0">
          <div className="flex items-center gap-5 relative z-10"><div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center border-2 border-white/10 shadow-lg"><MessageSquare size={28} /></div><div><h4 className="font-black uppercase tracking-widest text-sm">Imali Assistant</h4><p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Online & Ubuntu-ready</p></div></div>
          <button onClick={() => setIsOpen(false)} className="p-4 hover:bg-white/10 rounded-full transition-colors border border-white/10"><X size={28} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-gray-50/50 custom-scrollbar">
          {chatHistory.map((msg:any, i:any) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-6 rounded-[2.5rem] text-sm font-medium ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-gray-800 shadow-sm border border-gray-100'}`}>{msg.text}</div>
            </div>
          ))}
          {isChatTyping && <div className="flex justify-start"><div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex gap-1.5"><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" /></div></div>}
        </div>
        <div className="p-10 bg-white border-t border-gray-100 flex gap-4">
          <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type your message..." className="flex-1 bg-gray-50 border-none rounded-[2rem] px-8 py-5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none" onKeyPress={(e) => e.key === 'Enter' && handleSendChat()} />
          <button onClick={handleSendChat} disabled={!chatInput.trim() || isChatTyping} className="p-5 bg-indigo-600 text-white rounded-[1.5rem] hover:bg-indigo-700 transition-all shadow-xl disabled:opacity-50"><Send size={24} /></button>
        </div>
      </div>
    )}
  </>
);

export default App;
