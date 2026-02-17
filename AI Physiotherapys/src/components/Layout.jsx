import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
    { path: '/', label: 'Exercises', icon: '🏥' },
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/therapist', label: 'Therapist', icon: '🩺' },
];

export default function Layout({ children }) {
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen flex flex-col">
            {/* Disclaimer Banner */}
            <div className="bg-gradient-to-r from-warn-600/20 to-warn-500/10 border-b border-warn-500/30 px-4 py-2">
                <p className="text-center text-warn-300 text-xs sm:text-sm font-medium">
                    ⚕️ This application supports but does not replace your physiotherapist.
                </p>
            </div>

            {/* Header */}
            <header className="glass border-b border-surface-700/30 rounded-none sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 no-underline">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl shadow-lg shadow-primary-500/25">
                            🦴
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold glow-text leading-tight">
                                AI Physio Coach
                            </h1>
                            <p className="text-[10px] text-surface-400 leading-none hidden sm:block">
                                Post-Surgery Recovery
                            </p>
                        </div>
                    </Link>

                    <nav className="flex items-center gap-1 sm:gap-2">
                        {NAV_ITEMS.map(item => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 no-underline ${isActive
                                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-700/50'
                                        }`}
                                >
                                    <span>{item.icon}</span>
                                    <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            );
                        })}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="flex items-center justify-center w-10 h-10 rounded-xl text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-all duration-300 border border-transparent hover:border-surface-700/50"
                            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-surface-800/50 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-surface-500 text-xs">
                    <p>AI Post-Surgery Physiotherapy Coach • All data processed locally in your browser</p>
                    <p className="mt-1 text-surface-600">No video or personal data is stored on any server</p>
                </div>
            </footer>
        </div>
    );
}
