// @ts-check
import { test, expect } from '@playwright/test';

// E2E smoke that covers: signup/login, marketplace search, prompt CRUD, purchase, review, and fork/collab
// Assumptions:
// - Base URL is configured via PLAYWRIGHT_BASE_URL or process.env.BASE_URL
// - Test user credentials are provided via env: E2E_EMAIL, E2E_PASSWORD
// - Payment/test data and feature flags handled by backend test/staging
// - GitHub Actions will install browsers and run `npx playwright test`

const BASE_URL = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const E2E_EMAIL = process.env.E2E_EMAIL || `e2e_user_${Date.now()}@example.com`;
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'TestPwd!1234';

// helpers
async function signupOrLogin(page) {
  await page.goto(`${BASE_URL}`);
  // go to auth page
  await page.getByRole('link', { name: /sign in|log in|login|register|sign up/i }).first().click();

  // If signup form is available, register; else login
  const hasSignup = await page.getByRole('button', { name: /sign up|create account|register/i }).first().isVisible().catch(() => false);
  if (hasSignup) {
    await page.getByLabel(/email/i).fill(E2E_EMAIL);
    await page.getByLabel(/password/i).fill(E2E_PASSWORD);
    const confirm = page.getByLabel(/confirm password/i);
    if (await confirm.count()) {
      await confirm.fill(E2E_PASSWORD);
    }
    await page.getByRole('button', { name: /sign up|create account|register/i }).click();
  } else {
    await page.getByLabel(/email/i).fill(E2E_EMAIL);
    await page.getByLabel(/password/i).fill(E2E_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
  }

  // assert logged in (avatar or dashboard)
  await expect(page.getByRole('button', { name: /account|profile|avatar/i }).or(page.getByRole('link', { name: /dashboard|my prompts/i }))).toBeVisible();
}

async function createPrompt(page) {
  await page.getByRole('link', { name: /new prompt|create prompt|add prompt/i }).first().click();
  const title = `E2E Prompt ${Date.now()}`;
  await page.getByLabel(/title/i).fill(title);
  await page.getByLabel(/description|summary/i).fill('Automated E2E prompt description');
  await page.getByLabel(/content|prompt body|prompt text/i).fill('You are a helpful assistant. Respond concisely.');
  // optional: price field for marketplace
  const price = page.getByLabel(/price/i);
  if (await price.count()) {
    await price.fill('0');
  }
  await page.getByRole('button', { name: /save|publish|create/i }).click();
  await expect(page.getByText(title)).toBeVisible();
  return title;
}

async function searchMarketplace(page, query) {
  await page.getByRole('link', { name: /marketplace|store|explore/i }).first().click();
  await page.getByPlaceholder(/search prompts|search/i).fill(query);
  await page.keyboard.press('Enter');
  await expect(page.getByText(query, { exact: false })).toBeVisible();
}

async function purchasePrompt(page, promptTitle) {
  const card = page.getByRole('article').filter({ hasText: promptTitle }).first();
  await card.getByRole('button', { name: /buy|purchase|get|add to cart|checkout/i }).click();
  // simulate test checkout
  const pay = page.getByRole('button', { name: /pay|confirm|checkout/i });
  if (await pay.count()) {
    await pay.click();
  }
  await expect(page.getByText(/purchase complete|owned|added to library/i)).toBeVisible();
}

async function reviewPrompt(page, promptTitle) {
  await page.getByText(promptTitle).first().click();
  const rating = page.getByRole('radio', { name: /5|five/i }).first();
  if (await rating.count()) await rating.click();
  const textarea = page.getByRole('textbox', { name: /review|comment|feedback/i }).first();
  if (await textarea.count()) await textarea.fill('E2E automated review - looks good!');
  const submit = page.getByRole('button', { name: /submit review|post comment|submit/i }).first();
  if (await submit.count()) await submit.click();
  await expect(page.getByText(/thank you|review posted|comment added/i)).toBeVisible();
}

async function forkPrompt(page, promptTitle) {
  await page.getByText(promptTitle).first().click();
  const forkBtn = page.getByRole('button', { name: /fork|duplicate|make a copy/i }).first();
  await forkBtn.click();
  await expect(page.getByText(/forked|copy created|new draft/i)).toBeVisible();
}

test.describe('Prompt Hub E2E', () => {
  test('Full user journey', async ({ page }) => {
    await signupOrLogin(page);

    // Create prompt
    const createdTitle = await createPrompt(page);

    // Search marketplace and find prompt
    await searchMarketplace(page, createdTitle.split(' ')[0]);

    // Purchase flow
    await purchasePrompt(page, createdTitle);

    // Review
    await reviewPrompt(page, createdTitle);

    // Fork for collaboration
    await forkPrompt(page, createdTitle);
  });
});
