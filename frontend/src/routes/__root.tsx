import { Link, Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center gap-6 px-6 py-4">
          <h1 className="text-xl font-semibold">LedgerOne</h1>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: 'rounded bg-gray-900 px-3 py-1.5 text-white' }}
              inactiveProps={{ className: 'rounded px-3 py-1.5 text-gray-700 hover:bg-gray-100' }}
            >
              Dashboard
            </Link>
            <Link
              to="/docs"
              activeProps={{ className: 'rounded bg-gray-900 px-3 py-1.5 text-white' }}
              inactiveProps={{ className: 'rounded px-3 py-1.5 text-gray-700 hover:bg-gray-100' }}
            >
              API Docs
            </Link>
          </nav>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
