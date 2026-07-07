import { useDispatch } from 'react-redux';
import { FiMenu } from 'react-icons/fi';
import { toggleSidebar } from '../../features/uiSlice';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';

export default function Navbar() {
  const dispatch = useDispatch();

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <FiMenu className="h-5 w-5" />
      </button>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <div className="h-6 w-px bg-slate-200" />
        <UserMenu />
      </div>
    </header>
  );
}
