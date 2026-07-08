import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiCheckSquare, FiChevronDown, FiX } from 'react-icons/fi';
import { cn } from '../../utils/cn';
import { closeSidebar } from '../../features/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import { adminNav, employeeNav } from './navConfig';

function NavItem({ item, onNavigate }) {
  const [open, setOpen] = useState(false);

  if (item.children) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4" />
            {item.label}
          </span>
          <FiChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <NavItem key={child.to} item={child} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to.endsWith('dashboard')}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
        )
      }
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

export default function Sidebar() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const { isSuperAdmin } = useAuth();
  const nav = isSuperAdmin ? adminNav : employeeNav;

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <FiCheckSquare className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-white">TaskPulse</span>
        </div>
        <button
          onClick={() => dispatch(closeSidebar())}
          className="rounded-md p-1 text-slate-300 hover:bg-white/10 lg:hidden"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>
      <nav className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => (
          <NavItem key={item.to || item.label} item={item} onNavigate={() => dispatch(closeSidebar())} />
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-700 bg-slate-800 lg:block">{content}</aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => dispatch(closeSidebar())} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-slate-800 shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}
