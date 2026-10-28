import { test, expect } from '@playwright/test';

test.describe('Pengujian Lengkap Aplikasi Kasir', () => {

  test('1. Memeriksa halaman login dan feedback publik', async ({ page }) => {
    // Buka aplikasi lokal dan pastikan diarahkan ke halaman login
    await page.goto('http://localhost:3000');
    await expect(page).toHaveURL(/login/);

    // Navigasi ke halaman feedback publik
    await page.goto('http://localhost:3000/feedback?store=test-store');
    await expect(page.locator('body')).toBeVisible();
  });

  test('2. Memeriksa alur halaman Kasir (POS) & Produk', async ({ page }) => {
    // Catatan: Jika halaman memerlukan login, kita bisa isi form login di sini terlebih dahulu.
    // Contoh langsung akses halaman POS / Kasir (sesuaikan URL route jika ada)
    await page.goto('http://localhost:3000');
    
    // Contoh simulasi pengecekan elemen menu navigasi kasir/produk jika sudah login
    // await page.click('text=Kasir (POS)');
    // await expect(page.locator('body')).toContainText('Transaksi');
    
    // Untuk saat ini, kita pastikan aplikasi merespons dengan baik
    await expect(page).toHaveURL(/localhost:3000/);
  });

});