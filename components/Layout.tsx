import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Menu, Wallet, Users, LayoutDashboard, Settings, Bell, Languages, Calculator, ArrowLeftRight, UserCheck, ShieldCheck, X, RefreshCw, Loader2, LogOut } from 'lucide-react';
import { Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  userRole: UserRole;
  toggleRole: () => void;
  onRefresh?: () => Promise<void>;
  userName?: string;
  overdueCount?: number;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, language, setLanguage, userRole, toggleRole, onRefresh, userName, overdueCount }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const t = TRANSLATIONS[language];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === Language.XH) {
      if (hour >= 5 && hour < 12) return 'Molo kusasa'; // Good morning
      if (hour >= 12 && hour < 17) return 'Molo emva kwemini'; // Good afternoon
      return 'Molo ngokuhlwa'; // Good evening
    }
    
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, mobileLabel: 'Home' },
    { id: 'loans', label: userRole === UserRole.LENDER ? t.loans : 'My Loans', icon: Wallet, mobileLabel: 'Loans' },
    ...(userRole === UserRole.LENDER ? [
      { id: 'borrowers', label: t.borrowers, icon: Users, mobileLabel: 'People' },
      { id: 'settings', label: t.settings, icon: Settings, mobileLabel: 'Menu' }
    ] : [
      { id: 'calculator', label: t.loanCalculator, icon: Calculator, mobileLabel: 'Calc' }
    ]),
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing || !scrollContainerRef.current) return;
    if (scrollContainerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].pageY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      const dampenedDiff = Math.pow(diff, 0.85);
      setPullDistance(Math.min(dampenedDiff, 100));
      if (diff > 10) e.preventDefault(); 
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;
    
    if (pullDistance > 60 && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(70); 
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  const displayUserName = userName || (userRole === UserRole.LENDER ? 'Ovayo M.' : 'Borrower');

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-[#fdfcfb] xhosa-pattern overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-[60] shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg">
             <Wallet size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tighter uppercase text-gray-900">imali</h1>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setLanguage(language === Language.EN ? Language.XH : Language.EN)}
             className="p-2 bg-gray-50 text-gray-400 rounded-full border border-gray-100"
           >
             <Languages size={16} />
           </button>
           <button 
             onClick={toggleRole}
             className="flex items-center gap-1.5 text-[10px] font-black uppercase px-4 py-2 rounded-full bg-[#1a1a1a] text-white shadow-lg active:scale-95 transition-all"
           >
             {userRole === UserRole.BORROWER ? <LogOut size={12} /> : <ShieldCheck size={12} />}
             {userRole === UserRole.BORROWER ? 'Log Out' : 'Admin'}
           </button>
        </div>
      </header>

      {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-72 bg-[#1a1a1a] text-white h-full sticky top-0 shadow-2xl relative overflow-hidden flex-shrink-0 min-w-0">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none xhosa-pattern rotate-45 scale-150" />
        <div className="bead-accent absolute top-0 left-0 w-full" />
        <div className="p-8 relative z-10 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-[#1a1a1a] p-2 rounded-xl shadow-lg rotate-3 relative overflow-hidden group border border-white/10">
                <div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-50 group-hover:scale-100 transition-transform duration-500" />
                <Wallet size={28} className="text-white relative z-10" />
              </div>
              <div><h1 className="text-2xl font-black tracking-tighter uppercase">imali</h1><p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Micro-Lending</p></div>
            </div>
          </div>
          <nav className="space-y-2 mb-8">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden group ${activeTab === item.id ? 'bg-indigo-600/10 text-indigo-400 shadow-sm border border-indigo-600/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon size={20} className="relative z-10" /><span className="font-black text-sm uppercase tracking-widest relative z-10">{item.label}</span>
                {activeTab === item.id && <div className="absolute right-0 top-0 h-full w-1 bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.3)]" />}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-4">
            <button onClick={toggleRole} className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-10 xhosa-pattern-sm" />
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">{userRole === UserRole.BORROWER ? 'Account Security' : 'Portal Switch'}</p>
                {userRole === UserRole.BORROWER ? <LogOut size={12} className="text-rose-400" /> : <ArrowLeftRight size={12} className="text-indigo-400" />}
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${userRole === UserRole.BORROWER ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-600/20 text-indigo-400'}`}>
                  {userRole === UserRole.BORROWER ? <LogOut size={18} /> : <ShieldCheck size={18} />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-white uppercase tracking-tight">{userRole === UserRole.BORROWER ? 'Log Out' : 'Borrower View'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{userRole === UserRole.BORROWER ? 'Exit Session' : 'Switch Mode'}</p>
                </div>
              </div>
            </button>
            
            <div className="bg-black/20 rounded-2xl border border-white/5 p-4 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 p-1 opacity-5 xhosa-pattern-sm" />
              <div className="flex items-center justify-between mb-4"><p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Ulwimi</p><button onClick={() => setLanguage(language === Language.EN ? Language.XH : Language.EN)} className="flex items-center gap-1.5 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase"><Languages size={14} />{language === Language.EN ? 'isiXhosa' : 'English'}</button></div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-lg border border-white/10 relative overflow-hidden ${userRole === UserRole.LENDER ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                  {displayUserName[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm uppercase tracking-tight text-white truncate">{displayUserName}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">{userRole === UserRole.LENDER ? 'Village Lender' : 'Verified Borrower'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        ref={scrollContainerRef}
        className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative custom-scrollbar pt-[68px] md:pt-0 pb-20 md:pb-0 min-w-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bead-accent z-20 sticky top-0 md:hidden" />
        
        <div 
          className="absolute left-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-all duration-200"
          style={{ 
            top: `${pullDistance - 50 + (activeTab === 'dashboard' ? 72 : 0)}px`, 
            opacity: Math.min(pullDistance / 50, 1),
            transform: `scale(${Math.min(pullDistance / 60, 1)})`
          }}
        >
          <div className="bg-white p-3 rounded-full shadow-xl border border-indigo-100 flex items-center gap-2 relative overflow-hidden group">
            <div className="absolute inset-0 xhosa-pattern-sm opacity-10" />
            {isRefreshing ? (
              <Loader2 className="text-indigo-600 animate-spin" size={20} />
            ) : (
              <RefreshCw className={`text-indigo-600 ${pullDistance > 60 ? 'rotate-180' : 'rotate-0'} transition-transform duration-300`} size={20} />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 pr-1">
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release' : 'Pull'}
            </span>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-10 relative overflow-x-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.02] pointer-events-none xhosa-accent-pattern scale-150 rotate-12 -z-10" />
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase truncate">
                {activeTab === 'dashboard' && (userRole === UserRole.LENDER 
                  ? `${getGreeting()}, ${t.dashboard}` 
                  : `${getGreeting()}, ${displayUserName.split(' ').filter(Boolean).pop()} 😊`)}
                {activeTab === 'loans' && (userRole === UserRole.LENDER ? t.loans : 'My Active Loans')}
                {activeTab === 'borrowers' && t.borrowers}
                {activeTab === 'calculator' && t.loanCalculator}
                {activeTab === 'settings' && t.settings}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-500 text-[11px] md:text-sm font-medium truncate max-w-md">
                  {activeTab === 'dashboard' && (userRole === UserRole.LENDER ? t.statsDesc : 'Your current financial standing.')}
                  {activeTab === 'loans' && 'Ledger of current commitments'}
                  {activeTab === 'borrowers' && 'Your trusted community network'}
                  {activeTab === 'calculator' && 'Financial growth projections'}
                  {activeTab === 'settings' && 'Operational motifs'}
                </p>
                <div className="h-0.5 w-12 beaded-divider opacity-40 shrink-0" />
              </div>
            </div>
            <div className="hidden md:flex gap-4">
              <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all relative group overflow-hidden border-2 border-transparent hover:border-gray-100">
                <div className="absolute inset-0 xhosa-pattern-sm opacity-5 pointer-events-none" />
                <Bell size={20} className="text-gray-600 group-hover:text-indigo-600 transition-colors relative z-10" />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white relative z-20"></span>
              </button>
            </div>
          </header>
          {children}
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Full-width Dock) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full z-[100] bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-white/10 overflow-hidden flex items-stretch justify-around animate-in slide-in-from-bottom-5 duration-300 h-20 shadow-[0_-5px_25px_rgba(0,0,0,0.2)]">
        <div className="absolute inset-0 opacity-[0.05] xhosa-pattern-sm pointer-events-none" />
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-all relative group ${isActive ? 'text-white' : 'text-gray-500'}`}
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-indigo-600 scale-110' : 'group-active:scale-90'}`}>
                <item.icon size={20} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.mobileLabel}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-600 rounded-b-full shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;