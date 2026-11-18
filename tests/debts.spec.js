import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'ragaraisuli@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Modul Utang Piutang (Kasbon)', () => {

  test.beforeEach(async ({ page }) => {
    // Login sebagai Owner
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });

    // Pindah ke tab Utang Piutang
    await page.getByRole('button', { name: /utang piutang/i }).click();
  });

  test('menampilkan ringkasan piutang dan tabel daftar utang pelanggan', async ({ page }) => {
    // Memastikan judul manajemen utang piutang tampil
    await expect(page.getByRole('heading', { name: /manajemen utang piutang/i })).toBeVisible();

    // Memastikan kartu statistik sisa piutang dan jumlah transaksi utang muncul
    await expect(page.locator('text=Total Sisa Piutang (Belum Lunas)')).toBeVisible();
    await expect(page.locator('text=Jumlah Transaksi Utang')).toBeVisible();

    // Memastikan tabel daftar utang pelanggan termuat
    await expect(page.getByRole('heading', { name: /daftar utang pelanggan/i })).toBeVisible();
  });

  test('memiliki fitur pencarian pada daftar utang pelanggan', async ({ page }) => {
    // Cari input pencarian khusus utang piutang
    const debtSearchInput = page.locator('input[placeholder="🔍 Cari nama / no hp pelanggan..."]');
    await expect(debtSearchInput).toBeVisible();

    // Uji ketik kata kunci pada pencarian utang
    await debtSearchInput.fill('Budi');
    await expect(debtSearchInput).toHaveValue('Budi');
  });

});