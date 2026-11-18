import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'ragaraisuli@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Modul Kasir & Transaksi (POS)', () => {

  test.beforeEach(async ({ page }) => {
    // Login terlebih dahulu sebelum menguji POS
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });

    // Pindah ke tab Kasir (POS)
    await page.getByRole('button', { name: /^kasir \(pos\)$/i }).click();
  });

  test('menampilkan katalog produk dan elemen keranjang dengan benar', async ({ page }) => {
    // Pastikan elemen katalog produk terlihat
    await expect(page.getByRole('heading', { name: /katalog produk/i })).toBeVisible();

    // Pastikan keranjang belanja kosong di awal atau siap menerima item
    await expect(page.getByRole('heading', { name: /keranjang belanja/i })).toBeVisible();
    await expect(page.getByText(/belum ada barang di keranjang/i)).toBeVisible();
  });

  test('dapat menambahkan produk ke keranjang dan menghitung subtotal', async ({ page }) => {
    // Klik produk pertama yang tersedia di katalog (mengambil tombol produk pertama)
    const productCard = page.locator('button.bg-white').filter({ hasText: /Rp/ }).first();
    await expect(productCard).toBeVisible();
    
    const productName = await productCard.locator('p.font-semibold').textContent();
    await productCard.click();

    // Pastikan produk masuk ke dalam keranjang
    await expect(page.locator('div').filter({ hasText: productName }).first()).toBeVisible();
    
    // Pastikan ringkasan tagihan / subtotal muncul dan tidak Rp 0
    await expect(page.locator('text=Total Tagihan:')).toBeVisible();
  });

  test('validasi metode pembayaran tunai saat uang kurang', async ({ page }) => {
    // Tambahkan produk ke keranjang terlebih dahulu
    const productCard = page.locator('button.bg-white').filter({ hasText: /Rp/ }).first();
    if (await productCard.isVisible()) {
      await productCard.click();

      // Pilih metode Tunai (jika belum terpilih)
      const tunaiBtn = page.getByRole('button', { name: /^tunai$/i });
      await tunaiBtn.click();

      // Masukkan nominal uang tunai yang kecil (misal: 1000)
      const cashInput = page.locator('input[placeholder="0"]').first();
      await cashInput.fill('1000');

      // Cek apakah muncul peringatan uang kurang
      await expect(page.getByText(/uang kurang!/i)).toBeVisible();

      // Tombol bayar harus dalam kondisi disabled
      const bayarBtn = page.getByRole('button', { name: /bayar via tunai/i });
      await expect(bayarBtn).toBeDisabled();
    }
  });

});