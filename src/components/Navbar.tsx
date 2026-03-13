import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Wallet, LayoutDashboard, Settings, Menu, X, ShoppingBag, Instagram, ShoppingCart } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Digital Mart</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <Link 
                to="/" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/') ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
              >
                Home
              </Link>
              <Link 
                to="/services" 
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/services') ? 'border-blue-500 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
              >
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                Shop
              </Link>
            </div>
          </div>

          {/* Desktop Right Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && profile ? (
              <>
                {profile.role === 'admin' && (
                  <Link to="/admin" className="text-slate-500 hover:text-blue-600 flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors">
                    <Settings className="w-4 h-4 mr-1.5" />
                    Admin
                  </Link>
                )}
                <Link to="/ig-store" className="text-slate-500 hover:text-pink-600 flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  <Instagram className="w-4 h-4 mr-1.5" />
                  IG Store
                </Link>
                <Link to="/dashboard" className="text-slate-500 hover:text-blue-600 flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  <LayoutDashboard className="w-4 h-4 mr-1.5" />
                  Dashboard
                </Link>
                <Link to="/wallet" className="flex items-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-semibold border border-emerald-100 transition-colors cursor-pointer">
                  <Wallet className="w-4 h-4 mr-1.5" />
                  {profile.walletBalance.toFixed(3)} OMR
                </Link>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-red-600 flex items-center p-2 rounded-full hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-slate-900 font-medium text-sm px-4 py-2">
                  Sign in
                </Link>
                <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="pt-2 pb-3 space-y-1">
            <Link to="/" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/') ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800'}`}>
              Home
            </Link>
            <Link to="/services" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/services') ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800'}`}>
              Shop
            </Link>
            
            {user && profile ? (
              <>
                <Link to="/ig-store" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/ig-store') ? 'bg-pink-50 border-pink-500 text-pink-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800'}`}>
                  IG Store
                </Link>
                <Link to="/dashboard" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/dashboard') ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800'}`}>
                  Dashboard
                </Link>
                {profile.role === 'admin' && (
                  <Link to="/admin" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${isActive('/admin') ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800'}`}>
                    Admin
                  </Link>
                )}
                <div className="pl-3 pr-4 py-3 flex items-center justify-between border-t border-slate-100 mt-2">
                  <Link to="/wallet" className="flex items-center text-emerald-700 font-medium hover:text-emerald-800">
                    <Wallet className="w-5 h-5 mr-2" />
                    {profile.walletBalance.toFixed(3)} OMR
                  </Link>
                  <button onClick={logout} className="text-slate-500 hover:text-red-600 flex items-center">
                    <LogOut className="w-5 h-5 mr-2" /> Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="pl-3 pr-4 py-3 border-t border-slate-100 mt-2">
                <Link to="/login" className="block w-full text-center bg-blue-600 text-white font-medium px-4 py-2 rounded-lg">
                  Sign In / Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
