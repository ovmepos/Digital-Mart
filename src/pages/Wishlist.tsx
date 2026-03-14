import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { Heart, ShoppingCart, Trash2, ArrowRight, Loader2, Star, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const Wishlist: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user || !profile?.wishlist || profile.wishlist.length === 0) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'services'), where('__name__', 'in', profile.wishlist));
        const snapshot = await getDocs(q);
        setWishlistItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching wishlist:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user, profile?.wishlist]);

  const removeFromWishlist = async (serviceId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        wishlist: arrayRemove(serviceId)
      });
    } catch (err) {
      console.error("Error removing from wishlist:", err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading wishlist...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 text-center md:text-left">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight flex items-center justify-center md:justify-start">
              <Heart className="w-10 h-10 mr-4 text-red-500 fill-current" />
              My Wishlist
            </h1>
            <p className="text-lg text-slate-600">Your curated collection of premium digital services.</p>
          </div>
          <Link 
            to="/services" 
            className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
          >
            <ShoppingBag className="w-4 h-4 mr-2" /> Continue Shopping
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">Your wishlist is empty</h3>
            <p className="text-slate-500 mb-10 max-w-sm mx-auto">Explore our catalog and save your favorite services for later.</p>
            <Link to="/services" className="inline-flex items-center px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
              Browse Services
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {wishlistItems.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col"
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={service.imageUrl || 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=400&h=300&fit=crop'} 
                    alt={service.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <button 
                    onClick={() => removeFromWishlist(service.id)}
                    className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1.5 bg-white/95 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg">
                      {service.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight line-clamp-1">{service.name}</h3>
                  <div className="flex items-center mb-4">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Price</p>
                      <p className="text-2xl font-black text-slate-900">{service.pricePer1000.toFixed(3)} <span className="text-xs font-bold text-slate-500">OMR</span></p>
                    </div>
                    <Link 
                      to="/services" 
                      className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 hover:shadow-blue-200"
                    >
                      <ShoppingCart className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
