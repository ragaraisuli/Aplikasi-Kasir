import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'ragaraisuli@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Modul Beranda & Analisis Toko', () => {

  test.beforeEach(async ({ page }) => {
    // Login sebagai Owner
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });

    // Pastikan berada di tab Beranda
    const berandaBtn = page.getByRole('button', { name: /^beranda$/i });
    if (await berandaBtn.isVisible()) {
      await berandaBtn.click();
    }
  });

  test('menampilkan ringkasan statistik dan kartu metrik keuangan', async ({ page }) => {
    // Memastikan judul atau elemen ringkasan toko tampil
    await expect(page.getByRole('heading', { name: /ringkasan toko & penjualan/i })).toBeVisible();

    // Memastikan kartu-kartu statistik utama muncul (menggunakan exact: true untuk teks yang ambigu)
    await expect(page.locator('text=Total Pendapatan (Bruto)')).toBeVisible();
    await expect(page.locator('text=Pendapatan Bersih (Netto)')).toBeVisible();
    await expect(page.getByText('Total Transaksi', { exact: true })).toBeVisible();
    await expect(page.locator('text=Valuasi Aset Stok')).toBeVisible();
  });

  test('memiliki tombol ekspor excel (CSV)', async ({ page }) => {
    // Memastikan tombol ekspor laporan tersedia untuk owner
    const exportBtn = page.getByRole('button', { name: /ekspor excel \(csv\)/i });
    await expect(exportBtn).toBeVisible();
  });

  test('menampilkan bagian analisis profitabilitas dan tren bulanan', async ({ page }) => {
    // Memastikan tabel analisis profitabilitas dan tren produk bulanan termuat
    await expect(page.getByRole('heading', { name: /analisis profitabilitas/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /tren penjualan produk bulanan/i })).toBeVisible();
  });

});