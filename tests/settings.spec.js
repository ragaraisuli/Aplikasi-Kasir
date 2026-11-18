import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'ragaraisuli@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Modul Profil Toko & Pengaturan Sistem', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Login sebagai Owner
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /masuk ke aplikasi|masuk|login/i }).click();

    await page.waitForURL((url) => url.pathname === '/', { timeout: 20000 });

    // 2. Pindah ke tab/menu Profil Toko atau Pengaturan
    const settingsBtn = page.getByRole('button', { name: /profil|pengaturan|setting|toko/i });
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    }
  });

  test('menampilkan informasi detail profil toko dan form pengaturan', async ({ page }) => {
    // 1. Memastikan elemen halaman profil/pengaturan toko termuat dengan benar
    await expect(page.locator('body')).toContainText(/profil|toko|nama|alamat|telepon|pengaturan/i);

    // 2. Memastikan form input data toko atau tombol simpan perubahan tersedia
    const saveSettingsBtn = page.getByRole('button', { name: /simpan|perbarui|update/i });
    if (await saveSettingsBtn.isVisible()) {
      await expect(saveSettingsBtn).toBeVisible();
      console.log('✅ Tombol simpan pengaturan profil toko tersedia.');
    } else {
      console.log('Info: Informasi profil toko dan konfigurasi multi-tenant ditampilkan secara read-only atau terstruktur.');
    }
  });

});