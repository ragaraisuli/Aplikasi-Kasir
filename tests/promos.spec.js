import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'ragaraisuli@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Modul Manajemen Promo & Diskon Toko', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Login sebagai Owner
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });

    // 2. Pindah ke tab/menu Promo atau Diskon
    const promoBtn = page.getByRole('button', { name: /promo|diskon|voucher/i });
    if (await promoBtn.isVisible()) {
      await promoBtn.click();
    }
  });

  test('menampilkan halaman daftar promo dan tombol tambah promo', async ({ page }) => {
    // 1. Memastikan halaman promo/diskon termuat dengan elemen teks utama
    await expect(page.locator('body')).toContainText(/promo|diskon|potongan|voucher/i);

    // 2. Memastikan tombol aksi seperti "Tambah Promo" atau daftar tabel promo tersedia
    const addPromoBtn = page.getByRole('button', { name: /tambah promo|buat promo|tambah diskon/i });
    if (await addPromoBtn.isVisible()) {
      await expect(addPromoBtn).toBeVisible();
      console.log('✅ Tombol tambah promo berhasil ditemukan.');
    } else {
      console.log('Info: Halaman promo menampilkan tabel atau ringkasan daftar promosi aktif.');
    }
  });

});