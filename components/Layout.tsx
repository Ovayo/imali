
import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Menu, Wallet, Users, LayoutDashboard, Settings, Bell, Languages, Calculator, ArrowLeftRight, UserCheck, ShieldCheck, X, RefreshCw, Loader2 } from 'lucide-react';
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
  adminProfile?: { name: string, email: string };
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, language, setLanguage, userRole, toggleRole, onRefresh, adminProfile }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const t = TRANSLATIONS[language];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'loans', label: t.loans, icon: Wallet },
    { id: 'borrowers', label: t.borrowers, icon: Users },
    { id: 'calculator', label: t.loanCalculator, icon: Calculator },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  const handleMobileNav = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  // Pull to Refresh Logic
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
      // Apply some resistance
      const dampenedDiff = Math.pow(diff, 0.85);
      setPullDistance(Math.min(dampenedDiff, 100));
      if (diff > 10) e.preventDefault(); // Prevent standard scroll
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;
    
    if (pullDistance > 60 && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(70); // Keep indicator visible during refresh
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fdfcfb] xhosa-pattern">
      {/* Mobile Header */}
      <header className="md:hidden bg-[#1a1a1a] text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded shadow-lg">
               <Wallet size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase">Imali</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={toggleRole}
             className="flex items-center gap-1.5 text-[10px] font-black uppercase bg-white/10 px-3 py-1.5 rounded-full border border-white/5 text-white"
           >
             <ArrowLeftRight size={12} />
             {userRole === UserRole.LENDER ? 'Borrower' : 'Lender'}
           </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-[#1a1a1a]/80 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="absolute left-0 top-0 bottom-0 w-4/5 max-w-sm bg-[#1a1a1a] text-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none xhosa-pattern rotate-12 scale-150" />
            <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
            <div className="p-8 flex justify-between items-center relative z-10 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
                   <Wallet size={24} />
                </div>
                <h1 className="text-2xl font-black tracking-tighter uppercase">Imali</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors border border-white/10"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2 relative z-10">
              {menuItems.map((item) => (
                <button key={item.id} onClick={() => handleMobileNav(item.id)} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all duration-300 relative overflow-hidden group ${activeTab === item.id ? 'bg-indigo-600/20 text-white shadow-xl border border-indigo-600/30' : 'text-gray-300 hover:text-white'}`}>
                  <item.icon size={24} className={activeTab === item.id ? 'text-indigo-400' : 'text-gray-400'} />
                  <span className="font-black text-base uppercase tracking-widest">{item.label}</span>
                  {activeTab === item.id && <div className="absolute right-0 top-0 h-full w-1.5 bg-indigo-600" />}
                </button>
              ))}
            </div>
            <div className="p-8 space-y-4 border-t border-white/5 bg-black/20 relative z-10">
              <button onClick={() => { setLanguage(language === Language.EN ? Language.XH : Language.EN); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 text-sm font-bold text-white">
                <div className="flex items-center gap-3 text-indigo-400"><Languages size={18} /><span>Language / Ulwimi</span></div>
                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] uppercase font-black">{language === Language.EN ? 'isiXhosa' : 'English'}</span>
              </button>
              <div className="flex items-center gap-4 p-2">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white shadow-lg border border-white/10 overflow-hidden relative">OM</div>
                <div><p className="font-black text-sm uppercase tracking-tight text-white">Ovayo M.</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Village Lender</p></div>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 bg-[#1a1a1a] text-white h-screen sticky top-0 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none xhosa-pattern rotate-45 scale-150" />
        <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
        <div className="p-8 relative z-10 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-[#1a1a1a] p-2 rounded-xl shadow-lg rotate-3 relative overflow-hidden group border border-white/10">
                <div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-50 group-hover:scale-100 transition-transform duration-500" />
                <Wallet size={28} className="text-white relative z-10" />
              </div>
              <div><h1 className="text-2xl font-black tracking-tighter uppercase">Imali</h1><p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Micro-Lending</p></div>
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
              <div className="flex items-center justify-between mb-2"><p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Portal Motif</p><ArrowLeftRight size={12} className="text-indigo-400 group-hover:rotate-180 transition-transform duration-500" /></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400"><ShieldCheck size={18} /></div><div className="text-left"><p className="text-sm font-black text-white uppercase tracking-tight">Lender Hub</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Switch Portal</p></div></div>
            </button>
            <div className="bg-black/20 rounded-2xl border border-white/5 p-4 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 p-1 opacity-5 xhosa-pattern-sm" />
              <div className="flex items-center justify-between mb-4"><p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Ulwimi</p><button onClick={() => setLanguage(language === Language.EN ? Language.XH : Language.EN)} className="flex items-center gap-1.5 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase"><Languages size={14} />{language === Language.EN ? 'isiXhosa' : 'English'}</button></div>
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg border border-white/10 relative overflow-hidden">OM</div><div><p className="font-black text-sm uppercase tracking-tight text-white">Ovayo M.</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Village Lender</p></div></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        ref={scrollContainerRef}
        className="flex-1 flex flex-col min-h-screen overflow-y-auto relative custom-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bead-accent z-20 opacity-60 sticky top-0" />
        
        {/* Pull to Refresh Indicator */}
        <div 
          className="absolute left-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-all duration-200"
          style={{ 
            top: `${pullDistance - 50}px`, 
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
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to update' : 'Pull to refresh'}
            </span>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-10 relative">
          <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.02] pointer-events-none xhosa-accent-pattern scale-150 rotate-12 -z-10" />
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">
                {activeTab === 'dashboard' && `${language === Language.XH ? 'Molo!' : 'Hello!'} ${t.dashboard}`}
                {activeTab === 'loans' && t.loans}
                {activeTab === 'borrowers' && t.borrowers}
                {activeTab === 'calculator' && t.loanCalculator}
                {activeTab === 'settings' && t.settings}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-500 text-sm font-medium">
                  {activeTab === 'dashboard' && t.statsDesc}
                  {activeTab === 'loans' && 'Ledger of current commitments'}
                  {activeTab === 'borrowers' && 'Your trusted community network'}
                  {activeTab === 'calculator' && 'Financial growth projections'}
                  {activeTab === 'settings' && 'Platform operational motifs'}
                </p>
                <div className="h-0.5 w-12 beaded-divider opacity-40" />
              </div>
            </div>
            <div className="flex gap-4">
              <button className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all relative group overflow-hidden border-2 border-transparent hover:border-gray-100">
                <div className="absolute inset-0 xhosa-pattern-sm opacity-5 pointer-events-none" />
                <Bell size={20} className="text-gray-600 group-hover:text-indigo-600 transition-colors relative z-10" />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white relative z-20"></span>
              </button>
            </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
