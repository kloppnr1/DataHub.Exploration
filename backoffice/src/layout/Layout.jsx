import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/signups', label: 'Signups' },
  { to: '/signups/new', label: 'New Signup' },
  { to: '/customers', label: 'Customers' },
  { to: '/products', label: 'Products' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-800 text-gray-100 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-700">
          <h1 className="text-lg font-semibold">Back Office</h1>
          <p className="text-xs text-gray-400 mt-0.5">Settlement Admin</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/signups'}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${
                  isActive
                    ? 'bg-gray-700 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
