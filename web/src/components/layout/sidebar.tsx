import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Icon from '@/components/icons/Icon';

const navItems = [
  {
    group: 'Main',
    items: [
      { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
      { name: 'Meetings', icon: 'calendar_month', href: '/meetings' },
      { name: 'Availability', icon: 'event_available', href: '/availability' },
      { name: 'Events', icon: 'category', href: '/events' },
      { name: 'Contacts', icon: 'contacts', href: '/contacts' },
      { name: 'Integrations', icon: 'hub', href: '/integrations' },
      { name: 'Settings', icon: 'settings', href: '/settings' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, isMobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  if (!mounted) {
    return <aside className="h-screen w-[220px] fixed left-0 top-0 bg-white border-r border-[#E5E7EB] z-50" />;
  }

  const fullName = user?.full_name || 'Your Profile';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[99] lg:hidden animate-in fade-in duration-300"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside className={`h-screen ${sidebarCollapsed ? 'w-16' : 'w-[220px]'} fixed left-0 top-0 bg-white border-r border-[#f1f1f3] flex flex-col z-[100] transition-all duration-300 ease-in-out lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo & Toggle Section */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} p-4 h-16 shrink-0`}>
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3 overflow-hidden animate-in fade-in duration-300">
              <div className="w-8 h-8 bg-[#5C6EFF] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#5C6EFF]/20">
                <Icon name="calendar_month" className="text-white" size={18} />
              </div>
              <h3 className="text-base font-bold tracking-tight text-[#111827]">Schedulr</h3>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-[#5C6EFF] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#5C6EFF]/20">
              <Icon name="calendar_month" className="text-white" size={18} />
            </div>
          )}

          {/* Hide collapse toggle on mobile to save space/sanity */}
            <button
            onClick={toggleSidebar}
            className={`absolute ${sidebarCollapsed ? '-right-3' : 'right-4'} top-[20px] w-6 h-6 bg-white border border-[#E5E7EB] text-slate-400 rounded-full hidden lg:flex items-center justify-center hover:text-[#5C6EFF] transition-all shadow-sm z-[60]`}
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <span className="transition-transform duration-300" style={{ transform: sidebarCollapsed ? 'rotate(0)' : 'rotate(180deg)' }}>
              <Icon name="chevron_right" size={16} />
            </span>
          </button>

          {/* Close button for mobile drawer */}
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-3'} overflow-y-auto pt-4 thin-scrollbar pb-4`}>
          {navItems.map((group, idx) => (
            <div key={group.group} className={idx !== 0 ? 'mt-6 mb-4' : 'mb-4'}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider animate-in fade-in duration-300">
                  {group.group}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'space-x-2.5 px-3'} py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
                          ? 'bg-[#EEF0FF] text-[#5C6EFF]'
                          : 'text-[#454655] hover:bg-slate-50 hover:text-[#191c1e]'
                        }`}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <span className={`${isActive ? '' : 'group-hover:scale-110 transition-transform'}`}>
                        <Icon name={item.icon as any} size={20} className={`${isActive ? '' : ''}`} />
                      </span>
                      {!sidebarCollapsed && (
                        <span className={`text-[13px] font-bold transition-all duration-300 whitespace-nowrap overflow-hidden`}>
                          {item.name}
                        </span>
                      )}
                      {sidebarCollapsed && isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-[#5C6EFF] rounded-r-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer Section */}
        <div className={`p-4 border-t border-[#f1f1f3] mt-auto ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center space-x-2 p-1.5 rounded-2xl ${sidebarCollapsed ? '' : 'hover:bg-slate-50'} transition-colors group cursor-default w-full overflow-hidden text-left`}>
                {user?.avatar_url ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-sm ring-2 ring-white shrink-0">
                <Image
                  src={user.avatar_url}
                  alt={fullName}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors shrink-0">
                <Icon name="person" size={18} />
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1 animate-in slide-in-from-left-2 duration-300">
                <p className="text-[13px] font-bold text-slate-900 truncate leading-none mb-1">{fullName}</p>
                {/* TODO: Add PRO plan badge in future if needed */}
                {/* <p className="text-[8px] text-indigo-600 font-bold uppercase tracking-[0.15em] leading-tight">PRO PLAN</p> */}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
