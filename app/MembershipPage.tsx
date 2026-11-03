'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Member = {
  id: string
  store_id: string
  name: string
  phone: string
  points: number
  created_at: string
}

type PointSetting = {
  id?: string
  store_id: string
  min_purchase: number
  points_earned: number
  point_value_rupiah: number
}

interface MembershipPageProps {
  storeId: string | null
  userRole: 'owner' | 'kasir'
}

export default function MembershipPage({ storeId, userRole }: MembershipPageProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  
  // State Form Tambah Member
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // State Pengaturan Poin (Owner Only)
  const [pointSettings, setPointSettings] = useState<PointSetting>({
    store_id: storeId || '',
    min_purchase: 10000,
    points_earned: 1,
    point_value_rupiah: 100,
  })
  const [isSavingSetting, setIsSavingSetting] = useState(false)

  useEffect(() => {
    if (storeId) {
      fetchMembers()
      if (userRole === 'owner') {
        fetchPointSettings()
      }
    }
  }, [storeId, userRole])

  const fetchMembers = async () => {
    if (!storeId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (!error && data) setMembers(data)
    setLoading(false)
  }

  const fetchPointSettings = async () => {
    if (!storeId) return
    const { data, error } = await supabase
      .from('store_point_settings')
      .select('*')
      .eq('store_id', storeId)
      .single()

    if (data && !error) {
      setPointSettings(data)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return alert('Nama dan No HP wajib diisi!')
    if (!storeId) return alert('ID Toko tidak ditemukan!')

    setLoading(true)
    const { error } = await supabase.from('members').insert([
      {
        store_id: storeId,
        name: name.trim(),
        phone: phone.trim(),
        points: 0,
      },
    ])

    setLoading(false)
    if (error) {
      alert('Gagal mendaftarkan member (Mungkin No HP sudah terdaftar): ' + error.message)
    } else {
      alert('Member berhasil didaftarkan!')
      setName('')
      setPhone('')
      fetchMembers()
    }
  }

const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeId) return
    setIsSavingSetting(true)

    const newPointValue = Number(pointSettings.point_value_rupiah)

    const { error } = await supabase
      .from('store_point_settings')
      .upsert({
        store_id: storeId,
        min_purchase: Number(pointSettings.min_purchase),
        points_earned: Number(pointSettings.points_earned),
        point_value_rupiah: newPointValue,
      }, { onConflict: 'store_id' })

    setIsSavingSetting(false)

    if (error) {
      alert('Gagal menyimpan pengaturan: ' + error.message)
    } else {
      alert('Pengaturan poin berhasil diperbarui!')
    }
  }

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full overflow-y-auto space-y-6">
      {/* Header Halaman */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">⭐ Manajemen Membership & Poin Pelanggan</h2>
          <p className="text-xs text-gray-500 mt-0.5">Kelola data pelanggan setia dan atur sistem reward poin toko Anda.</p>
        </div>
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold uppercase">
          Role: {userRole}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form Pendaftaran Member (Bisa diakses Kasir & Owner) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-base font-bold text-gray-800">✨ Tambah Member Baru</h3>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Pelanggan</label>
              <input
                type="text"
                placeholder="Contoh: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nomor WhatsApp / HP</label>
              <input
                type="text"
                placeholder="Contoh: 081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Daftarkan Member'}
            </button>
          </form>

          {/* Pengaturan Poin (Hanya muncul jika userRole === 'owner') */}
          {userRole === 'owner' && (
            <div className="pt-6 border-t border-gray-200 mt-6 space-y-4">
              <h3 className="text-base font-bold text-gray-800">⚙️ Pengaturan Poin Toko</h3>
              <form onSubmit={handleSaveSettings} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Kelipatan Belanja (Rp)</label>
                  <input
                    type="number"
                    value={pointSettings.min_purchase}
                    onChange={(e) => setPointSettings({...pointSettings, min_purchase: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Poin Didapat per Kelipatan</label>
                  <input
                    type="number"
                    value={pointSettings.points_earned}
                    onChange={(e) => setPointSettings({...pointSettings, points_earned: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">1 Poin Setara Rupiah (Redeem)</label>
                  <input
                    type="number"
                    value={pointSettings.point_value_rupiah}
                    onChange={(e) => setPointSettings({...pointSettings, point_value_rupiah: Number(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingSetting}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm font-bold transition-colors shadow"
                >
                  {isSavingSetting ? 'Menyimpan...' : 'Simpan Pengaturan Poin'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Daftar Member Terdaftar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 md:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">Daftar Pelanggan Member ({members.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase">
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">No HP</th>
                  <th className="py-3 px-4">Total Poin</th>
                  <th className="py-3 px-4">Tanggal Daftar</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">Memuat data...</td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">Belum ada member terdaftar.</td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-800">{m.name}</td>
                      <td className="py-3 px-4 text-gray-600">{m.phone}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">{m.points} Poin</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {new Date(m.created_at).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}