import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { UserCircle, Save, Image as ImageIcon, Globe, Mail, Link as LinkIcon, AlertCircle, CheckCircle, Instagram, Facebook, Twitter, Youtube } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <UserCircle className="w-8 h-8 mr-3 text-blue-600" />
          Business Profile
        </h1>
        <p className="text-slate-500 mt-2">Manage your public business profile and custom URL.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start">
              <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-emerald-800">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-slate-700">Public URL / Username</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                    {window.location.origin}/
                  </span>
                  <input
                    type="text"
                    name="username"
                    required
                    value={profileData.username}
                    onChange={handleChange}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-slate-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="yourbusiness"
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">This will be your public profile link.</p>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-slate-700">Business Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="businessName"
                    required
                    value={profileData.businessName}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-slate-700">Bio / Description</label>
                <div className="mt-1">
                  <textarea
                    name="bio"
                    rows={3}
                    value={profileData.bio}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-slate-300 rounded-md p-2"
                    placeholder="Tell your customers about your services..."
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Business Logo</label>
                <div className="mt-1 flex items-center space-x-5">
                  <div className="flex-shrink-0 h-24 w-24 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                    {profileData.logoUrl ? (
                      <img src={profileData.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <label className="cursor-pointer bg-white py-2 px-3 border border-slate-300 rounded-md shadow-sm text-sm leading-4 font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <span>Change</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-slate-700">Contact Email</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    name="contactEmail"
                    value={profileData.contactEmail}
                    onChange={handleChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-slate-700">Website URL</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="url"
                    name="website"
                    value={profileData.website}
                    onChange={handleChange}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="sm:col-span-6 border-t border-slate-200 pt-6 mt-2">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Social Media Links</h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Instagram URL</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Instagram className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        name="instagram"
                        value={profileData.instagram}
                        onChange={handleChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                        placeholder="https://instagram.com/yourprofile"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Facebook URL</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Facebook className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        name="facebook"
                        value={profileData.facebook}
                        onChange={handleChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                        placeholder="https://facebook.com/yourprofile"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">TikTok URL</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LinkIcon className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        name="tiktok"
                        value={profileData.tiktok}
                        onChange={handleChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                        placeholder="https://tiktok.com/@yourprofile"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Twitter / X URL</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Twitter className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        name="twitter"
                        value={profileData.twitter}
                        onChange={handleChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                        placeholder="https://twitter.com/yourprofile"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">YouTube URL</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Youtube className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        name="youtube"
                        value={profileData.youtube}
                        onChange={handleChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                        placeholder="https://youtube.com/@yourprofile"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-5 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessProfileSettings;
