const { test, expect } = require('@playwright/test');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Mock user data for testing
const mockUser = {
  googleId: 'test-google-id-123',
  displayName: 'Test User',
  email: 'test@example.com',
  avatar: 'https://example.com/avatar.jpg'
};

test.describe('User Authentication API Tests', () => {
  
  test('GET /api/auth/status - should return authentication status', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/auth/status`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('authenticated');
    expect(typeof data.authenticated).toBe('boolean');
  });

  test('GET /api/auth/google - should return redirect or error', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/auth/google`, {
      maxRedirects: 0
    });
    // Expect redirect (302) or some response
    expect([200, 302, 401]).toContain(response.status());
  });

  test('GET /api/auth/logout - should handle logout', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/auth/logout`);
    // Should redirect or return success
    expect([200, 302]).toContain(response.status());
  });
});

test.describe('User Profile API Tests', () => {
  
  test('GET /api/user/profile - should return user profile or 401', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/user/profile`);
    // Either success with profile or unauthorized
    expect([200, 401]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('user');
    }
  });

  test('PUT /api/user/profile - should update user profile or 401', async ({ request }) => {
    const updateData = {
      displayName: 'Updated Name'
    };
    
    const response = await request.put(`${API_BASE_URL}/api/user/profile`, {
      data: updateData
    });
    
    // Either success or unauthorized
    expect([200, 401]).toContain(response.status());
  });
});

test.describe('User Management API Tests', () => {
  
  test('GET /api/user/level - should return user level or 401', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/user/level`);
    expect([200, 401]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('level');
      expect(['Free', 'Pro', 'Enterprise']).toContain(data.level);
    }
  });

  test('POST /api/user/upgrade - should handle upgrade request', async ({ request }) => {
    const upgradeData = {
      targetLevel: 'Pro'
    };
    
    const response = await request.post(`${API_BASE_URL}/api/user/upgrade`, {
      data: upgradeData
    });
    
    // Should return success, unauthorized, or validation error
    expect([200, 400, 401]).toContain(response.status());
  });
});

test.describe('User Data API Tests', () => {
  
  test('GET /api/user/prompts - should return user prompts or 401', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/user/prompts`);
    expect([200, 401]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data.prompts)).toBeTruthy();
    }
  });

  test('GET /api/user/favorites - should return user favorites or 401', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/user/favorites`);
    expect([200, 401]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data.favorites)).toBeTruthy();
    }
  });

  test('DELETE /api/user/account - should handle account deletion', async ({ request }) => {
    const response = await request.delete(`${API_BASE_URL}/api/user/account`);
    // Should return success, unauthorized, or method not allowed
    expect([200, 401, 405]).toContain(response.status());
  });
});
