import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">LedgerOne</h1>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  ),
});
