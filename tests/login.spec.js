import { test, expect } from '@playwright/test';

// ============================================================
// Konfigurasi - sesuaikan dengan environment Anda
// ============================================================
const LOGIN_URL = '/login';
const VALID_EMAIL = 'ragabumi@gmail.com';
const VALID_PASSWORD = '123456';
const INVALID_EMAIL = 'tidak-ada@contoh.com';
const INVALID_PASSWORD = 'salahpass123';

test.describe('Login Page (app/login/page.tsx)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);

    // Pastikan kita di mode form login (bukan forgot password)
    const kembaliLogin = page.getByRole('button', { name: /kembali login/i });
    if (await kembaliLogin.isVisible().catch(() => false)) {
      await kembaliLogin.click();
    }
  });

  // ----------------------------------------------------------
  // 1. Tampilan awal
  // ----------------------------------------------------------
  test('menampilkan form login dengan semua elemen', async ({ page }) => {
    await expect(page.locator('form, main, div').filter({ hasText: /login|masuk/i }).first()).toBeVisible();

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await expect(page.getByRole('button', { name: /masuk|login/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /lupa password\?/i })).toBeVisible();

    await expect(page.getByRole('link', { name: /daftar toko baru/i })).toHaveAttribute('href', '/register');
  });

  // ----------------------------------------------------------
  // 2. Validasi: field kosong -> alert() "Email dan password wajib diisi!"
  // ----------------------------------------------------------
  test('menampilkan alert saat email/password kosong', async ({ page }) => {
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Pastikan input benar-benar kosong
    await page.locator('input[type="email"]').fill('');
    await page.locator('input[type="password"]').fill('');

    // Gunakan force: true agar klik menembus pencegahan validasi HTML5
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click({ force: true });

    await expect.poll(() => dialogMessage, { timeout: 5000 })
      .toContain('Email dan password wajib diisi!');
  });

  // ----------------------------------------------------------
  // 3. Login gagal -> alert "Login Gagal: ..."
  // ----------------------------------------------------------
  test('login gagal dengan kredensial salah', async ({ page }) => {
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.locator('input[type="email"]').fill(INVALID_EMAIL);
    await page.locator('input[type="password"]').fill(INVALID_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await expect.poll(() => dialogMessage, { timeout: 15000 })
      .toContain('Login Gagal');
  });

  // ----------------------------------------------------------
  // 4. Login sukses -> redirect ke '/'
  // ----------------------------------------------------------
  test('login berhasil redirect ke halaman utama', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());

    await page.locator('input[type="email"]').fill(VALID_EMAIL);
    await page.locator('input[type="password"]').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });
  });

  // ----------------------------------------------------------
  // 5. State loading saat memproses login
  // ----------------------------------------------------------
  test('tombol menampilkan teks loading saat memproses', async ({ page }) => {
    await page.locator('input[type="email"]').fill(VALID_EMAIL);
    await page.locator('input[type="password"]').fill(VALID_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await expect(page.getByRole('button', { name: /memproses\.\.\.|loading/i })).toBeVisible();
  });

  // ----------------------------------------------------------
  // 6. Mode Lupa Password
  // ----------------------------------------------------------
  test('berpindah ke form reset password dan kembali', async ({ page }) => {
    await page.getByRole('button', { name: /lupa password\?/i }).click();

    await expect(page.getByText(/reset password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /kirim link reset/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /kembali login/i })).toBeVisible();

    await page.getByRole('button', { name: /kembali login/i }).click();
    await expect(page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i })).toBeVisible();
  });

  // ----------------------------------------------------------
  // 7. Validasi: reset password kosong -> alert()
  // ----------------------------------------------------------
  test('reset password tanpa email -> alert', async ({ page }) => {
    await page.getByRole('button', { name: /lupa password\?/i }).click();

    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('');
    }

    await page.getByRole('button', { name: /kirim link reset/i }).click({ force: true });

    await expect.poll(() => dialogMessage, { timeout: 5000 })
      .toContain('Masukkan email');
  });

  // ----------------------------------------------------------
  // 8. Reset password sukses (menggunakan Mock API Supabase)
  // ----------------------------------------------------------
  test('reset password dengan email valid -> alert sukses', async ({ page }) => {
    await page.route('**/auth/v1/recover*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    await page.getByRole('button', { name: /lupa password\?/i }).click();

    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(VALID_EMAIL);
    }
    await page.getByRole('button', { name: /kirim link reset/i }).click();

    await expect.poll(() => dialogMessage, { timeout: 10000 })
      .toContain('Instruksi pemulihan password telah dikirim');
  });

  // ----------------------------------------------------------
  // 9. Link navigasi ke /register
  // ----------------------------------------------------------
  test('link daftar toko baru menuju /register', async ({ page }) => {
    await page.getByRole('link', { name: /daftar toko baru/i }).click();
    await expect(page).toHaveURL(/register/);
  });
});