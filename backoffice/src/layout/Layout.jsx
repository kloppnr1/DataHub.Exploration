import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navSections = [
  {
    label: 'Overview',
    items: [
      {
        to: '/',
        label: 'Dashboard',
        end: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Onboarding',
    items: [
      {
        to: '/signups',
        label: 'Signups',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        ),
      },
      {
        to: '/signups/new',
        label: 'New Signup',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        ),
      },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      {
        to: '/customers',
        label: 'Customers',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        ),
      },
      {
        to: '/products',
        label: 'Products',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        ),
      },
    ],
  },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="w-[220px] bg-slate-950 flex flex-col shrink-0 border-r border-slate-800/60">
        {/* Brand */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </div>
            <span className="text-[17px] font-bold text-white tracking-tight">Volt</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                {section.label}
              </p>
              <div className="space-y-px">
                {section.items.map(({ to, label, icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end || to === '/signups'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400 font-medium'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 w-[3px] h-5 rounded-r-full bg-amber-400" />
                        )}
                        {icon}
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-500">Development</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1">Volt v0.1</p>
        </div>
      </aside>

      {/* Main content — no top bar, full bleed */}
      <main className="flex-1 overflow-auto bg-slate-900">
        <Outlet />
      </main>
    </div>
  );
}
