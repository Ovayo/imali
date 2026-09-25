import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Menu, Wallet, Users, LayoutDashboard, Settings, Bell, Languages, Calculator, ArrowLeftRight, UserCheck, ShieldCheck, X, RefreshCw, Loader2, LogOut, Camera, Cloud, Database, Smartphone } from 'lucide-react';
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
  profilePhoto?: string;
  onOpenPhotoCapture?: () => void;
  overdueCount?: number;
  isCloudConnected?: boolean;
  onOpenDataRecovery?: () => void;
  onOpenWhatsAppHub?: () => void;
  whatsAppNotificationsCount?: number;
  onOpenEmiCalculator?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  language, 
  setLanguage, 
  userRole, 
  toggleRole, 
  onRefresh, 
  userName, 
  profilePhoto,
  onOpenPhotoCapture,
  overdueCount,
  isCloudConnected = false,
  onOpenDataRecovery,
  onOpenWhatsAppHub,
  whatsAppNotificationsCount,
  onOpenEmiCalculator
}) => {
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
    { 
      id: 'borrowers', 
      label: userRole === UserRole.LENDER ? t.borrowers : 'My Profile', 
      icon: userRole === UserRole.LENDER ? Users : UserCheck, 
      mobileLabel: userRole === UserRole.LENDER ? 'People' : 'Profile' 
    },
    ...(userRole === UserRole.LENDER ? [
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
      <header className="md:hidden bg-white/90 backdrop-blur-md border-b border-gray-100/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex justify-between items-center fixed top-0 left-0 right-0 z-[60] shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-md text-white">
            <Wallet size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight uppercase text-gray-900 leading-none font-heading">imali</h1>
              <div className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${isCloudConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                {isCloudConnected ? 'Live' : 'Connecting'}
              </div>
            </div>
            <p className="text-[9px] text-gray-400 font-semibold tracking-wider uppercase">Micro-Lending Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenEmiCalculator && (
            <button
              onClick={onOpenEmiCalculator}
              title="Loan EMI & Penalty Calculator"
              className="w-10 h-10 min-w-[40px] flex items-center justify-center bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl border border-amber-200 active:scale-95 transition-all shadow-sm"
            >
              <Calculator size={17} />
            </button>
          )}

          {onOpenWhatsAppHub && userRole === UserRole.LENDER && (
            <button
              onClick={onOpenWhatsAppHub}
              title="Automated WhatsApp Service Console"
              className="relative w-10 h-10 min-w-[40px] flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl border border-emerald-200 active:scale-95 transition-all"
            >
              <Smartphone size={17} />
              {whatsAppNotificationsCount !== undefined && whatsAppNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white">
                  {whatsAppNotificationsCount > 9 ? '9+' : whatsAppNotificationsCount}
                </span>
              )}
            </button>
          )}

          {onOpenDataRecovery && (
            <button
              onClick={onOpenDataRecovery}
              title="Database & Data Recovery"
              className="w-10 h-10 min-w-[40px] flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 active:scale-95 transition-all"
            >
              <Database size={17} />
            </button>
          )}

          {onOpenPhotoCapture && (
            <button
              onClick={onOpenPhotoCapture}
              title="Capture profile photo"
              className="relative w-10 h-10 min-w-[40px] rounded-xl overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center bg-indigo-50 text-indigo-600 active:scale-95 transition-transform"
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt={displayUserName} className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-xs">{displayUserName[0]}</span>
              )}
              <div className="absolute inset-0 bg-black/35 opacity-0 active:opacity-100 flex items-center justify-center transition-opacity text-white">
                <Camera size={13} />
              </div>
            </button>
          )}

          <button 
            onClick={() => setLanguage(language === Language.EN ? Language.XH : Language.EN)}
            className="w-10 h-10 min-w-[40px] flex items-center justify-center bg-gray-50 text-gray-600 rounded-xl border border-gray-100 active:scale-95 transition-all"
            title="Switch Language (Xhosa / English)"
          >
            <Languages size={17} />
          </button>

          <button 
            onClick={toggleRole}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3.5 h-10 min-h-[40px] rounded-xl bg-gray-900 text-white shadow-md active:scale-95 transition-all tracking-wider"
          >
            {userRole === UserRole.BORROWER ? <LogOut size={13} /> : <ShieldCheck size={13} />}
            <span>{userRole === UserRole.BORROWER ? 'Log Out' : 'Lock Admin'}</span>
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-72 bg-[#1a1a1a] text-white h-full sticky top-0 shadow-2xl relative overflow-hidden flex-shrink-0 min-w-0">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none xhosa-pattern rotate-45 scale-150" />
        <div className="p-8 relative z-10 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-10">
            <div className="flex items-center gap-3">
              <div className="bg-[#1a1a1a] p-2 rounded-xl shadow-lg rotate-3 relative overflow-hidden group border border-white/10">
                <div className="absolute inset-0 opacity-20 xhosa-accent-pattern scale-50 group-hover:scale-100 transition-transform duration-500" />
                <Wallet size={28} className="text-white relative z-10" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tighter uppercase">imali</h1>
                  <span className={`w-2 h-2 rounded-full ${isCloudConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} title={isCloudConnected ? 'Connected to Cloud' : 'Connecting to Cloud'} />
                </div>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                  Micro-Lending
                  {isCloudConnected && <span className="text-[9px] text-emerald-400/80 font-normal lowercase tracking-normal">cloud active</span>}
                </p>
              </div>
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
          <div className="mt-auto space-y-3">
            {onOpenEmiCalculator && (
              <button 
                onClick={onOpenEmiCalculator}
                className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-950/40 to-amber-900/30 hover:from-amber-900/60 hover:to-amber-800/50 border border-amber-500/30 rounded-2xl text-amber-300 hover:text-white transition-all text-xs font-black uppercase tracking-wider group shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Calculator size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Loan EMI Calculator</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">5%/wk</span>
              </button>
            )}

            {onOpenDataRecovery && (
              <button 
                onClick={onOpenDataRecovery}
                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-2xl text-indigo-300 hover:text-white transition-all text-xs font-black uppercase tracking-wider group"
              >
                <div className="flex items-center gap-2.5">
                  <Database size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>Data Recovery & Sync</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">DB</span>
              </button>
            )}

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
                  <p className="text-sm font-black text-white uppercase tracking-tight">{userRole === UserRole.BORROWER ? 'Log Out' : 'Exit Admin'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{userRole === UserRole.BORROWER ? 'Exit Session' : 'Lock Admin Ledger'}</p>
                </div>
              </div>
            </button>

            {onOpenWhatsAppHub && userRole === UserRole.LENDER && (
              <button
                type="button"
                onClick={onOpenWhatsAppHub}
                className="w-full p-3 bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl flex items-center justify-between text-left hover:bg-emerald-950/60 transition-all group active:scale-98"
                title="Open WhatsApp Notification Service Console"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Smartphone size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">WhatsApp Service</p>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Auto-Reminders
                    </p>
                  </div>
                </div>
                {whatsAppNotificationsCount !== undefined && whatsAppNotificationsCount > 0 ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shrink-0">
                    {whatsAppNotificationsCount}
                  </span>
                ) : (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    LIVE
                  </span>
                )}
              </button>
            )}
            
            <div className="bg-black/20 rounded-2xl border border-white/5 p-4 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 p-1 opacity-5 xhosa-pattern-sm" />
              <div className="flex items-center justify-between mb-4"><p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Ulwimi</p><button onClick={() => setLanguage(language === Language.EN ? Language.XH : Language.EN)} className="flex items-center gap-1.5 text-xs font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase"><Languages size={14} />{language === Language.EN ? 'isiXhosa' : 'English'}</button></div>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-white shadow-lg border border-white/10 relative overflow-hidden ${userRole === UserRole.LENDER ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                    {profilePhoto ? (
                      <img src={profilePhoto} alt={displayUserName} className="w-full h-full object-cover" />
                    ) : (
                      displayUserName[0]
                    )}
                  </div>
                  {onOpenPhotoCapture && (
                    <button
                      onClick={onOpenPhotoCapture}
                      title="Update profile photo"
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white border border-white/30 shadow-md transition-all active:scale-90"
                    >
                      <Camera size={10} />
                    </button>
                  )}
                </div>
                <div className="min-w-0 flex-1">
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
        className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative custom-scrollbar momentum-scroll pt-[calc(4.5rem+env(safe-area-inset-top))] md:pt-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0 min-w-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
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
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release' : 'Pull to Refresh'}
            </span>
          </div>
        </div>

        <div className="flex-1 p-3.5 sm:p-6 md:p-10 relative overflow-x-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 opacity-[0.02] pointer-events-none xhosa-accent-pattern scale-150 rotate-12 -z-10" />
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-10">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase truncate font-heading">
                {activeTab === 'dashboard' && (userRole === UserRole.LENDER 
                  ? `${getGreeting()}, ${t.dashboard}` 
                  : `${getGreeting()}, ${displayUserName.split(' ').filter(Boolean).pop()} 😊`)}
                {activeTab === 'loans' && (userRole === UserRole.LENDER ? t.loans : 'My Active Loans')}
                {activeTab === 'borrowers' && (userRole === UserRole.LENDER ? 'Borrower Network' : 'My Credit Profile')}
                {activeTab === 'calculator' && t.loanCalculator}
                {activeTab === 'settings' && t.settings}
              </h2>
              <div className="flex items-center gap-2 sm:gap-3 mt-1">
                <p className="text-gray-500 text-[11px] sm:text-xs md:text-sm font-medium truncate max-w-md">
                  {activeTab === 'dashboard' && (userRole === UserRole.LENDER ? t.statsDesc : 'Your live financial standing & credit standing.')}
                  {activeTab === 'loans' && 'Ledger of all active and historical commitments'}
                  {activeTab === 'borrowers' && (userRole === UserRole.LENDER ? 'Verified community network and credit records' : 'Your personal account dossier and limit tier')}
                  {activeTab === 'calculator' && 'Financial growth & installment projections'}
                  {activeTab === 'settings' && 'Platform operational motifs and security'}
                </p>
                <div className="h-0.5 w-8 sm:w-12 beaded-divider opacity-40 shrink-0" />
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
      </main>

      {/* Mobile Bottom Navigation Bar (Full-width Dock with Safe-Area & Touch Targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full z-[100] bg-[#121316]/95 backdrop-blur-2xl border-t border-white/10 overflow-hidden flex items-stretch justify-around animate-in slide-in-from-bottom-5 duration-300 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-0 opacity-[0.04] xhosa-pattern-sm pointer-events-none" />
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const showBadge = item.id === 'loans' && typeof overdueCount === 'number' && overdueCount > 0;

          return (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 min-h-[50px] py-1 flex flex-col items-center justify-center gap-1 transition-all relative group select-none active:scale-95 ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 relative ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : 'group-hover:text-white'}`}>
                <item.icon size={19} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {overdueCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-tight uppercase leading-none transition-opacity ${isActive ? 'opacity-100 text-indigo-300 font-black' : 'opacity-70'}`}>
                {item.mobileLabel}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-indigo-500 rounded-b-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;