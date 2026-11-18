import { test, expect } from '@playwright/test';

// Kredensial akun Owner yang baru
const OWNER_EMAIL = 'ragaraisuli@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Audit Keamanan & Hak Akses (RBAC)', () => {

  test('mengarahkan ke /login jika belum terautentikasi', async ({ page }) => {
    // Hapus sesi atau localStorage
    await page.context().clearCookies();
    await page.goto('/');

    // Harus otomatis diredirect ke halaman login
    await expect(page).toHaveURL(/login/);
  });

  test('owner dapat mengakses menu eksklusif (Beranda, Promo, Profil)', async ({ page }) => {
    // 1. Login sebagai Owner
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    // Tunggu sampai masuk ke halaman utama (/)
    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });

    // 2. Pastikan tombol/menu khusus Owner muncul
    await expect(page.getByRole('button', { name: /^beranda$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /diskon & promo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /profil toko/i })).toBeVisible();
  });

});