import { Outlet, createRootRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Header } from '../components/Header';
import { ScanBeam } from '../components/ScanBeam';
import { PanelExclusionProvider } from '../components/PanelExclusion';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);

  return (
    <PanelExclusionProvider>
      <div className="min-h-screen bg-bg text-text">
        <ScanBeam />
        <Header />
        <main className="px-6 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </PanelExclusionProvider>
  );
}
