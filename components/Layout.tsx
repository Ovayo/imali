
import * as React from 'react';
import { useState, useRef } from 'react';
import { Menu, Wallet, Users, LayoutDashboard, Settings, Bell, Languages, Calculator, ArrowLeftRight, UserCheck, ShieldCheck, X, RefreshCw, Loader2, ArrowRightLeft, Sparkles } from 'lucide-react';
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
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, language, setLanguage, userRole, toggleRole, onRefresh }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const t = TRANSLATIONS[language];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'loans', label: 'Ledger (Active Loans)', icon: Wallet },
    { id: 'borrowers', label: 'Borrowers CRM', icon: Users },
    { id: 'calculator', label: 'Growth Projections', icon: Calculator },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  const handleMobileNav = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

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

  return (
    <div className={`min-h-screen flex flex-col md:flex-row xhosa-pattern ${userRole === UserRole.BORROWER ? 'bg-[#fffaf5]' : 'bg-[#fdfcfb]'}`}>
      {/* Mobile Header */}
      <header className="md:hidden bg-[#1a1a1a] text-white p-6 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-3 hover:bg-white/10 rounded-xl border border-white/10"><Menu size={24} /></button>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg"><Wallet size={20} /></div>
            <h1 className="text-xl font-black tracking-tighter uppercase">Imali</h1>
          </div>
        </div>
        <button onClick={toggleRole} className="bg-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-indigo-400">Switch Portals</button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-80 bg-[#1a1a1a] text-white h-screen sticky top-0 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none xhosa-pattern rotate-45 scale-150" />
        <div className="bead-accent absolute top-0 left-0 w-full opacity-50" />
        <div className="p-10 relative z-10 flex-1 flex flex-col">
          <div className="flex items-center gap-4 mb-14">
             <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-600/20"><Wallet size={32} /></div>
             <div><h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Imali</h1><p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em] mt-1">Village Fintech</p></div>
          </div>

          {userRole === UserRole.LENDER ? (
            <nav className="space-y-3 mb-12">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6 pl-4">Management Hub</p>
              {menuItems.map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 relative group ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <item.icon size={22} /><span className="font-black text-sm uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </nav>
          ) : (
            <div className="mb-12 space-y-8">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 pl-4">Client Dashboard</p>
              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Sparkles size={40} /></div>
                <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-2">Active Portal</p>
                <h4 className="text-xl font-black text-white uppercase tracking-tight">Borrower Access</h4>
              </div>
            </div>
          )}

          <div className="mt-auto space-y-6">
            <button onClick={toggleRole} className="w-full p-6 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[2.5rem] transition-all group relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-5 xhosa-pattern rotate-12" />
              <div className="flex items-center justify-between mb-3"><p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Switch Experience</p><ArrowRightLeft size={14} className="text-indigo-400 group-hover:rotate-180 transition-transform duration-500" /></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 border border-indigo-600/20"><UserCheck size={22} /></div>
                <div className="text-left">
                  <p className="text-sm font-black text-white uppercase tracking-tight">
                    {userRole === UserRole.LENDER ? 'Borrower Portal' : 'Lender Hub'}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Client Interface</p>
                </div>
              </div>
            </button>
            <div className="bg-black/40 rounded-[2.5rem] border border-white/5 p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4"><p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Languange</p><button onClick={() => setLanguage(language === Language.EN ? Language.XH : Language.EN)} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Languages size={14} />{language === Language.EN ? 'IsiXhosa' : 'English'}</button></div>
              <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white shadow-lg border border-white/10">OM</div><div><p className="font-black text-sm uppercase tracking-tight text-white leading-none">Ovayo M.</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Village Lender</p></div></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main ref={scrollContainerRef} className="flex-1 flex flex-col min-h-screen overflow-y-auto relative custom-scrollbar" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <div className="bead-accent z-20 opacity-50 sticky top-0 shrink-0" />
        
        {/* Pull to Refresh Indicator */}
        <div className="absolute left-0 right-0 z-40 flex items-center justify-center pointer-events-none transition-all duration-200" style={{ top: `${pullDistance - 60}px`, opacity: Math.min(pullDistance / 50, 1) }}>
          <div className="bg-white p-4 rounded-full shadow-2xl border border-indigo-100 flex items-center gap-3">
            {isRefreshing ? <Loader2 className="text-indigo-600 animate-spin" size={24} /> : <RefreshCw className={`text-indigo-600 ${pullDistance > 60 ? 'rotate-180' : 'rotate-0'} transition-transform`} size={24} />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 pr-2">Update Motif</span>
          </div>
        </div>

        <div className="flex-1 p-8 md:p-14 relative z-10">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 animate-in slide-in-from-top-8 duration-700">
             <div>
                <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">{userRole === UserRole.LENDER ? 'Operations Motif' : 'Community Ledger'}</p>
                <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                  {userRole === UserRole.LENDER ? (activeTab === 'dashboard' ? 'Overview' : activeTab === 'loans' ? 'The Ledger' : activeTab === 'borrowers' ? 'CRM Suite' : activeTab === 'calculator' ? 'Projections' : 'Settings') : 'Personal Portal'}
                </h2>
             </div>
             <div className="flex gap-4">
                <button className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-indigo-500/10 transition-all group relative border-2 border-transparent hover:border-indigo-100"><Bell size={24} className="text-gray-400 group-hover:text-indigo-600 transition-colors" /><span className="absolute top-4 right-4 w-3 h-3 bg-rose-500 rounded-full border-2 border-white ring-2 ring-rose-500/20" /></button>
             </div>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
