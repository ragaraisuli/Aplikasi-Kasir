'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Product = {
  id: number
  name: string
  sku?: string
  sell_price?: number
  buy_price?: number
  price?: number
  stock: number
  unit?: string
  barcode?: string
  category?: string
  image_url?: string
}

type CartItem = {
  id: number
  name: string
  price: number
  stock: number
  quantity: number
  unit?: string
}

type Transaction = {
  id: string
  created_at: string
  subtotal?: number
  total_amount: number
  cashier_name?: string
  payment_method?: string
}

type TransactionItem = {
  id: number
  transaction_id: string
  product_name: string
  price: number
  qty: number
}

type Debt = {
  id: number
  transaction_id?: string
  customer_name: string
  customer_phone?: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  status: 'Belum Lunas' | 'Lunas'
  due_date?: string
  created_at: string
}

type Promo = {
  id: number
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  target_type: 'all' | 'specific'
  product_ids?: number[]
  payment_method: string
  promo_code?: string
  is_active: boolean
  created_at: string
}

type Category = {
  id: number
  name: string
}

export default function KasirPage() {
 const [activeTab, setActiveTab] = useState(() => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash.replace('#', '');
    if (hash) return hash;
  }
  return 'dashboard'; // Default jika tidak ada hash di URL
});
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua')
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([])
  const [allTransactionItems, setAllTransactionItems] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<any>(null)
  const [paymentInput, setPaymentInput] = useState('')

const handleMenuClick = (tabName: string) => {
    setActiveTab(tabName);
    window.location.hash = tabName; // Ini yang menjaga agar posisi tab terekam di URL saat di-refresh!
  };

// Letakkan state ini di bagian atas komponen bersama state lainnya
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

// State untuk role pengguna dan status loading
  const [userRole, setUserRole] = useState<'owner' | 'kasir'>('owner'); // Default owner atau kasir
  const [loadingRole, setLoadingRole] = useState<boolean>(true);

  // Ambil role pengguna dari tabel profiles berdasarkan user yang sedang login
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile && profile.role) {
            setUserRole(profile.role.toLowerCase() === 'owner' ? 'owner' : 'kasir');
          }
        }
      } catch (err) {
        console.error('Gagal memuat role pengguna:', err);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();
  }, []);

  // Filter item berdasarkan rentang tanggal jika dipilih
  const filteredItems = (allTransactionItems || []).filter((item: any) => {
    // Ambil tanggal transaksi (asumsi item memiliki created_at atau kita bisa sandingkan)
    const itemDate = item.created_at ? item.created_at.split('T')[0] : '';
    
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  });

// Kalkulasi data produk terlaris dari data yang sudah difilter tanggal
  const productSalesMap: { [key: string]: { name: string; qty: number; revenue: number } } = {};

  filteredItems.forEach((item: any) => {
    const productName = item.product_name || 'Produk Tanpa Nama';
    const qty = Number(item.qty || 1);
    const price = Number(item.price || 0);

    if (!productSalesMap[productName]) {
      productSalesMap[productName] = { name: productName, qty: 0, revenue: 0 };
    }
    productSalesMap[productName].qty += qty;
    productSalesMap[productName].revenue += price * qty;
  });

  const topProducts: { name: string; qty: number; revenue: number }[] = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty);

  // Kalkulasi Tren Penjualan Harian (7 hari terakhir)
  const dailySalesMap: { [key: string]: number } = {}
  transactions.forEach((trx: any) => {
    const dateKey = new Date(trx.created_at || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    if (!dailySalesMap[dateKey]) {
      dailySalesMap[dateKey] = 0
    }
    dailySalesMap[dateKey] += trx.total_amount || trx.total || 0
  })
  const dailySalesArray: { date: string; total: number }[] = Object.keys(dailySalesMap).map(date => ({
    date,
    total: dailySalesMap[date]
  })).slice(-7)

  // Contoh jika mengambil ID atau nama toko dari sesi login / state aktif
  const currentStoreId = 'toko-pusat'
  
  // State Pencarian & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [tableSearchTerm, setTableSearchTerm] = useState('')
  const [debtSearchTerm, setDebtSearchTerm] = useState('')
  
  // State Pembayaran Kasir & Utang
  const [cashPaid, setCashPaid] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Transfer' | 'Utang'>('Tunai')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState('')

  // State Form Promo Baru
  const [newPromoName, setNewPromoName] = useState('')
  const [newDiscountType, setNewDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [newDiscountValue, setNewDiscountValue] = useState('')
  const [newTargetType, setNewTargetType] = useState<'all' | 'specific'>('all')
  const [newPromoProductIds, setNewPromoProductIds] = useState<number[]>([]) 
  const [newPromoPaymentMethod, setNewPromoPaymentMethod] = useState('all')
  const [newPromoCode, setNewPromoCode] = useState('')

  // State Modal Struk & Detail Item
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const [barcodeInput, setBarcodeInput] = useState('')
  const [cashierName, setCashierName] = useState('Kasir 1')
  const [loading, setLoading] = useState(false)

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const stockBarcodeInputRef = useRef<HTMLInputElement>(null)

  const [scannedRestockProduct, setScannedRestockProduct] = useState<Product | null>(null)
  const [restockInputBarcode, setRestockInputBarcode] = useState('')
  const [restockQty, setRestockQty] = useState('')
  const [restockType, setRestockType] = useState<'add' | 'reduce'>('add')

  // State Form Produk Baru / Edit
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [newSku, setNewSku] = useState('')
  const [newBuyPrice, setNewBuyPrice] = useState('')
  const [newSellPrice, setNewSellPrice] = useState('')
  const [newStock, setNewStock] = useState('')
  const [newUnit, setNewUnit] = useState('pcs')
  const [newBarcode, setNewBarcode] = useState('')
  const [newCategory, setNewCategory] = useState('Sembako')
  const [newImageUrl, setNewImageUrl] = useState('')


// Fungsi untuk mengunduh laporan ke file CSV (Format standar Excel Indonesia menggunakan titik koma ;)
  const exportToCSV = () => {
    // 1. Header & Data untuk Valuasi Modal per Produk
    let csvContent = "=== VALUASI MODAL PER PRODUK ===\n";
    csvContent += "Nama Produk;Stok Sisa;Harga Beli (Modal);Total Nilai Aset (Rp)\n";

    products.forEach((p: any) => {
      const safeName = String(p.name || '').replace(/"/g, '""');
      const stock = Number(p.stock) || 0;
      const buyPrice = Number(p.buy_price) || 0;
      const totalAssetValue = stock * buyPrice;

      csvContent += `"${safeName}";${stock};${buyPrice};${totalAssetValue}\n`;
    });

    csvContent += "\n\n"; // Jarak antar tabel

    // 2. Header & Data untuk Analisis Profitabilitas per Produk
    csvContent += "=== ANALISIS PROFITABILITAS PER PRODUK ===\n";
    csvContent += "Nama Produk;Jumlah Terjual;Total Omzet (Rp);Total Modal HPP (Rp);Laba Kotor (Rp);Margin (%)\n";

    productSalesSummary.forEach((p: any) => {
      const safeName = String(p.name || '').replace(/"/g, '""');
      csvContent += `"${safeName}";${p.qtySold};${p.totalRevenue};${p.totalCOGS};${p.grossProfit};${p.profitMargin}%\n`;
    });

    // Buat Blob dari data CSV dengan BOM (\ufeff) agar karakter & format terbaca sempurna di Excel
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Buat elemen link virtual untuk memicu download otomatis di browser
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_Valuasi_dan_Profitabilitas_${startDate || 'semua'}_sd_${endDate || 'semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Bersihkan memori
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

const [storeProfile, setStoreProfile] = useState<any>({
  id: '',
  store_name: 'POS SaaS Toko',
  address: 'Jl. Raya Utama No. 123, Tangerang',
  phone: '0812-3456-7890',
});

// Ambil data profil toko dari tabel stores
const fetchStoreProfile = async () => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .limit(1)
    .single();

  if (data && !error) {
    setStoreProfile(data);
  }
};

const handleTabChange = (tab: string) => {
  setActiveTab(tab);
  if (typeof window !== 'undefined') {
    window.location.hash = tab;
  }
};

useEffect(() => {
  fetchStoreProfile();
}, []);

const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveTab(hash);
      }
    // Jalankan saat pertama kali muat & dengarkan perubahan hash
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    }

const handleSaveProfile = async (e: React.FormEvent) => {
  e.preventDefault();

  // Jika data toko sudah ada (berdasarkan ID), lakukan update
  if (storeProfile.id) {
    const { error } = await supabase
      .from('stores')
      .update({
        store_name: storeProfile.store_name,
        address: storeProfile.address,
        phone: storeProfile.phone,
      })
      .eq('id', storeProfile.id);

    if (error) {
      alert('Gagal menyimpan profil: ' + error.message);
    } else {
      alert('Profil toko berhasil diperbarui!');
      fetchStoreProfile();
    }
  } else {
    // Jika tabel kosong, lakukan insert baru
    const { error } = await supabase
      .from('stores')
      .insert([{
        store_name: storeProfile.store_name,
        address: storeProfile.address,
        phone: storeProfile.phone,
      }]);

    if (error) {
      alert('Gagal menambah profil: ' + error.message);
    } else {
      alert('Profil toko berhasil disimpan!');
      fetchStoreProfile();
    }
  }
};

const fetchFeedbacks = async () => {
  const { data, error } = await supabase
    .from('customer_feedbacks')
    .select('*')
    .order('created_at', { ascending: false });

  if (!error && data) {
    setFeedbacks(data);
  }
};

// Fungsi untuk memformat angka menjadi format ribuan (contoh: 15000 jadi 15.000)
const formatRupiah = (value: string) => {
  const numberString = value.replace(/[^,\d]/g, '').toString();
  const split = numberString.split(',');
  const sisa = split[0].length % 3;
  let rupiah = split[0].substr(0, sisa);
  const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

  if (ribuan) {
    const separator = sisa ? '.' : '';
    rupiah += separator + ribuan.join('.');
  }

  return split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
};

const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setPaymentInput(formatRupiah(e.target.value));
};

const handleOpenPayModal = (debt: any) => {
  setSelectedDebt(debt);
  setPaymentInput('');
  setIsPayModalOpen(true);
};

const handleSubmitPayment = async () => {
  // Ubah kembali string berformat "16.500" menjadi angka murni 16500
  const rawValue = paymentInput.replace(/\./g, '');
  const numericPayment = parseInt(rawValue, 10);

  if (isNaN(numericPayment) || numericPayment <= 0) {
    return alert('Masukkan nominal pembayaran yang valid!');
  }

  if (numericPayment > selectedDebt.remaining_amount) {
    return alert('Nominal pembayaran melebihi sisa utang!');
  }

  const newPaid = selectedDebt.paid_amount + numericPayment;
  const newRemaining = selectedDebt.remaining_amount - numericPayment;
  const newStatus = newRemaining <= 0 ? 'Lunas' : 'Belum Lunas';

  // Proses update ke tabel 'debts' di Supabase
  const { error } = await supabase
    .from('debts')
    .update({
      paid_amount: newPaid,
      remaining_amount: newRemaining,
      status: newStatus
    })
    .eq('id', selectedDebt.id);

  if (error) {
    alert('Gagal memproses pembayaran: ' + error.message);
  } else {
    alert('Pembayaran berhasil dicatat!');
    setIsPayModalOpen(false);
    // fetchDebts(); // Panggil ulang fungsi untuk memuat data terbaru jika ada
  }
};

  // Fungsi untuk mengambil semua data transaction_items saat halaman dimuat
  const fetchAllTransactionItems = async () => {
    const { data, error } = await supabase
      .from('transaction_items')
      .select('*');
      
    if (error) {
      console.error('Gagal memuat semua item transaksi:', error.message);
    } else if (data) {
      setAllTransactionItems(data);
    }
  };

  // Panggil fungsi ini di dalam useEffect utama saat komponen pertama kali dirender
useEffect(() => {
  fetchCategories();
  fetchAllTransactionItems();
}, [currentStoreId]);

  useEffect(() => {
    fetchProducts()
    fetchTransactions()
    fetchDebts()
    fetchPromos()
  }, [])

  useEffect(() => {
    if (activeTab === 'pos' && barcodeInputRef.current) {
      barcodeInputRef.current.focus()
    } else if (activeTab === 'products' && stockBarcodeInputRef.current) {
      stockBarcodeInputRef.current.focus()
    }
  }, [activeTab])

  async function fetchProducts() {
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false })
    if (error) {
      console.error('Gagal memuat produk:', error.message)
    } else if (data) {
      setProducts(data)
    }
  }

