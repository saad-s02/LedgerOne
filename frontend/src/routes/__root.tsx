import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { ScanBeam } from '../components/ScanBeam';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <ScanBeam />
      <Header />
      <main className="px-6 py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
