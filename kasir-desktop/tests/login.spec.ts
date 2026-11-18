import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Pengujian Halaman Login Aplikasi Kasir POS', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('1. Halaman login tampil dengan benar', async ({ page }) => {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Aplikasi Kasir POS' })).toBeVisible();
    await expect(page.getByText('Silakan login untuk mengakses sistem POS')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk ke Aplikasi' })).toBeVisible();
  });

  test('2. Input email dan password dapat diisi', async ({ page }) => {
    await page.locator('input[type="email"]').fill('tester@example.com');
    await page.locator('input[type="password"]').fill('password-test');

    await expect(page.locator('input[type="email"]')).toHaveValue('tester@example.com');
    await expect(page.locator('input[type="password"]')).toHaveValue('password-test');
  });

  test('3. Form login mewajibkan email dan password', async ({ page }) => {
    const email = page.locator('input[type="email"]');
    const password = page.locator('input[type="password"]');

    await expect(email).toHaveAttribute('required', '');
    await expect(password).toHaveAttribute('required', '');

    await page.getByRole('button', { name: 'Masuk ke Aplikasi' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('4. Tombol Lupa Password membuka form pemulihan', async ({ page }) => {
    await page.getByRole('button', { name: 'Lupa Password?' }).click();

    await expect(page.getByText('Reset Password Akun Anda')).toBeVisible();
    await expect(page.getByText('Email Terdaftar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kirim Link Reset' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kembali Login' })).toBeVisible();
  });

  test('5. Tombol Kembali Login mengembalikan form login', async ({ page }) => {
    await page.getByRole('button', { name: 'Lupa Password?' }).click();
    await page.getByRole('button', { name: 'Kembali Login' }).click();

    await expect(page.getByText('Silakan login untuk mengakses sistem POS')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk ke Aplikasi' })).toBeVisible();
  });

  test('6. Link Daftar Toko Baru mengarah ke halaman register', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Daftar Toko Baru' })).toHaveAttribute('href', '/register');
  });
});
