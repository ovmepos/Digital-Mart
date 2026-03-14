import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { UserCircle, Save, Image as ImageIcon, Globe, Mail, Link as LinkIcon, AlertCircle, CheckCircle, Instagram, Facebook, Twitter, Youtube, Loader2 } from 'lucide-react';

const BusinessProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileData, setProfileData] = useState({
    username: '',
    businessName: '',
    bio: '',
    logoUrl: '',
    contactEmail: '',
    website: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    twitter: '',
    youtube: ''
  });

  const [originalUsername, setOriginalUsername] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'businessProfiles', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            username: data.username || '',
            businessName: data.businessName || '',
            bio: data.bio || '',
            logoUrl: data.logoUrl || '',
            contactEmail: data.contactEmail || '',
            website: data.website || '',
            instagram: data.instagram || '',
            facebook: data.facebook || '',
            tiktok: data.tiktok || '',
            twitter: data.twitter || '',
            youtube: data.youtube || ''
          });
          setOriginalUsername(data.username || '');
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        setError("Image size must be less than 500KB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Basic validation
      if (profileData.username.length < 3 || profileData.username.length > 30) {
        throw new Error("Username must be between 3 and 30 characters.");
      }
      if (!/^[a-zA-Z0-9_]+$/.test(profileData.username)) {
        throw new Error("Username can only contain letters, numbers, and underscores.");
      }

      // Check username uniqueness if changed
      if (profileData.username !== originalUsername) {
        const q = query(collection(db, 'businessProfiles'), where('username', '==', profileData.username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          throw new Error("Username is already taken. Please choose another one.");
        }
      }

      const docRef = doc(db, 'businessProfiles', user.uid);
      const docSnap = await getDoc(docRef);
      
      const payload: any = {
        userId: user.uid,
        username: profileData.username,
        businessName: profileData.businessName,
        bio: profileData.bio,
        logoUrl: profileData.logoUrl,
        contactEmail: profileData.contactEmail,
        website: profileData.website,
        instagram: profileData.instagram,
        facebook: profileData.facebook,
        tiktok: profileData.tiktok,
        twitter: profileData.twitter,
        youtube: profileData.youtube,
        updatedAt: serverTimestamp()
      };

      if (!docSnap.exists()) {
        payload.createdAt = serverTimestamp();
      } else {
        payload.createdAt = docSnap.data().createdAt;
      }

      await setDoc(docRef, payload);
      setOriginalUsername(profileData.username);
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Business Profile</h1>
          <p className="text-lg text-slate-600">Manage your business identity and social presence.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-12">
            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-800 font-bold">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-emerald-800 font-bold">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Logo Upload Section */}
              <div className="flex flex-col md:flex-row items-center gap-8 pb-10 border-b border-slate-100">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                    {profileData.logoUrl ? (
                      <img src={profileData.logoUrl} alt="Business Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Business Logo</h3>
                  <p className="text-sm text-slate-500 mb-4">Upload a high-quality logo for your brand.</p>
                  <button type="button" className="text-blue-600 text-sm font-bold hover:text-blue-700">Change Logo</button>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Public URL / Username</label>
                  <div className="mt-1 flex rounded-2xl shadow-sm overflow-hidden">
                    <span className="inline-flex items-center px-6 bg-slate-100 text-slate-500 text-sm font-bold border-r border-slate-200">
                      {window.location.origin}/
                    </span>
                    <input
                      type="text"
                      name="username"
                      required
                      value={profileData.username}
                      onChange={handleChange}
                      className="flex-1 min-w-0 block w-full px-6 py-4 bg-slate-50 border-none text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="yourbusiness"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Business Name</label>
                  <input
                    type="text"
                    name="businessName"
                    required
                    value={profileData.businessName}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="e.g. Digital Growth Co."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Contact Email</label>
                  <div className="relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      name="contactEmail"
                      value={profileData.contactEmail}
                      onChange={handleChange}
                      className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bio / Description</label>
                  <textarea
                    name="bio"
                    rows={3}
                    value={profileData.bio}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    placeholder="Tell your customers about your services..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Website URL</label>
                  <div className="relative">
                    <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="url"
                      name="website"
                      value={profileData.website}
                      onChange={handleChange}
                      className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-6 pt-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <LinkIcon className="w-5 h-5 mr-2 text-blue-600" /> Social Media Links
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <Instagram className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-500" />
                    <input
                      type="url"
                      name="instagram"
                      value={profileData.instagram}
                      onChange={handleChange}
                      className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Instagram URL"
                    />
                  </div>
                  <div className="relative">
                    <Twitter className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                    <input
                      type="url"
                      name="twitter"
                      value={profileData.twitter}
                      onChange={handleChange}
                      className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Twitter URL"
                    />
                  </div>
                  <div className="relative">
                    <Facebook className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                    <input
                      type="url"
                      name="facebook"
                      value={profileData.facebook}
                      onChange={handleChange}
                      className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Facebook URL"
                    />
                  </div>
                  <div className="relative">
                    <Youtube className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-red-600" />
                    <input
                      type="url"
                      name="youtube"
                      value={profileData.youtube}
                      onChange={handleChange}
                      className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="YouTube URL"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all duration-300 shadow-xl shadow-slate-200 hover:shadow-blue-200 disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-3" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-3" /> Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfileSettings;
