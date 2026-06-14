import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { LoginSchema, LoginDto } from '@parkspot/types';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      setError('root', {
        message: error.response?.data?.error?.message || 'Failed to login',
      });
    },
  });

  const onSubmit = (data: LoginDto) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side: Form */}
      <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:flex-none lg:px-20 w-full lg:w-[480px] border-r border-slate-100">
        <div className="mx-auto w-full max-w-sm">

          {/* Logo */}
          <a href="/" className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl leading-none">P</div>
            <span className="text-xl font-bold text-blue-600 tracking-tight">ParkSpot</span>
          </a>

          <h2 className="text-3xl font-black tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Create a driver account
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5">
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className={`w-full px-4 py-3 border rounded-xl outline-none text-slate-900 placeholder:text-slate-400 transition-all focus:ring-2 focus:ring-blue-600 focus:border-blue-600 ${errors.password ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'}`}
                {...register('password')}
              />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Forgot password?</a>
            </div>

            {errors.root && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                {errors.root.message}
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      {/* Right side: Illustration Panel */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

        <div className="relative z-10 text-center max-w-sm px-8">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/30">
            <Car className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-black text-white tracking-tight">Find Parking in Seconds</h3>
          <p className="text-blue-100 mt-4 text-lg leading-relaxed">
            Reserve your spot in advance. No more circling the block. Look, Book, Park.
          </p>
          <div className="mt-10 flex items-center justify-center gap-8 text-white">
            <div className="text-center">
              <div className="text-3xl font-black">4.8★</div>
              <div className="text-xs text-blue-200 mt-1">App Rating</div>
            </div>
            <div className="w-px h-10 bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-black">100M+</div>
              <div className="text-xs text-blue-200 mt-1">Cars Parked</div>
            </div>
            <div className="w-px h-10 bg-white/20"></div>
            <div className="text-center">
              <div className="text-3xl font-black">13+</div>
              <div className="text-xs text-blue-200 mt-1">Years</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
