import { lazy, Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const SettingsModal = lazy(() => import('../../features/settings/SettingsModal'));

export default function AppLayout() {
  const settingsModalOpen = useSelector((state) => state.ui.settingsModalOpen);
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    if (settingsModalOpen) setEverOpened(true);
  }, [settingsModalOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      {everOpened && (
        <Suspense fallback={null}>
          <SettingsModal />
        </Suspense>
      )}
    </div>
  );
}
