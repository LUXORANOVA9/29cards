'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import axios from 'axios';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8080/api/v1/auth/register', {
        email,
        password,
        phone: phone || undefined,
        role: 'PLAYER',
      });

      const { accessToken, user } = response.data;
      login(accessToken, user);
      
      router.push('/lobby');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-gray-800 p-8 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">Create Account</h2>
          <p className="mt-2 text-sm text-gray-400">
            Or <Link href="/login" className="font-medium text-indigo-500 hover:text-indigo-400">sign in to existing account</Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-500/10 p-4 text-sm text-red-500">
              {error}
            </div>
          )}
          
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <input
                type="email"
                required
                className="relative block w-full rounded-t-md border-0 bg-gray-700 py-2.5 px-3 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="tel"
                className="relative block w-full border-0 bg-gray-700 py-2.5 px-3 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                placeholder="Phone (Optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="relative block w-full rounded-b-md border-0 bg-gray-700 py-2.5 px-3 text-white ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
            >
              {loading ? 'Create Account' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
