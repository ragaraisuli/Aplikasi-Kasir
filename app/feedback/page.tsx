'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sesuaikan path supabase client Anda

function FeedbackFormContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('store'); // Mengambil store_id dari URL (?store=UUID_TOKO)

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('Pelayanan');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return alert('Mohon isi pesan kritik/saran Anda');
    if (!storeId) return alert('ID Toko tidak valid atau tidak ditemukan pada link QR Code.');

    setLoading(true);
    const { error } = await supabase.from('customer_feedbacks').insert([
      {
        customer_name: name || 'Anonim',
        customer_phone: phone.trim() || null,
        rating,
        category,
        message,
        store_id: storeId, // Disimpan ke kolom store_id yang baru dibuat
      },
    ]);

    setLoading(false);
    if (!error) {
      setSubmitted(true);
    } else {
      alert('Gagal mengirim feedback. Coba lagi.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border text-center space-y-4 max-w-sm w-full">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-gray-800">Terima Kasih!</h2>
          <p className="text-xs text-gray-500">
            Masukan & saran Anda sangat berharga untuk perbaikan pelayanan toko kami.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border max-w-md w-full space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-lg font-bold text-gray-800">💬 Kirim Kritik & Saran</h1>
          <p className="text-xs text-gray-500">Bantu kami meningkatkan kualitas layanan toko ini</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nama (Opsional)</label>
            <input
              type="text"
              placeholder="Kosongkan jika ingin anonim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">No. HP / WhatsApp (Opsional)</label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Rating Kepuasan</label>
            <div className="flex gap-2 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-2xl transition ${star <= rating ? 'scale-110 text-amber-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-xs bg-white outline-none"
            >
              <option value="Pelayanan">Pelayanan Kasir/Staf</option>
              <option value="Harga & Promo">Harga & Promo</option>
              <option value="Kualitas Produk">Kualitas Produk</option>
              <option value="Kebersihan">Kebersihan Toko</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Kritik / Saran Anda</label>
            <textarea
              required
              rows={4}
              placeholder="Tuliskan ulasan jujur Anda di sini..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2.5 border rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            {loading ? 'Mengirim...' : 'Kirim Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PublicFeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-xs text-gray-500">Memuat halaman...</div>}>
      <FeedbackFormContent />
    </Suspense>
  );
}