async function fetchTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Gagal memuat transaksi:', error.message);
    } else if (data) {
      setTransactions(data);
    }
  }

  async function fetchDebts() {
    const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('Gagal memuat data utang:', error.message)
    } else if (data) {
      setDebts(data)
    }
  }

  async function fetchPromos() {
    const { data, error } = await supabase.from('promos').select('*').order('id', { ascending: false })
    if (error) {
      console.error('Gagal memuat data promo:', error.message)
    } else if (data) {
      setPromos(data)
    }
  }

  async function fetchTransactionItems(transactionId: string) {
    setTransactionItems([])
    const { data, error } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', transactionId)

    if (error) {
      console.error('Gagal memuat detail item:', error.message)
    } else if (data) {
      setTransactionItems(data)
    }
  }

  const handleOpenReceipt = (t: Transaction) => {
    setSelectedTransaction(t)
    fetchTransactionItems(t.id)
  }

  const addToCart = (product: Product) => {
    const itemPrice = product.sell_price ?? product.price ?? 0
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity + 1 > product.stock) {
          alert('Stok produk tidak mencukupi!')
          return prevCart
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      if (product.stock <= 0) {
        alert('Produk habis!')
        return prevCart
      }
      return [...prevCart, { id: product.id, name: product.name, price: itemPrice, stock: product.stock, quantity: 1, unit: product.unit || 'pcs' }]
    })
  }

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    const matchedProduct = products.find(
      (p) => p.barcode?.toLowerCase() === barcodeInput.trim().toLowerCase() ||
             p.sku?.toLowerCase() === barcodeInput.trim().toLowerCase()
    )

    if (matchedProduct) {
      addToCart(matchedProduct)
      setBarcodeInput('')
    } else {
      alert('Produk dengan barcode/SKU tersebut tidak ditemukan!')
      setBarcodeInput('')
    }
  }

  const handleRestockBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = restockInputBarcode.trim()
    if (!query) return

    const found = products.find(
      (p) => p.barcode?.toLowerCase() === query.toLowerCase() ||
             p.sku?.toLowerCase() === query.toLowerCase()
    )

    if (found) {
      setScannedRestockProduct(found)
      setRestockInputBarcode('')
    } else {
      setScannedRestockProduct(null)
      setNewBarcode(query)
      setRestockInputBarcode('')
      alert('Barcode belum terdaftar. Silakan lengkapi data untuk mendaftarkannya sebagai produk baru di bawah.')
    }
  }

  const handleUpdateStockOnly = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scannedRestockProduct || !restockQty) return

    const amount = parseInt(restockQty, 10)
    if (isNaN(amount) || amount <= 0) {
      return alert('Masukkan jumlah angka bulat yang valid!')
    }

    let updatedStock = scannedRestockProduct.stock
    if (restockType === 'add') {
      updatedStock += amount
    } else {
      updatedStock -= amount
      if (updatedStock < 0) updatedStock = 0
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: updatedStock })
        .eq('id', scannedRestockProduct.id)

      if (error) throw error

      const actionText = restockType === 'add' ? `bertambah ${amount}` : `berkurang ${amount}`
      alert(`Berhasil! Stok "${scannedRestockProduct.name}" ${actionText} (Total: ${updatedStock})`)
      setScannedRestockProduct(null)
      setRestockQty('')
      fetchProducts()
      if (stockBarcodeInputRef.current) stockBarcodeInputRef.current.focus()
    } catch (error: any) {
      alert('Gagal memperbarui stok: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

// Fungsi untuk Tambah / Kurangi Stok Langsung dari Tabel
const handleQuickStockUpdate = async (productId: number, currentStock: number, delta: number) => {
    const newStock = Math.max(0, Number(currentStock) + delta)

    setProducts((prev: Product[]) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    )

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', productId)

    if (error) {
      console.error('Gagal memperbarui stok:', error.message)
      fetchProducts()
    }
  }

// Fungsi upload foto produk langsung ke Supabase Storage
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      
      // Buat nama file yang unik berdasarkan waktu
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
      const filePath = `${fileName}`

      // Upload ke bucket 'product-images' di Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Dapatkan Public URL dari file yang baru di-upload
      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      if (publicUrlData && publicUrlData.publicUrl) {
        setNewImageUrl(publicUrlData.publicUrl)
        alert('Foto berhasil diunggah ke Storage!')
      }
    } catch (error: any) {
      alert('Gagal mengunggah foto: ' + (error.message || error))
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = (id: number, valStr: string) => {
    const newQty = parseInt(valStr, 10)
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            if (isNaN(newQty) || newQty <= 0) {
              return { ...item, quantity: 0 }
            }
            if (newQty > item.stock) {
              alert('Melebihi stok yang tersedia!')
              return item
            }
            return { ...item, quantity: newQty }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    )
  }

  const incrementQty = (id: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id) {
          if (item.quantity + 1 > item.stock) {
            alert('Stok produk tidak mencukupi!')
            return item
          }
          return { ...item, quantity: item.quantity + 1 }
        }
        return item
      })
    )
  }

  const decrementQty = (id: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            return { ...item, quantity: item.quantity - 1 }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    )
  }

  const calculateCartWithPromo = () => {
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    let totalDiscount = 0

    const activePromos = promos.filter(p => p.is_active)

    for (const promo of activePromos) {
      if (promo.payment_method !== 'all' && promo.payment_method !== paymentMethod) {
        continue
      }
      if (promo.promo_code && promo.promo_code.trim().toLowerCase() !== appliedPromoCode.trim().toLowerCase()) {
        continue
      }

      if (promo.target_type === 'all') {
        if (promo.discount_type === 'percentage') {
          totalDiscount += (subtotal * promo.discount_value) / 100
        } else {
          totalDiscount += promo.discount_value
        }
      } else if (promo.target_type === 'specific' && promo.product_ids && promo.product_ids.length > 0) {
        cart.forEach((item) => {
          if (promo.product_ids?.includes(item.id)) {
            const itemTotal = item.price * item.quantity
            if (promo.discount_type === 'percentage') {
              totalDiscount += (itemTotal * promo.discount_value) / 100
            } else {
              totalDiscount += promo.discount_value
            }
          }
        })
      }
    }

    if (totalDiscount > subtotal) totalDiscount = subtotal
    const totalAmount = subtotal - totalDiscount

    return {
      subtotal: Math.round(subtotal),
      discount: Math.round(totalDiscount),
      totalAmount: Math.round(totalAmount)
    }
  }

  const calculation = calculateCartWithPromo()

  const handleCashPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    if (rawValue === '') {
      setCashPaid('')
    } else {
      const numericValue = parseInt(rawValue, 10)
      setCashPaid(numericValue.toLocaleString('id-ID'))
    }
  }
  const numericCashPaid = parseFloat(cashPaid.replace(/\./g, '')) || 0
  const changeAmount = numericCashPaid - calculation.totalAmount

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang masih kosong!')
    if (paymentMethod === 'Tunai' && numericCashPaid < calculation.totalAmount) {
      return alert('Uang tunai dari customer kurang!')
    }
    if (paymentMethod === 'Utang' && !customerName.trim()) {
      return alert('Nama pelanggan wajib diisi untuk transaksi utang!')
    }

    setLoading(true)

    try {
      const { data: trxData, error: trxError } = await supabase
        .from('transactions')
        .insert([
          {
            subtotal: calculation.subtotal,
            total_amount: calculation.totalAmount,
            cashier_name: cashierName,
            payment_method: paymentMethod,
          },
        ])
        .select()

      if (trxError) throw trxError
      const newTransactionId = trxData[0].id

      const itemsPayload = cart.map((item) => ({
        transaction_id: newTransactionId,
        product_id: item.id,
        product_name: item.name,
        price: item.price,
        qty: item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(itemsPayload)

      if (itemsError) throw itemsError

      if (paymentMethod === 'Utang') {
        const { error: debtError } = await supabase
          .from('debts')
          .insert([
            {
              transaction_id: newTransactionId,
              customer_name: customerName.trim(),
              customer_phone: customerPhone.trim() || null,
              total_amount: calculation.totalAmount,
              paid_amount: 0,
              remaining_amount: calculation.totalAmount,
              status: 'Belum Lunas'
            }
          ])

        if (debtError) throw debtError
      }

      for (const item of cart) {
        const productInDb = products.find((p) => p.id === item.id)
        if (productInDb) {
          const newStock = productInDb.stock - item.quantity
          const { error: stockError } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.id)

          if (stockError) throw stockError
        }
      }

      const createdTransaction: Transaction = {
        id: newTransactionId,
        created_at: new Date().toISOString(),
        total_amount: calculation.totalAmount,
        cashier_name: cashierName,
        payment_method: paymentMethod
      }

      setCart([])
      setCashPaid('')
      setCustomerName('')
      setCustomerPhone('')
      setAppliedPromoCode('')
      setPaymentMethod('Tunai')
      fetchProducts()
      fetchTransactions()
      fetchDebts()

      handleOpenReceipt(createdTransaction)

      if (barcodeInputRef.current) barcodeInputRef.current.focus()
    } catch (error: any) {
      alert('Gagal memproses transaksi: ' + (error.message || error))
    } finally {
      setLoading(false)
    }
  }

  const handleProductSelectionToggle = (productId: number) => {
    setNewPromoProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPromoName || !newDiscountValue) {
      return alert('Nama promo dan nilai diskon wajib diisi!')
    }
    if (newTargetType === 'specific' && newPromoProductIds.length === 0) {
      return alert('Pilih minimal 1 produk untuk promo produk tertentu!')
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('promos').insert([
        {
          name: newPromoName,
          discount_type: newDiscountType,
          discount_value: parseFloat(newDiscountValue),
          target_type: newTargetType,
          product_ids: newTargetType === 'specific' ? newPromoProductIds : null,
          payment_method: newPromoPaymentMethod,
          promo_code: newPromoCode.trim() || null,
          is_active: true
        }
      ])

      if (error) throw error

      alert('Promo baru berhasil didaftarkan!')
      setNewPromoName('')
      setNewDiscountValue('')
      setNewPromoCode('')
      setNewTargetType('all')
      setNewPromoProductIds([])
      fetchPromos()
    } catch (error: any) {
      alert('Gagal menyimpan promo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePromoStatus = async (promoId: number, currentStatus: boolean) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('promos')
        .update({ is_active: !currentStatus })
        .eq('id', promoId)

      if (error) throw error
      fetchPromos()
    } catch (error: any) {
      alert('Gagal mengubah status promo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePromo = async (promoId: number, promoName: string) => {
    if (!confirm(`Yakin ingin menghapus promo "${promoName}"?`)) return
    setLoading(true)
    try {
      const { error } = await supabase.from('promos').delete().eq('id', promoId)
      if (error) throw error
      alert('Promo berhasil dihapus.')
      fetchPromos()
    } catch (error: any) {
      alert('Gagal menghapus promo: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePayDebt = async (debtId: number, remaining: number) => {
    const payInput = prompt(`Masukkan nominal pembayaran (Sisa Utang: Rp ${remaining.toLocaleString('id-ID')}):`, remaining.toString())
    if (!payInput) return

    const payAmount = parseFloat(payInput)
    if (isNaN(payAmount) || payAmount <= 0) {
      return alert('Masukkan nominal pembayaran yang valid!')
    }

    const currentDebt = debts.find((d) => d.id === debtId)
    if (!currentDebt) return

    const newPaidAmount = currentDebt.paid_amount + payAmount
    const newRemaining = currentDebt.total_amount - newPaidAmount
    const newStatus = newRemaining <= 0 ? 'Lunas' : 'Belum Lunas'

    setLoading(true)
    try {
      const { error } = await supabase
        .from('debts')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemaining <= 0 ? 0 : newRemaining,
          status: newStatus
        })
        .eq('id', debtId)

      if (error) throw error
      alert('Pembayaran utang berhasil diperbarui!')
      fetchDebts()
    } catch (error: any) {
      alert('Gagal melunasi utang: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDebt = async (debtId: number, customerName: string) => {
    if (!confirm(`Yakin ingin menghapus catatan utang atas nama "${customerName}"?`)) return

    setLoading(true)
    try {
      const { error } = await supabase.from('debts').delete().eq('id', debtId)
      if (error) throw error

      alert('Catatan utang berhasil dihapus!')
      fetchDebts()
    } catch (error: any) {
      alert('Gagal menghapus catatan utang: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

const fetchCategories = async () => {
  // Gunakan store_id aktif, jika kosong otomatis gunakan 'toko-pusat'
    const activeStore = currentStoreId || 'toko-pusat';
    // Sesuaikan 'currentStoreId' dengan variabel ID toko yang sedang aktif di aplikasi Anda
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', activeStore) // Filter data berdasarkan toko aktif atau fallback
      .order('id', { ascending: true })

    if (error) {
      console.error('Gagal memuat kategori:', error.message)
    } else if (data) {
      setCategories(data)
    }
  }

  const handleAddCategoryPrompt = async () => {
    const catName = prompt('Masukkan nama kategori baru:')
    if (!catName || !catName.trim()) return

    // Menyertakan store_id saat memasukkan data baru
    const { error } = await supabase
      .from('categories')
      .insert([{ name: catName.trim(), store_id: currentStoreId }])

    if (error) {
      alert('Gagal menambah kategori (mungkin sudah ada): ' + error.message)
    } else {
      alert('Kategori berhasil ditambahkan!')
      fetchCategories()
      setNewCategory(catName.trim())
    }
  }

  const handleDeleteCategory = async () => {
    if (newCategory === 'Sembako' || newCategory === 'Lainnya') {
      return alert('Kategori bawaan utama tidak dapat dihapus!')
    }
    if (!confirm(`Yakin ingin menghapus kategori "${newCategory}"?`)) return

    // Menghapus kategori berdasarkan nama DAN store_id agar aman tidak terhapus toko lain
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', newCategory)
      .eq('store_id', currentStoreId)

    if (error) {
      alert('Gagal menghapus kategori: ' + error.message)
    } else {
      alert('Kategori berhasil dihapus.')
      fetchCategories()
      setNewCategory('Sembako')
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newSellPrice || (editingId === null && !newStock)) {
      return alert('Nama, Harga Jual, dan Stok wajib diisi!')
    }

    setLoading(true)
    try {
      const payload: any = {
        name: newName,
        sku: newSku || null,
        buy_price: newBuyPrice ? parseFloat(newBuyPrice) : 0,
        sell_price: parseFloat(newSellPrice),
        unit: newUnit,
        barcode: newBarcode || null,
        category: newCategory,
        image_url: newImageUrl || null,
      }

      if (editingId === null) {
        payload.stock = parseInt(newStock, 10)
      }

      if (editingId !== null) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId)
        if (error) throw error
        alert('Produk berhasil diperbarui!')
      } else {
        const { error } = await supabase.from('products').insert([payload])
        if (error) throw error
        alert('Produk baru berhasil ditambahkan!')
      }

      resetForm()
      fetchProducts()
    } catch (error: any) {
      alert('Gagal menyimpan produk: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (p: Product) => {
    setEditingId(p.id)
    setNewName(p.name)
    setNewSku(p.sku || '')
    setNewBuyPrice(p.buy_price ? p.buy_price.toString() : '')
    setNewSellPrice((p.sell_price ?? p.price ?? 0).toString())
    setNewStock(p.stock.toString())
    setNewUnit(p.unit || 'pcs')
    setNewBarcode(p.barcode || '')
    setNewCategory(p.category || 'Sembako')
    setNewImageUrl(p.image_url || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteClick = async (id: number, name: string) => {
    if (!confirm(`Yakin ingin menghapus produk "${name}"?`)) return
    setLoading(true)
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      alert('Produk berhasil dihapus.')
      fetchProducts()
    } catch (error: any) {
      alert('Gagal menghapus produk: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setNewName('')
    setNewSku('')
    setNewBuyPrice('')
    setNewSellPrice('')
    setNewStock('')
    setNewBarcode('')
    setNewUnit('pcs')
    setNewCategory('Sembako')
    setNewImageUrl('')
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'Semua' ||
      (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase())

    return matchesSearch && matchesCategory
  })

  const filteredTableProducts = products.filter((p) =>
    p.name.toLowerCase().includes(tableSearchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(tableSearchTerm.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(tableSearchTerm.toLowerCase()))
  )

  const filteredTransactions = transactions.filter((t) => {
    const trxDate = t.created_at.split('T')[0]
    if (startDate && trxDate < startDate) return false
    if (endDate && trxDate > endDate) return false
    return true
  })

  const filteredDebts = debts.filter((d) =>
    d.customer_name.toLowerCase().includes(debtSearchTerm.toLowerCase()) ||
    (d.customer_phone && d.customer_phone.includes(debtSearchTerm))
  )

  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0)
  const totalTransactionsCount = filteredTransactions.length
  const lowStockProducts = products.filter((p) => p.stock <= 5)
  const totalUnpaidDebt = debts.filter((d) => d.status === 'Belum Lunas').reduce((sum, d) => sum + d.remaining_amount, 0)

  // 1. Perhitungan Valuasi Aset Stok di Gudang/Etalase (Nomor 1)
  const totalInventoryAssetValue = products.reduce((sum, p) => {
    const stock = Number(p.stock) || 0;
    const buyPrice = Number(p.buy_price) || 0;
    return sum + (stock * buyPrice);
  }, 0);

// 2. Perhitungan Modal Terpakai (HPP), Laba Kotor, & Margin (%)
  const totalCOGS = filteredTransactions.reduce((sum, t: any) => {
    const items = t.transaction_items || t.items || [];
    const transactionCOGS = items.reduce((itemSum: number, item: any) => {
      const qty = Number(item.qty || item.quantity) || 0;
      // Cari harga beli modal produk dari list products
      const matchedProd = products.find((p) => p.id === item.product_id || p.name === item.product_name);
      const buyPrice = Number(matchedProd?.buy_price || item.buy_price) || 0;
      return itemSum + (qty * buyPrice);
    }, 0);
    return sum + transactionCOGS;
  }, 0);

  const grossProfit = totalRevenue - totalCOGS;
  const profitMarginPercentage = totalRevenue > 0 
    ? ((grossProfit / totalRevenue) * 100).toFixed(1) 
    : '0';

  // 3. Analisis Jam Sibuk (Peak Hours)
  const hourlySalesMap: { [hour: number]: { count: number; total: number } } = {};
  filteredTransactions.forEach((t: any) => {
    if (!t.created_at) return;
    const hour = new Date(t.created_at).getHours();
    if (!hourlySalesMap[hour]) {
      hourlySalesMap[hour] = { count: 0, total: 0 };
    }
    hourlySalesMap[hour].count += 1;
    hourlySalesMap[hour].total += Number(t.total_amount) || 0;
  });

  const peakHourEntry = Object.entries(hourlySalesMap).sort(
    ([, a], [, b]) => b.count - a.count
  )[0];

  const peakHourText = peakHourEntry
    ? `${peakHourEntry[0].padStart(2, '0')}:00 - ${String(Number(peakHourEntry[0]) + 1).padStart(2, '0')}:00 (${peakHourEntry[1].count} Transaksi)`
    : 'Belum Ada Data';

// 4. Analisis Metode Pembayaran (Customer/Payment Method Preference)
  const paymentMethodMap: { [method: string]: { count: number; total: number } } = {};
  filteredTransactions.forEach((t: any) => {
    const method = t.payment_method || 'Tunai'; // Default ke Tunai jika kosong
    if (!paymentMethodMap[method]) {
      paymentMethodMap[method] = { count: 0, total: 0 };
    }
    paymentMethodMap[method].count += 1;
    paymentMethodMap[method].total += Number(t.total_amount) || 0;
  });

// Rekap Penjualan per Produk secara Global (Sinkron dengan transaction_items Supabase)
  const productSalesSummary = products.map((p) => {
    let qtySold = 0;
    let totalRevenue = 0;

    filteredTransactions.forEach((t: any) => {
      const items = t.transaction_items || t.items || [];
      items.forEach((item: any) => {
        if (
          item.product_id === p.id || 
          item.product_name === p.name || 
          item.name === p.name
        ) {
          const q = Number(item.qty || item.quantity) || 0;
          const pr = Number(item.price) || 0;
          qtySold += q;
          totalRevenue += (q * pr);
        }
      });
    });

    const buyPrice = Number(p.buy_price) || 0;
    const totalCOGS = qtySold * buyPrice;
    const grossProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

    return {
      ...p,
      qtySold,
      totalRevenue,
      totalCOGS,
      grossProfit,
      profitMargin,
    };
  });

  return (
    <main className="flex h-screen bg-gray-100 flex-col">
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-4">
<h1 className="text-xl font-bold text-blue-600">
  {storeProfile.store_name || 'POS SaaS Toko'}
</h1>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('reports')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'reports' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Laporan & Riwayat
            </button>
            <button
              onClick={() => handleTabChange('debts')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'debts' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Utang Piutang
            </button>
            <button
              onClick={() => handleTabChange('promos')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'promos' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Diskon & Promo
            </button>
            <button
              onClick={() => handleTabChange('pos')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'pos' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kasir (POS)
            </button>
            <button
              onClick={() => handleTabChange('products')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                activeTab === 'products' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kelola Produk
            </button>

{/* Hanya tampil jika akun yang aktif adalah Owner */}
{userRole === 'owner' && (
  <>
    <button
      onClick={() => handleTabChange('voc')}
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
        activeTab === 'voc' 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      💬 Voice of Customer
    </button>

    <button
      onClick={() => handleTabChange('profile')}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
        activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
      }`}
    >
      ⚙️ Profil Toko
    </button>
  </>
)}

          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Kasir:</span>
          <input
            type="text"
            value={cashierName}
            onChange={(e) => setCashierName(e.target.value)}
            className="text-sm border px-2 py-1 rounded w-32 text-gray-700 bg-gray-50 font-semibold"/>
        </div>
      </header>


{activeTab === 'dashboard' && userRole === 'owner' && (
        <div className="flex-1 p-8 max-w-6xl mx-auto w-full overflow-y-auto space-y-6">

{/* Header & Filter Tanggal */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
            <h2 className="text-xl font-bold text-gray-800">📊 Ringkasan Toko & Penjualan</h2>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-gray-500 font-semibold">Filter Tanggal:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="border p-1.5 rounded-lg text-gray-700"
              />
              <span className="text-gray-400">s/d</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="border p-1.5 rounded-lg text-gray-700"
              />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(''); setEndDate(''); }} 
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-medium"
                >
                  Reset
                </button>
              )}
              {/* Tombol Ekspor Data */}
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition-colors ml-2"
                title="Unduh data laporan sesuai filter tanggal"
              >
                📥 Ekspor Excel (CSV)
              </button>
            </div>
          </div>

          {/* Kartu Statistik Utama (Bruto, Netto Realtime, Transaksi, Piutang, Produk) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Pendapatan (Bruto)</p>
              <p className="text-xl font-bold text-blue-600 mt-2">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            </div>

{/* Kartu Pendapatan Bersih (Netto) Realtime */}
            {(() => {
              let totalNettoRealtime = 0;
              transactions.forEach((tx: any) => {
                const itemsList = tx.items || tx.transaction_items || [];
                
                itemsList.forEach((item: any) => {
                  const qty = Number(item.qty || item.quantity || 1);
                  const sellPrice = Number(item.price || item.sell_price || 0);
                  
                  const matchedProduct = products.find((p: any) => 
                    p.id === item.product_id || p.id === item.productId || p.name === item.product_name || p.name === item.name
                  );
                  
                  const buyPrice = matchedProduct 
                    ? Number(matchedProduct.buy_price || 0) 
                    : Number(item.buy_price || item.buyPrice || 0);

                  totalNettoRealtime += (sellPrice - buyPrice) * qty;
                });
              });
              
              return (
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase">Pendapatan Bersih (Netto)</p>
                  <p className="text-xl font-bold text-emerald-700 mt-2">Rp {totalNettoRealtime.toLocaleString('id-ID')}</p>
                </div>
              );
            })()}

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Transaksi</p>
              <p className="text-xl font-bold text-green-600 mt-2">{totalTransactionsCount} Transaksi</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Piutang Belum Lunas</p>
              <p className="text-xl font-bold text-red-600 mt-2">Rp {totalUnpaidDebt.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Total Jenis Produk</p>
              <p className="text-xl font-bold text-purple-600 mt-2">{products.length} Produk</p>
            </div>
          </div>

{/* Bungkus kedua kartu di dalam grid 2 kolom */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  
  {/* Kartu Valuasi Aset Stok / Modal Tertahan */}
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        Valuasi Aset Stok (Modal)
      </p>
      <h3 className="text-xl font-bold text-gray-800">
        Rp {totalInventoryAssetValue.toLocaleString('id-ID')}
      </h3>
    </div>
    <p className="text-[11px] text-gray-400 mt-2">
      Total modal barang yang ada di gudang/etalase
    </p>
  </div>

  {/* Kartu Laba Kotor & Persentase Margin */}
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        Laba Kotor & Margin
      </p>
      <h3 className="text-xl font-bold text-emerald-600">
        Rp {grossProfit.toLocaleString('id-ID')}
      </h3>
    </div>
    <div className="mt-2 flex items-center justify-between">
      <span className="text-[11px] text-gray-500">Margin Keuntungan:</span>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
        {profitMarginPercentage}%
      </span>
    </div>
  </div>

</div>

{/* Grid untuk Analisis Waktu & Tren (Nomor 4) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  
  {/* Kartu Jam Sibuk (Peak Hours) */}
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        ⏰ Jam Sibuk Toko (Peak Hours)
      </p>
      <h3 className="text-lg font-bold text-gray-800">
        {peakHourText}
      </h3>
    </div>
    <p className="text-[11px] text-gray-400 mt-2">
      Waktu dengan frekuensi transaksi terbanyak dalam sehari
    </p>
  </div>

  {/* Kartu Ringkasan Tren Harian / Aktivitas */}
  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        📊 Total Transaksi Periode Ini
      </p>
      <h3 className="text-xl font-bold text-blue-600">
        {totalTransactionsCount} Transaksi
      </h3>
    </div>
    <div className="mt-2 flex items-center justify-between">
      <span className="text-[11px] text-gray-500">Rata-rata per Transaksi:</span>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
        Rp {totalTransactionsCount > 0 ? Math.round(totalRevenue / totalTransactionsCount).toLocaleString('id-ID') : 0}
      </span>
    </div>
  </div>

</div>

{/* Kartu / Tabel Ringkasan Metode Pembayaran Pelanggan */}
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 mt-4">
  <div>
    <h3 className="text-base font-bold text-gray-800">💳 Preferensi Metode Pembayaran</h3>
    <p className="text-xs text-gray-500">Melihat metode pembayaran yang paling diminati oleh pelanggan.</p>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    {Object.keys(paymentMethodMap).length > 0 ? (
      Object.entries(paymentMethodMap).map(([method, data]) => (
        <div key={method} className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 uppercase">
              {method}
            </span>
            <h4 className="text-lg font-bold text-gray-800 mt-3">
              Rp {data.total.toLocaleString('id-ID')}
            </h4>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Digunakan dalam <span className="font-semibold text-gray-700">{data.count} transaksi</span>
          </p>
        </div>
      ))
    ) : (
      <p className="text-xs text-gray-400 py-4">Belum ada data transaksi.</p>
    )}
  </div>
</div>

          {/* Widget 2 Kolom: Produk Terlaris & Tren Penjualan Harian */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Widget 2: Produk Terlaris (Top Products) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 mt-4">
  <h3 className="text-base font-bold text-gray-800">🔥 5 Produk Terlaris</h3>
  <div className="space-y-3">
    {/* Urutkan berdasarkan qtySold terbanyak, lalu ambil 5 teratas */}
    {productSalesSummary
      .slice()
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 5)
      .map((p) => (
        <div key={p.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">{p.name}</h4>
            <p className="text-xs text-gray-500">Total Pendapatan: Rp {p.totalRevenue.toLocaleString('id-ID')}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
            {p.qtySold} Terjual
          </span>
        </div>
      ))}
  </div>
</div>

{/* Rekap Valuasi & Aset Per Produk */}
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
  <div className="flex justify-between items-center">
    <div>
      <h3 className="text-base font-bold text-gray-800">📦 Valuasi Modal per Produk</h3>
      <p className="text-xs text-gray-500">Rincian nilai modal yang tertanam pada setiap stok produk aktif.</p>
    </div>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b text-xs text-gray-500 bg-gray-50">
          <th className="p-3 font-semibold">Nama Produk</th>
          <th className="p-3 font-semibold">Stok Sisa</th>
          <th className="p-3 font-semibold">Harga Beli (Modal)</th>
          <th className="p-3 font-semibold text-right">Total Nilai Aset</th>
        </tr>
      </thead>
      <tbody className="text-xs divide-y">
        {products.map((p) => {
          const stock = Number(p.stock) || 0;
          const buyPrice = Number(p.buy_price) || 0;
          const itemAssetValue = stock * buyPrice;

          return (
            <tr key={p.id} className="hover:bg-gray-50/50">
              <td className="p-3 font-medium text-gray-800">{p.name}</td>
              <td className="p-3 text-gray-600">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${stock <= 1 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {stock} {p.unit || 'pcs'}
                </span>
              </td>
              <td className="p-3 text-gray-600">Rp {buyPrice.toLocaleString('id-ID')}</td>
              <td className="p-3 text-right font-bold text-gray-800">
                Rp {itemAssetValue.toLocaleString('id-ID')}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>

            {/* Widget 3: Grafik Tren Penjualan Harian (Simple Bar Visualizer) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3">📈 Tren Penjualan Harian (7 Hari Terakhir)</h3>
                {dailySalesArray.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Belum ada catatan grafik harian.</p>
                ) : (
                  <div className="space-y-2.5 mt-4">
                    {dailySalesArray.map((item, idx) => {
                      const maxVal = Math.max(...dailySalesArray.map(d => d.total), 1);
                      const percentage = Math.round((item.total / maxVal) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium text-gray-600">
                            <span>{item.date}</span>
                            <span className="font-bold text-gray-800">Rp {item.total.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(percentage, 4)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Widget Bawah: Ringkasan Stok & Peringatan Saja (Tanpa Kartu Aset) */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            
            {/* 1. KARTU RINGKASAN & ALERT STOK PRODUK */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800">📦 Ringkasan & Peringatan Stok</h3>
                <span className="text-xs text-gray-500 font-medium">Total: {products.length} Produk</span>
              </div>

              {/* Indikator Status Stok (Dipisah Aman, Menipis, Habis) */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="block text-[11px] font-medium text-emerald-700">Aman (&gt;5)</span>
                  <span className="text-lg font-bold text-emerald-800">
                    {products.filter(p => p.stock > 5).length}
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <span className="block text-[11px] font-medium text-amber-700">Menipis (1-5)</span>
                  <span className="text-lg font-bold text-amber-800">
                    {products.filter(p => p.stock > 0 && p.stock <= 5).length}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
                  <span className="block text-[11px] font-medium text-rose-700">Habis (0)</span>
                  <span className="text-lg font-bold text-rose-800">
                    {products.filter(p => p.stock === 0).length}
                  </span>
                </div>
              </div>

              {/* Tabel Kecil / Daftar Produk Stok Menipis & Habis */}
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Daftar Perlu Perhatian:</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {products.filter(p => p.stock <= 5).length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg">
                    Semua stok barang dalam kondisi aman 🎉
                  </p>
                ) : (
                  products
                    .filter(p => p.stock <= 5)
                    .sort((a, b) => a.stock - b.stock)
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-xs">
                        <span className="font-medium text-gray-700 truncate max-w-[200px]" title={p.name}>
                          {p.name}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                          p.stock === 0 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {p.stock === 0 ? 'Habis (0)' : `Sisa ${p.stock} ${p.unit}`}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

          </div>

{/* Tabel Analisis Profitabilitas per Produk */}
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
  <div className="flex justify-between items-center">
    <div>
      <h3 className="text-base font-bold text-gray-800">📈 Analisis Profitabilitas per Produk</h3>
      <p className="text-xs text-gray-500">Mengetahui produk mana yang memberikan laba dan margin keuntungan terbesar.</p>
    </div>
  </div>
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b text-xs text-gray-500 bg-gray-50">
          <th className="p-3 font-semibold">Nama Produk</th>
          <th className="p-3 font-semibold">Terjual</th>
          <th className="p-3 font-semibold">Total Omzet</th>
          <th className="p-3 font-semibold">Total Modal (HPP)</th>
          <th className="p-3 font-semibold text-right">Laba Kotor</th>
          <th className="p-3 font-semibold text-right">Margin (%)</th>
        </tr>
      </thead>
      <tbody className="text-xs divide-y">
        {productSalesSummary.map((p) => (
          <tr key={p.id} className="hover:bg-gray-50/50">
            <td className="p-3 font-medium text-gray-800">{p.name}</td>
            <td className="p-3 text-gray-600">
              <span className={`px-2.5 py-0.5 rounded-full font-semibold ${p.qtySold > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.qtySold} {p.unit || 'pcs'}
              </span>
            </td>
            <td className="p-3 text-gray-600">Rp {p.totalRevenue.toLocaleString('id-ID')}</td>
            <td className="p-3 text-gray-500">Rp {p.totalCOGS.toLocaleString('id-ID')}</td>
            <td className="p-3 text-right font-bold text-emerald-600">
              Rp {p.grossProfit.toLocaleString('id-ID')}
            </td>
            <td className="p-3 text-right font-semibold text-gray-700">
              {p.profitMargin}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

        </div>
      )}
      {activeTab === 'reports' && (
        <div className="flex-1 p-8 max-w-6xl mx-auto w-full overflow-y-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">📜 Laporan & Riwayat Transaksi</h2>
              <p className="text-xs text-gray-500 mt-0.5">Filter transaksi berdasarkan rentang tanggal.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Tombol Ekspor Excel */}
              <button
                onClick={() => {
                  const headers = ['ID Transaksi', 'Waktu', 'Kasir', 'Metode Pembayaran', 'Total Pembayaran'];
                  const rows = filteredTransactions.map(t => [
                    `"${t.id}"`,
                    `"${new Date(t.created_at).toLocaleString('id-ID')}"`,
                    `"${t.cashier_name || 'Kasir 1'}"`,
                    `"${t.payment_method === 'Utang' ? 'Belum Lunas' : t.payment_method || 'Tunai'}"`,
                    `"${t.total_amount || 0}"`
                  ]);

                  const csvContent = [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
                  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `laporan_transaksi_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
              >
                📊 Ekspor ke Excel
              </button>

              <div className="flex items-center space-x-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500">Dari Tanggal</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-sm bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-sm bg-white text-gray-800"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="mt-4 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Omset (Periode Ini)</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Jumlah Transaksi (Periode Ini)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{totalTransactionsCount} Transaksi</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-base font-bold text-gray-800 mb-4">Daftar Struk / Transaksi ({filteredTransactions.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase">
                    <th className="py-3 px-4">ID Transaksi</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Kasir</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Total Pembayaran</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400 text-sm">
                        Tidak ada transaksi pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 truncate max-w-[120px]">#{t.id}</td>
                        <td className="py-3 px-4 text-gray-600">{new Date(t.created_at).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold">{t.cashier_name || 'Kasir 1'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${t.payment_method === 'Utang' ? 'bg-red-50 text-red-600' : t.payment_method === 'QRIS' ? 'bg-purple-50 text-purple-600' : t.payment_method === 'Transfer' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                            {t.payment_method === 'Utang' ? 'Belum Lunas' : t.payment_method || 'Tunai'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800">Rp {(t.total_amount || 0).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenReceipt(t)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow"
                          >
                            Lihat Struk
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

     {activeTab === 'voc' && (
        <div className="space-y-6 max-w-6xl mx-auto p-4">
          {/* Header & QR Code Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                💬 Voice of Customer (Kritik & Saran)
              </h2>
              <p className="text-sm text-gray-500">
                Pantau ulasan, tingkat kepuasan, dan saran langsung dari pelanggan toko Anda.
              </p>
            </div>

{/* Box QR Code untuk dipajang di kasir */}
            <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center flex flex-col items-center">
              <p className="text-xs font-bold text-gray-700 mb-2">QR Code Form Feedback Toko</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                  'https://app-kasirl.vercel.app/feedback'
                )}`}
                alt="QR Code Feedback"
                className="w-28 h-28 rounded shadow-sm border"
              />
              <span className="text-[10px] text-gray-400 mt-2">Cetak & tempel QR ini di kasir/meja</span>
            </div>
          </div>

          {/* Ringkasan Statistik Feedback */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">TOTAL MASUKAN</p>
              <p className="text-2xl font-bold text-gray-800">{feedbacks.length} Ulasan</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">RATA-RATA RATING</p>
              <p className="text-2xl font-bold text-amber-500 flex items-center gap-1">
                ⭐ {feedbacks.length > 0 
                  ? (feedbacks.reduce((a: number, b: any) => a + Number(b.rating || 0), 0) / feedbacks.length).toFixed(1) 
                  : '0.0'} / 5.0
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">KEPUASAN PELANGGAN</p>
              <p className="text-2xl font-bold text-emerald-600">
                {feedbacks.length > 0 
                  ? `${Math.round((feedbacks.filter((f: any) => Number(f.rating) >= 4).length / feedbacks.length) * 100)}%` 
                  : '0%'} Positif
              </p>
            </div>
          </div>

          {/* Daftar Feedback Pelanggan */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-gray-800 text-sm">Daftar Kritik & Saran Terbaru</h3>
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {feedbacks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada kritik & saran dari pelanggan.</p>
              ) : (
                feedbacks.map((item: any) => (
                  <div key={item.id} className="py-4 space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-800">{item.customer_name || 'Anonim'}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          {item.category || 'Umum'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex items-center text-amber-400 text-xs">
                      {'★'.repeat(Number(item.rating) || 0)}{'☆'.repeat(5 - (Number(item.rating) || 0))}
                      <span className="ml-2 text-gray-600 text-xs">({item.rating}/5)</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      "{item.message}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )} 

      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">⚙️ Pengaturan Profil Toko</h2>
            <p className="text-xs text-gray-500">
              Informasi ini akan otomatis tercetak pada struk pembayaran pelanggan.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Toko</label>
              <input
                type="text"
                value={storeProfile.store_name || ''}
                onChange={(e) => setStoreProfile({ ...storeProfile, store_name: e.target.value })}
                placeholder="Contoh: Toko Barokah Jaya"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Toko</label>
              <textarea
                value={storeProfile.address || ''}
                onChange={(e) => setStoreProfile({ ...storeProfile, address: e.target.value })}
                placeholder="Contoh: Jl. Merdeka No. 45, Jakarta"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">No. Telepon / WhatsApp</label>
              <input
                type="text"
                value={storeProfile.phone || ''}
                onChange={(e) => setStoreProfile({ ...storeProfile, phone: e.target.value })}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow transition-colors"
            >
              💾 Simpan Perubahan Profil
            </button>
          </form>
        </div>
      )}
      {activeTab === 'debts' && (
        <div className="flex-1 p-8 max-w-6xl mx-auto w-full overflow-y-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">📒 Manajemen Utang Piutang (Kasbon)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Kelola daftar catatan kasbon pelanggan dan pelunasannya.</p>
            </div>
            
            <input
              type="text"
              placeholder="🔍 Cari nama / no hp pelanggan..."
              value={debtSearchTerm}
              onChange={(e) => setDebtSearchTerm(e.target.value)}
              className="px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm w-64 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Total Sisa Piutang (Belum Lunas)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">Rp {totalUnpaidDebt.toLocaleString('id-ID')}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border shadow-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold">Jumlah Transaksi Utang</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{debts.length} Catatan</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-base font-bold text-gray-800 mb-4">Daftar Utang Pelanggan ({filteredDebts.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase">
                    <th className="py-3 px-4">Nama Pelanggan</th>
                    <th className="py-3 px-4">No. HP / Catatan</th>
                    <th className="py-3 px-4">Total Utang</th>
                    <th className="py-3 px-4">Sudah Dibayar</th>
                    <th className="py-3 px-4">Sisa Utang</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700">
                  {filteredDebts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">
                        Belum ada catatan utang piutang.
                      </td>
                    </tr>
                  ) : (
                    filteredDebts.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-bold text-gray-800">{d.customer_name}</td>
                        <td className="py-3 px-4 text-gray-600">{d.customer_phone || '-'}</td>
                        <td className="py-3 px-4 font-semibold text-gray-700">Rp {d.total_amount.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 text-green-600 font-semibold">Rp {d.paid_amount.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4 font-bold text-red-600">Rp {d.remaining_amount.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${d.status === 'Lunas' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center space-x-2">
                          {d.status === 'Belum Lunas' && (
                            <button
onClick={() => handleOpenPayModal(d)}
    className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold shadow transition"
  >
    Bayar
  </button>
)}
                          <button
                            onClick={() => handleDeleteDebt(d.id, d.customer_name)}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold shadow transition"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'promos' && (
        <div className="flex-1 p-8 max-w-6xl mx-auto w-full overflow-y-auto space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-1">🎁 Manajemen Diskon & Promo</h2>
            <p className="text-xs text-gray-500 mb-4">Daftarkan promo baru dan aktifkan atau nonaktifkan dengan mudah.</p>

            <form onSubmit={handleSavePromo} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Promo / Diskon</label>
                <input
                  type="text"
                  placeholder="Contoh: Diskon Kemerdekaan"
                  value={newPromoName}
                  onChange={(e) => setNewPromoName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Jenis Diskon</label>
                <select
                  value={newDiscountType}
                  onChange={(e) => setNewDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800"
                >
                  <option value="percentage">Persentase (%)</option>
                  <option value="fixed">Nominal Tetap (Rp)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nilai Diskon (Angka)</label>
                <input
                  type="number"
                  placeholder="Contoh: 10 (untuk 10%) atau 5000"
                  value={newDiscountValue}
                  onChange={(e) => setNewDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Target Produk</label>
                <select
                  value={newTargetType}
                  onChange={(e) => setNewTargetType(e.target.value as 'all' | 'specific')}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800"
                >
                  <option value="all">Semua Produk</option>
                  <option value="specific">Produk Tertentu (Bisa &gt;1)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Metode Pembayaran</label>
                <select
                  value={newPromoPaymentMethod}
                  onChange={(e) => setNewPromoPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800"
                >
                  <option value="all">Semua Metode Pembayaran</option>
                  <option value="Tunai">Hanya Tunai</option>
                  <option value="QRIS">Hanya QRIS</option>
                  <option value="Transfer">Hanya Transfer</option>
                  <option value="Utang">Hanya Utang</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Kode Promo (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: HEMAT5RB"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 uppercase font-mono"
                />
              </div>

              {newTargetType === 'specific' && (
                <div className="md:col-span-3 bg-blue-50/60 p-4 rounded-xl border border-blue-200">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-blue-900">
                      Pilih Produk Terdaftar ({newPromoProductIds.length} Produk Dipilih):
                    </label>
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => setNewPromoProductIds(products.map((p) => p.id))}
                        className="text-[11px] text-blue-600 font-semibold hover:underline"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => setNewPromoProductIds([])}
                        className="text-[11px] text-red-500 font-semibold hover:underline"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border">
                    {products.map((p) => {
                      const isSelected = newPromoProductIds.includes(p.id)
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 font-bold text-blue-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleProductSelectionToggle(p.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow"
                >
                  {loading ? 'Menyimpan...' : 'Daftarkan Promo Baru'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-base font-bold text-gray-800 mb-4">Daftar Promo Terdaftar ({promos.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase">
                    <th className="py-3 px-4">Nama Promo</th>
                    <th className="py-3 px-4">Diskon</th>
                    <th className="py-3 px-4">Target Produk</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Kode Promo</th>
                    <th className="py-3 px-4 text-center">Status Aktif</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700">
                  {promos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-400">Belum ada promo yang didaftarkan.</td>
                    </tr>
                  ) : (
                    promos.map((promo) => {
                      const matchedProductNames = products
                        .filter((p) => promo.product_ids?.includes(p.id))
                        .map((p) => p.name)

                      return (
                        <tr key={promo.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-bold text-gray-800">{promo.name}</td>
                          <td className="py-3 px-4 font-semibold text-blue-600">
                            {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `Rp ${promo.discount_value.toLocaleString('id-ID')}`}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            {promo.target_type === 'all' ? (
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold">Semua Produk</span>
                            ) : (
                              <div>
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold block w-max mb-1">
                                  {matchedProductNames.length} Produk Pilihan
                                </span>
                                <p className="text-[10px] text-gray-500 line-clamp-1">
                                  {matchedProductNames.join(', ')}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold">{promo.payment_method}</td>
                          <td className="py-3 px-4 font-mono text-xs font-bold text-purple-600">{promo.promo_code || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleTogglePromoStatus(promo.id, promo.is_active)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                                promo.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              }`}
                            >
                              {promo.is_active ? 'Aktif' : 'Non-Aktif'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeletePromo(promo.id, promo.name)}
                              className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold shadow"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'pos' && (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-3/5 p-6 flex flex-col border-r border-gray-200">
            <form onSubmit={handleBarcodeSubmit} className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center space-x-2">
              <span className="text-sm font-bold text-blue-600 whitespace-nowrap">📷 Scan Barcode:</span>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Arahkan scanner atau ketik barcode/SKU lalu Enter..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm font-mono"
              />
            </form>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
              <div className="flex items-center space-x-3 overflow-x-auto max-w-full pb-1 sm:pb-0">
                <h2 className="text-base font-bold text-gray-800 whitespace-nowrap">
                  Katalog Produk <span className="text-xs font-normal text-gray-500">({filteredProducts.length})</span>
                </h2>
                
<div className="flex space-x-1 border-l pl-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Semua')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === 'Semua'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Semua
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                        selectedCategory === cat.name
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="🔍 Ketik nama/SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm w-full sm:w-48 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 overflow-y-auto flex-1 pr-2">
              {filteredProducts.length === 0 ? (
                <div className="col-span-3 text-center py-10 text-gray-400 text-sm">
                  Produk tidak ditemukan dalam pencarian.
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const displayPrice = product.sell_price ?? product.price ?? 0
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-3 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition text-left flex flex-col justify-between border border-gray-200 cursor-pointer active:scale-95"
                    >
                      <div>
{product.image_url ? (
  <div className="w-full h-40 bg-gray-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
<img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
  </div>
) : (
  <div className="w-full h-40 bg-gray-50 rounded-lg mb-2 flex items-center justify-center">
    📷 Tanpa Foto
  </div>
)}
                        <p className="font-semibold text-gray-800 text-xs line-clamp-2">{product.name}</p>
                        {product.sku && <p className="text-[10px] text-blue-500 font-mono mt-0.5">SKU: {product.sku}</p>}
                        {product.barcode && <p className="text-[10px] text-gray-400 font-mono">BC: {product.barcode}</p>}
                        <p className={`text-[11px] mt-1 ${product.stock > 0 ? 'text-gray-500' : 'text-red-500 font-bold'}`}>
                          Stok: {product.stock} {product.unit || 'pcs'}
                        </p>
                      </div>
                      <p className="text-blue-600 font-bold mt-3 text-xs">
                        Rp {displayPrice.toLocaleString('id-ID')}
                      </p>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="w-2/5 p-6 bg-white flex flex-col justify-between shadow-sm overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-3 pb-2 border-b">
                <h2 className="text-lg font-bold text-gray-800">Keranjang Belanja</h2>
                <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-1 rounded">
                  {cart.length} Item
                </span>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 mb-3">
                {cart.length === 0 ? (
                  <p className="text-gray-400 text-center text-sm mt-8">Belum ada barang di keranjang</p>
                ) : (
                  cart.map((item) => {
                    const subtotalItem = item.price * item.quantity
                    return (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200 gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-xs">{item.name}</p>
                          <p className="text-[10px] text-gray-500">
                            Rp {item.price.toLocaleString('id-ID')} / {item.unit || 'pcs'}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
                          <button
                            type="button"
                            onClick={() => decrementQty(item.id)}
                            className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded flex items-center justify-center text-sm transition"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            className="w-10 text-center text-xs font-bold text-gray-800 focus:outline-none bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => incrementQty(item.id)}
                            className="w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded flex items-center justify-center text-sm transition"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right w-20">
                          <p className="text-xs font-bold text-blue-600">Rp {subtotalItem.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <div>
                <input
                  type="text"
                  placeholder="🎟️ Kode Promo (Opsional)"
                  value={appliedPromoCode}
                  onChange={(e) => setAppliedPromoCode(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm bg-gray-50 text-gray-800 uppercase font-mono"
                />
              </div>

              <div className="bg-gray-50 p-2.5 rounded-xl border space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>Rp {calculation.subtotal.toLocaleString('id-ID')}</span>
                </div>
                {calculation.discount > 0 && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Diskon / Promo:</span>
                    <span>- Rp {calculation.discount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-800 pt-1 border-t">
                  <span>Total Tagihan:</span>
                  <span className="text-blue-600">Rp {calculation.totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Metode Pembayaran</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Tunai', 'QRIS', 'Transfer', 'Utang'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                        paymentMethod === method
                          ? 'bg-blue-600 text-white border-blue-600 shadow'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'Tunai' ? (
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 space-y-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-800">Uang Tunai (Rp)</label>
                    <div className="relative flex items-center mt-0.5">
                      <span className="absolute left-3 text-xs font-bold text-gray-500">Rp</span>
                      <input
                        type="text"
                        placeholder="0"
                        value={cashPaid}
                        onChange={handleCashPaidChange}
                        className="w-full pl-9 pr-3 py-1 border rounded-lg text-xs bg-white text-gray-800 font-bold focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-blue-200">
                    <span className="font-semibold text-gray-600">Kembalian:</span>
                    <span className={`font-bold ${changeAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {cashPaid === '' ? 'Rp 0' : changeAmount >= 0 ? `Rp ${changeAmount.toLocaleString('id-ID')}` : 'Uang Kurang!'}
                    </span>
                  </div>
                </div>
              ) : paymentMethod === 'Utang' ? (
                <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 space-y-2 text-xs">
                  <p className="font-bold text-red-700">Form Catat Kasbon / Utang Pelanggan</p>
                  <div>
                    <input
                      type="text"
                      placeholder="Nama Pelanggan (*Wajib)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-white text-gray-800 font-semibold focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="No. HP / Catatan Pelanggan (Opsional)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-1.5 border rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                  <p className="text-xs font-bold text-purple-700">Pembayaran Non-Tunai ({paymentMethod})</p>
                  <p className="text-[11px] text-purple-500 mt-0.5">Silakan scan QRIS / verifikasi transfer sejumlah total tagihan.</p>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading || cart.length === 0 || (paymentMethod === 'Tunai' && numericCashPaid < calculation.totalAmount) || (paymentMethod === 'Utang' && !customerName.trim())}
                className={`w-full py-2.5 rounded-xl font-bold text-white text-sm transition ${
                  loading || cart.length === 0 || (paymentMethod === 'Tunai' && numericCashPaid < calculation.totalAmount) || (paymentMethod === 'Utang' && !customerName.trim())
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                }`}
              >
                {loading ? 'Memproses...' : `Bayar via ${paymentMethod}`}
              </button>
            </div>
          </div>
        </div>
        )}
{activeTab === 'products' && (
        <div className="flex-1 p-8 max-w-5xl mx-auto w-full overflow-y-auto space-y-6">
          
          {/* HEADER & TOMBOL IMPOR / EKSPOR PRODUK */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">📦 Kelola Produk & Stok</h2>
              <p className="text-xs text-gray-500 mt-0.5">Tambah produk baru, impor massal, ekspor, atau sesuaikan stok produk.</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Tombol Ekspor Produk */}
              <button
                onClick={() => {
                  const headers = ['Nama Produk', 'Barcode', 'SKU', 'Kategori', 'Harga Beli', 'Harga Jual', 'Satuan', 'Stok'];
                  const rows = products.map(p => [
                    `"${p.name || ''}"`,
                    `"${p.barcode || ''}"`,
                    `"${p.sku || ''}"`,
                    `"${p.category || ''}"`,
                    `"${p.buy_price || 0}"`,
                    `"${p.sell_price || p.price || 0}"`,
                    `"${p.unit || 'pcs'}"`,
                    `"${p.stock || 0}"`
                  ]);
                  const csvContent = [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
                  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `data_produk_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1"
              >
                📤 Ekspor Produk
              </button>

              {/* Tombol Impor Produk */}
<label className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer flex items-center gap-1">
                📥 Impor Produk (CSV)
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const buffer = event.target?.result;
                      if (!buffer) return;

                      // Memaksa pembacaan menggunakan standar UTF-8 yang bersih
                      const decoder = new TextDecoder('utf-8');
                      const text = decoder.decode(buffer as ArrayBuffer);
                      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');

                      const { data: existingProducts } = await supabase.from('products').select('sku, barcode');
                      const existingSkus = new Set(existingProducts?.map(p => p.sku).filter(Boolean));
                      const existingBarcodes = new Set(existingProducts?.map(p => p.barcode).filter(Boolean));

                      let importedCount = 0;
                      let duplicateCount = 0;
                      
                      const fileSkusSeen = new Set();
                      const fileBarcodesSeen = new Set();

                      for (let i = 1; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (!line) continue;

                        const delimiter = line.includes(';') ? ';' : ',';
                        const cols = line.split(delimiter).map(c => c.replace(/^"|"\$/g, '').trim());

                        if (cols.length >= 1 && cols[0]) {
                          const [name, barcode, sku, category, buy_price, sell_price, unit, stock] = cols;
                          
                          const cleanSku = sku && sku !== '' ? sku.trim() : null;
                          const cleanBarcode = barcode && barcode !== '' ? barcode.trim() : null;

                          if (cleanSku && (fileSkusSeen.has(cleanSku) || existingSkus.has(cleanSku))) {
                            duplicateCount++;
                            continue;
                          }
                          if (cleanBarcode && cleanBarcode !== '' && (fileBarcodesSeen.has(cleanBarcode) || existingBarcodes.has(cleanBarcode))) {
                            duplicateCount++;
                            continue;
                          }

                          if (cleanSku) fileSkusSeen.add(cleanSku);
                          if (cleanBarcode && cleanBarcode !== '') fileBarcodesSeen.add(cleanBarcode);

                          await supabase.from('products').insert([{
                            name: name || 'Produk Tanpa Nama',
                            barcode: cleanBarcode || null,
                            sku: cleanSku || null,
                            category: category || 'Umum',
                            buy_price: parseFloat(buy_price) || 0,
                            sell_price: parseFloat(sell_price) || 0,
                            unit: unit || 'pcs',
                            stock: parseInt(stock) || 0
                          }]);
                          importedCount++;
                        }
                      }
                      
                      alert(`Impor Selesai!\n- Berhasil ditambah: ${importedCount} produk\n- Duplikat diabaikan: ${duplicateCount} produk\nHalaman akan dimuat ulang.`);
                      window.location.reload();
                    };
                    reader.readAsArrayBuffer(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="bg-indigo-50 p-6 rounded-xl shadow border border-indigo-200 mb-6">
            <h2 className="text-lg font-bold text-indigo-900 mb-1">📦 Scan Barcode untuk Penyesuaian Stok (Tambah / Kurang)</h2>
            <p className="text-xs text-indigo-700 mb-3">Arahkan scanner ke produk untuk menambah stok masuk atau mengurangi stok (koreksi/rusak).</p>
            
            <form onSubmit={handleRestockBarcodeSubmit} className="flex space-x-2 mb-4">
              <input
                ref={stockBarcodeInputRef}
                type="text"
                placeholder="Scan atau ketik barcode/SKU produk lalu Enter..."
                value={restockInputBarcode}
                onChange={(e) => setRestockInputBarcode(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm whitespace-nowrap shadow"
              >
                Cari Barcode
              </button>
            </form>

            {scannedRestockProduct && (
              <div className="bg-white p-4 rounded-lg border border-indigo-300 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm gap-4">
                <div>
                  <p className="text-xs text-gray-500">Produk Ditemukan:</p>
                  <p className="font-bold text-gray-800 text-base">{scannedRestockProduct.name}</p>
                  <p className="text-xs text-blue-600 font-semibold">Stok Saat Ini: {scannedRestockProduct.stock} {scannedRestockProduct.unit || 'pcs'}</p>
                </div>
                <form onSubmit={handleUpdateStockOnly} className="flex items-center space-x-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Aksi</label>
                    <select
                      value={restockType}
                      onChange={(e) => setRestockType(e.target.value as 'add' | 'reduce')}
                      className="px-2 py-1.5 border rounded-lg text-xs bg-white text-gray-800 font-bold"
                    >
                      <option value="add">Tambah (+)</option>
                      <option value="reduce">Kurang (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Jumlah (Bulat)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      placeholder="Contoh: 2"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      className="w-24 px-3 py-1.5 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 font-bold"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setScannedRestockProduct(null); setRestockQty(''); }}
                    className="mt-4 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg text-sm"
                  >
                    Batal
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId !== null ? '✏️ Edit Produk' : '➕ Tambah Produk Baru'}
              </h2>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded font-semibold"
                >
                  Batal Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Produk</label>
                <input
                  type="text"
                  placeholder="Contoh: Beras Premium 5kg"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Barcode (Scan / Ketik)</label>
                <input
                  type="text"
                  placeholder="Contoh: 8996001234567"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Kode SKU (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: BR-001"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Kategori</label>
                <div className="flex space-x-1">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCategoryPrompt}
                    className="px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                    title="Tambah Kategori Baru"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCategory}
                    className="px-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold"
                    title="Hapus Kategori yang Dipilih"
                  >
                    🗑
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Harga Beli (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 60000"
                  value={newBuyPrice}
                  onChange={(e) => setNewBuyPrice(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  placeholder="Contoh: 68000"
                  value={newSellPrice}
                  onChange={(e) => setNewSellPrice(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Satuan</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="kg">kg</option>
                  <option value="pcs">pcs</option>
                  <option value="gram">gram</option>
                  <option value="box">box</option>
                  <option value="dus">dus</option>
                  <option value="pack">pack</option>
                </select>
              </div>
              {editingId === null && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Stok Awal (Bulat)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Contoh: 20"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-gray-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Foto Produk (Kamera / Galeri)</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-lg text-sm bg-blue-50 text-blue-700 border-blue-300 font-semibold cursor-pointer hover:bg-blue-100 transition shadow-sm">
                    <span>📷 Ambil Foto (Kamera)</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <label 
                    title="Pilih dari Galeri / Folder"
                    className="flex items-center justify-center px-4 py-2 border rounded-lg bg-gray-50 text-gray-700 border-gray-300 cursor-pointer hover:bg-gray-100 transition shadow-sm"
                  >
                    <span className="text-lg">📁</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {newImageUrl && (
                  <div className="mt-2 flex items-center space-x-3 bg-gray-50 p-2 rounded-lg border w-max">
                    <img src={newImageUrl} alt="Pratinjau" className="w-12 h-12 object-cover rounded border" />
                    <div className="text-xs">
                      <p className="font-semibold text-green-600">✔ Foto siap disimpan</p>
                      <button
                        type="button"
                        onClick={() => setNewImageUrl('')}
                        className="text-red-500 hover:underline text-[11px]"
                      >
                        Hapus / Ganti Foto
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="md:col-span-3 flex justify-end space-x-2 mt-2">
                {editingId !== null && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold rounded-lg text-sm transition"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow transition"
                >
                  {loading ? 'Menyimpan...' : editingId !== null ? 'Perbarui Produk' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>

<div className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Daftar Produk Terdaftar ({filteredTableProducts.length})</h2>
              <input
                type="text"
                placeholder="🔍 Cari produk..."
                value={tableSearchTerm}
                onChange={(e) => setTableSearchTerm(e.target.value)}
                className="px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 text-sm w-60 shadow-sm"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
<tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase">
      <th className="py-3 px-4">Foto</th>
      <th className="py-3 px-4">SKU / Barcode / Nama</th>
      <th className="py-3 px-4">Kategori</th>
      
      {/* Kolom Harga Beli - Hanya Owner */}
      {userRole === 'owner' && <th className="py-3 px-4">Harga Beli</th>}
      
      <th className="py-3 px-4">Harga Jual</th>
      <th className="py-3 px-4">Stok</th>
      
      {/* Kolom Aksi Edit/Hapus - Hanya Owner */}
      {userRole === 'owner' && <th className="py-3 px-4 text-center">Aksi</th>}
    </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700">
                  {filteredTableProducts.length === 0 ? (
                    <tr>
                      <td colSpan={userRole === 'owner' ? 7 : 6} className="text-center py-6 text-gray-400 text-sm">
                        Tidak ada produk ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredTableProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-md border" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-md border flex items-center justify-center text-[9px] text-gray-400">
                              No Pic
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-800">{p.name}</p>
                          <div className="flex space-x-2 text-xs">
                            {p.sku && <span className="text-blue-500 font-mono">SKU: {p.sku}</span>}
                            {p.barcode && <span className="text-gray-400 font-mono">BC: {p.barcode}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-600">
                          <span className="bg-gray-100 px-2 py-1 rounded">{p.category || 'Umum'}</span>
                        </td>

                        {userRole === 'owner' && (
                          <>
                            <td className="py-3 px-4 text-gray-500">
                              Rp {(p.buy_price ?? 0).toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-4 text-blue-600 font-semibold">
                              Rp {(p.sell_price ?? p.price ?? 0).toLocaleString('id-ID')}
                            </td>
                          </>
                        )}

                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => handleQuickStockUpdate(p.id, p.stock, -1)}
                              disabled={p.stock <= 0}
                              className="w-6 h-6 flex items-center justify-center bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 rounded font-bold text-xs shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Kurangi 1 Stok"
                            >
                              -
                            </button>
                            <span className={`px-2 font-bold text-xs ${
                              p.stock === 0
                                ? 'text-rose-600'
                                : p.stock <= 5
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}>
                              {p.stock} <span className="text-[10px] font-normal text-gray-500">{p.unit || 'pcs'}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickStockUpdate(p.id, p.stock, 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white hover:bg-emerald-50 text-emerald-600 border border-gray-200 rounded font-bold text-xs shadow-sm transition-colors"
                              title="Tambah 1 Stok"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {userRole === 'owner' && (
                          <td className="py-3 px-4 text-center space-x-2">
                            <button
                              onClick={() => handleEditClick(p)}
                              className="px-2.5 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-semibold shadow"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(p.id, p.name)}
                              className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold shadow"
                            >
                              Hapus
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-xl space-y-4 font-mono">
            
{/* HEADER TOKO PADA STRUK */}
<div className="text-center border-b border-dashed pb-3">
  <h3 className="font-bold text-base text-gray-900 uppercase">
    {storeProfile.store_name || 'POS SaaS Toko'}
  </h3>
  <p className="text-[11px] text-gray-500 mt-0.5">
    {storeProfile.address || '-'}
  </p>
  <p className="text-[11px] text-gray-500">
    Telp/WA: {storeProfile.phone || '-'}
  </p>
</div>
            
            <div className="space-y-1 text-xs text-gray-600 border-b border-dashed pb-3">
              <p><span className="font-semibold">ID Transaksi:</span> #{selectedTransaction.id}</p>
              <p><span className="font-semibold">Waktu:</span> {new Date(selectedTransaction.created_at).toLocaleString('id-ID')}</p>
              <p><span className="font-semibold">Kasir:</span> {selectedTransaction.cashier_name || 'Kasir 1'}</p>
              <p>
                <span className="font-semibold">Metode Pembayaran:</span>{' '}
                <span className="font-bold text-blue-600">
                  {selectedTransaction.payment_method === 'Utang' ? 'Belum Lunas' : selectedTransaction.payment_method || 'Tunai'}
                </span>
              </p>
            </div>

            <div className="border-b border-dashed py-3 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-gray-500 uppercase">Daftar Belanja:</p>
              {transactionItems.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Memuat rincian item...</p>
              ) : (
                transactionItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-medium text-gray-800">{item.product_name}</p>
                      <p className="text-gray-400">Rp {item.price.toLocaleString('id-ID')} x {item.qty}</p>
                    </div>
                    <p className="font-bold text-gray-800">Rp {(item.price * item.qty).toLocaleString('id-ID')}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between font-bold text-sm text-gray-800 pt-1">
              <span>Total Pembayaran:</span>
              <span className="text-blue-600">Rp {(selectedTransaction.total_amount || 0).toLocaleString('id-ID')}</span>
            </div>

            {/* FOOTER / UCAPAN TERIMA KASIH */}
            <div className="text-center pt-3 border-t border-dashed text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">*** Terima Kasih ***</p>
              <p className="text-[11px]">Silakan Datang Kembali!</p>
              <p className="text-[10px] text-gray-400 mt-2">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow font-sans"
              >
                Cetak Struk
              </button>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs font-sans"
              >
                Tidak Cetak / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isPayModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Form Pembayaran Utang</h3>
            <p className="text-xs text-gray-600 mb-4">
              Pelanggan: <span className="font-semibold">{selectedDebt?.customer_name}</span> <br />
              Sisa Utang: <span className="text-red-600 font-semibold">Rp {selectedDebt?.remaining_amount.toLocaleString('id-ID')}</span>
            </p>

            <label className="block text-xs font-semibold text-gray-600 mb-1">Nominal Pembayaran</label>
            <div className="flex items-center border rounded-lg px-3 py-2 bg-white mb-4 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
              <span className="text-gray-500 font-semibold mr-2">Rp</span>
              <input
                type="text"
                value={paymentInput}
                onChange={handlePaymentChange}
                placeholder="0"
                className="w-full outline-none text-gray-800 text-sm"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitPayment}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Konfirmasi
              </button>
            </div>
          </div>
</div>
      )}
    </main>
  );
}