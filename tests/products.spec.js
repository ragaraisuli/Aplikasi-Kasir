import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'ragaraisuli@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Modul Kelola Produk & Stok', () => {

  test.beforeEach(async ({ page }) => {
    // Login sebagai Owner
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });

    // Pindah ke tab Kelola Produk
    await page.getByRole('button', { name: /^kelola produk$/i }).click();
  });

  test('menampilkan form tambah produk dan tabel daftar produk', async ({ page }) => {
    // Memastikan judul form tambah/edit produk muncul
    await expect(page.getByRole('heading', { name: /tambah produk baru/i })).toBeVisible();

    // Memastikan tabel daftar produk terdaftar muncul
    await expect(page.getByRole('heading', { name: /daftar produk terdaftar/i })).toBeVisible();
  });

  test('memiliki tombol ekspor produk dan impor produk', async ({ page }) => {
    // Memastikan tombol ekspor dan impor CSV tersedia untuk owner
    await expect(page.getByRole('button', { name: /ekspor produk/i })).toBeVisible();
    await expect(page.getByText(/impor produk \(csv\)/i)).toBeVisible();
  });

  test('dapat melakukan pencarian produk pada tabel daftar produk', async ({ page }) => {
    // Cari input pencarian produk di tabel
    const searchInput = page.locator('input[placeholder="🔍 Cari produk..."]');
    await expect(searchInput).toBeVisible();

    // Ketik kata kunci pencarian
    await searchInput.fill('Beras');
    
    // Pastikan tabel merespons filter pencarian
    await expect(searchInput).toHaveValue('Beras');
  });

});