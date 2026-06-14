import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { RegisterSchema, RegisterDto } from '@parkspot/types';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterDto>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { role: 'driver' },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      setError('root', {
        message: error.response?.data?.error?.message || 'Failed to create account',
      });
    },
  });

  const onSubmit = (data: RegisterDto) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side: Form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:flex-none lg:px-20 w-full lg:w-[520px] border-r border-slate-100">
        <div className="mx-auto w-full max-w-sm">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl leading-none">P</div>
            <span className="text-xl font-bold text-blue-600 tracking-tight">ParkSpot</span>
          </a>

          <h2 className="text-3xl font-black tracking-tight text-slate-900">Create an account</h2>
          <p className="mt-2 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Sign in here
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
            <input type="hidden" {...register('role')} value="driver" />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="Dana Driver"
                className={`w-full px-4 py-3 border rounded-xl outline-none text-slate-900 placeholder:text-slate-400 transition-all focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.fullName ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
                {...register('fullName')}
              />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                className={`w-full px-4 py-3 border rounded-xl outline-none text-slate-900 placeholder:text-slate-400 transition-all focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="tel"
                placeholder="+1 555-0123"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none text-slate-900 placeholder:text-slate-400 transition-all focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white"
                {...register('phone')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className={`w-full px-4 py-3 border rounded-xl outline-none text-slate-900 placeholder:text-slate-400 transition-all focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
                {...register('password')}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 mt-2"
            >
              {registerMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account...
                </>
              ) : 'Create Account'}
            </button>

            <p className="text-xs text-center text-slate-400 pt-2">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>
          </form>
        </div>
      </div>

      {/* Right side: Guarantees Panel */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

        <div className="relative z-10 max-w-md px-12">
          <h3 className="text-3xl font-black text-white tracking-tight mb-8">ParkSpot Guarantees</h3>
          <ul className="space-y-6">
            {[
              { title: 'Guaranteed Spot', desc: 'When you book, your spot is waiting for you.' },
              { title: 'Best Prices', desc: 'Save up to 50% compared to drive-up rates.' },
              { title: 'Easy Cancellation', desc: 'Plans change. Cancel easily up to 1hr before.' },
              { title: 'Secure Payments', desc: 'Your payment info is encrypted and never stored.' },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm border border-white/30">✓</div>
                <div>
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="text-sm text-blue-100 mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
