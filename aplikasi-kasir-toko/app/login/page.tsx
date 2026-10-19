'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert('Login Gagal: ' + error.message);
    } else {
      router.push('/');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return alert('Masukkan email Anda terlebih dahulu!');
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);

    if (error) {
      alert('Gagal mengirim reset password: ' + error.message);
    } else {
      alert('Instruksi pemulihan password telah dikirim ke email Anda. Silakan cek inbox/spam.');
      setIsForgotPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full space-y-6 border border-gray-200">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-blue-600">Aplikasi Kasir POS</h1>
          <p className="text-xs text-gray-500">
            {isForgotPassword ? 'Reset Password Akun Anda' : 'Silakan login untuk mengakses sistem POS'}
          </p>
        </div>

        {!isForgotPassword ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@toko.com"
                className="w-full p-2.5 border rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 border rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Lupa Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm"
            >
              {loading ? 'Memproses...' : 'Masuk ke Aplikasi'}
            </button>
          </form>
        ) : (
            
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center pt-4 border-t border-gray-100 mt-4">
  <p className="text-xs text-gray-600">
    Belum punya toko?{' '}
    <a href="/register" className="text-blue-600 font-semibold hover:underline">
      Daftar Toko Baru
    </a>
  </p>
</div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Terdaftar</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email akun Anda"
                className="w-full p-2.5 border rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-1/2 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                Kembali Login
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
              >
                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}