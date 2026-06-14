import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  Ticket, 
  ShieldCheck, 
  LogOut, 
  Settings,
  Bell
} from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();

  const NAV_LINKS = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Moderation', to: '/moderation', icon: ShieldCheck },
    { name: 'Users', to: '/users', icon: Users },
    { name: 'Bookings', to: '/bookings', icon: Car },
    { name: 'Promos', to: '/promos', icon: Ticket },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xl leading-none mr-2">P</div>
          <span className="text-xl font-bold text-white tracking-tight">Admin<span className="text-red-500">Panel</span></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.name}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                  isActive
                    ? 'bg-red-500/10 text-red-500'
                    : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-xl font-bold text-slate-800">System Administrator</h2>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="w-9 h-9 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-sm">
              AD
            </div>
          </div>
        </header>

        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
