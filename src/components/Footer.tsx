import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Digital Mart</span>
            </Link>
            <p className="text-slate-500 text-sm">
              Your premium destination for digital growth. Scale your online presence securely and efficiently.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="text-slate-500 hover:text-blue-600 transition-colors">Home</Link></li>
              <li><Link to="/services" className="text-slate-500 hover:text-blue-600 transition-colors">Services</Link></li>
              <li><Link to="/bio" className="text-slate-500 hover:text-blue-600 transition-colors">Business Profile</Link></li>
              <li><Link to="/login" className="text-slate-500 hover:text-blue-600 transition-colors">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/policy" className="text-slate-500 hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refund" className="text-slate-500 hover:text-blue-600 transition-colors">Refund Policy</Link></li>
              <li><Link to="/rules" className="text-slate-500 hover:text-blue-600 transition-colors">Terms & Rules</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="text-slate-500 hover:text-blue-600 transition-colors">Contact Us</Link></li>
              <li className="text-slate-500">support@digitalmart.com</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Digital Mart. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
