import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, User, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { api, apiClient } from '../api/index';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', companyName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/register', {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'operator',
      });
      const { user, accessToken } = response.data.data;

      // Store token and redirect
      apiClient.setToken(accessToken);
      localStorage.setItem('operator_access_token', accessToken);
      localStorage.setItem('operator_token', 'valid');

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp = "w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all text-slate-900";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Create Operator Account</h1>
          <p className="text-slate-500 text-sm mt-1">Join ParkSpot and list your parking facilities</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" className={inp + ' pl-10'} placeholder="John Smith" value={form.fullName}
                  onChange={e => set('fullName', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" className={inp + ' pl-10'} placeholder="you@company.com" value={form.email}
                  onChange={e => set('email', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="tel" className={inp + ' pl-10'} placeholder="+91 98765 43210" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" className={inp + ' pl-10'} placeholder="Min 8 characters" value={form.password}
                  onChange={e => set('password', e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" className={inp + ' pl-10'} placeholder="Repeat password" value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)} required />
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>After registration, your account will be reviewed by our admin team before you can add facilities.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Creating account...</>
              ) : 'Create Operator Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-600 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-semibold">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
