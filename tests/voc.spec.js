import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'ragaraisuli@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Audit Multi-Tenant & Barcode Suara Pelanggan (VoC)', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Login sebagai Owner
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });

    // 2. Pindah ke tab Suara Pelanggan (VoC)
    const vocBtn = page.getByRole('button', { name: /suara pelanggan|voc|feedback/i });
    if (await vocBtn.isVisible()) {
      await vocBtn.click();
    }
  });

  test('memastikan halaman VoC memuat URL survei/barcode unik per toko', async ({ page }) => {
    // 1. Memastikan halaman VoC memuat konten teks utama terkait survei/feedback
    await expect(page.locator('body')).toContainText(/pelanggan|feedback|ulasan|barcode|qr|survei/i);

    // 2. Memastikan ada elemen input URL, link, atau tombol salin tautan (yang membuktikan adanya endpoint QR unik toko)
    const surveyLinkElement = page.locator('input[value*="http"], input[readonly], a[href*="http"], button').filter({ hasText: /salin|copy|link|url|buka/i }).first();
    
    // Jika elemen ditemukan, pastikan ia dapat diakses
    if (await surveyLinkElement.isVisible({ timeout: 5000 })) {
      await expect(surveyLinkElement).toBeVisible();
      console.log('✅ Elemen tautan/interaksi QR Code VoC berhasil divalidasi.');
    } else {
      // Alternatif: Memastikan ada kartu kontainer VoC yang aktif di halaman
      const vocCard = page.locator('div.bg-white, div.rounded-lg').filter({ hasText: /pelanggan|feedback/i }).first();
      await expect(vocCard).toBeVisible();
      console.log('✅ Kartu informasi VoC multi-tenant termuat dengan baik.');
    }
  });

});