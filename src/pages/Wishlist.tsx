import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { Heart, ShoppingCart, Trash2, ArrowRight, Loader2, Star } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <Heart className="w-8 h-8 mr-3 text-red-500 fill-current" />
          My Wishlist
        </h1>
        <p className="text-slate-500 mt-2">Products and services you've saved for later.</p>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Heart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Your wishlist is empty</h2>
          <p className="text-slate-500 mb-8">Save items you're interested in to see them here.</p>
          <Link 
            to="/services" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Explore Services
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col group"
            >
              <div className="h-40 overflow-hidden relative">
                <img 
                  src={service.imageUrl || 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=400&h=300&fit=crop'} 
                  alt={service.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <button 
                  onClick={() => removeFromWishlist(service.id)}
                  className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm text-red-500 rounded-lg shadow-sm hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 flex-grow flex flex-col">
                <div className="flex items-center mb-1">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{service.category}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1 line-clamp-1">{service.name}</h3>
                <div className="flex items-center mb-3">
                  <div className="flex text-yellow-400 text-[10px]">
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Price per 1k</p>
                    <p className="text-lg font-bold text-blue-600">{service.pricePer1000.toFixed(3)} OMR</p>
                  </div>
                  <Link 
                    to="/services" 
                    className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
