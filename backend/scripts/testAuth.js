const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const runTests = async () => {
  console.log('========================================================');
  console.log('   NexusFlow Day 2 - Authentication & Route Test Suite');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log('========================================================\n');

  const testEmail = `engineer_${Date.now()}@nexusflow.io`;
  const testPassword = 'Password123!';
  const testName = 'Ada Lovelace';
  let authToken = null;

  // Helper fetch
  const callAPI = async (endpoint, options = {}) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return { status, data };
  };

  // Test 1: Health Check
  console.log('[Test 1] GET /api/health');
  const healthRes = await callAPI('/api/health');
  console.log(` -> Status: ${healthRes.status}, DB: ${healthRes.data?.database || 'unknown'}`);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // Test 2: Register New User
  console.log(`\n[Test 2] POST /api/auth/register (New User: ${testEmail})`);
  const regRes = await callAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
    }),
  });
  console.log(` -> Status: ${regRes.status}`);
  console.log(` -> Message: ${regRes.data?.message}`);
  console.log(` -> User: id=${regRes.data?.user?.id}, name=${regRes.data?.user?.name}, password_exposed=${!!regRes.data?.user?.password}`);
  console.log(` -> Token received: ${!!regRes.data?.token}`);
  if (regRes.status !== 201 || !regRes.data?.token || regRes.data?.user?.password) {
    throw new Error('Registration test failed');
  }
  authToken = regRes.data.token;

  // Test 3: Duplicate Registration (Should return 409 Conflict)
  console.log(`\n[Test 3] POST /api/auth/register (Duplicate Email: ${testEmail})`);
  const dupRes = await callAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Duplicate Engineer',
      email: testEmail,
      password: testPassword,
    }),
  });
  console.log(` -> Status: ${dupRes.status} (Expected 409)`);
  console.log(` -> Message: ${dupRes.data?.message}`);
  if (dupRes.status !== 409) {
    throw new Error(`Expected 409 for duplicate registration, got ${dupRes.status}`);
  }

  // Test 4: Successful Login
  console.log('\n[Test 4] POST /api/auth/login (Correct Credentials)');
  const loginRes = await callAPI('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  console.log(` -> Status: ${loginRes.status}`);
  console.log(` -> Message: ${loginRes.data?.message}`);
  console.log(` -> Token received: ${!!loginRes.data?.token}`);
  if (loginRes.status !== 200 || !loginRes.data?.token) {
    throw new Error('Login test failed');
  }

  // Test 5: Login with Wrong Password (Should return 401)
  console.log('\n[Test 5] POST /api/auth/login (Wrong Password)');
  const wrongPassRes = await callAPI('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword999!',
    }),
  });
  console.log(` -> Status: ${wrongPassRes.status} (Expected 401)`);
  console.log(` -> Message: ${wrongPassRes.data?.message}`);
  if (wrongPassRes.status !== 401) {
    throw new Error(`Expected 401 for wrong password, got ${wrongPassRes.status}`);
  }

  // Test 6: GET /api/auth/me WITHOUT token (Should return 401)
  console.log('\n[Test 6] GET /api/auth/me (Without Bearer Token)');
  const meNoTokenRes = await callAPI('/api/auth/me');
  console.log(` -> Status: ${meNoTokenRes.status} (Expected 401)`);
  console.log(` -> Message: ${meNoTokenRes.data?.message}`);
  if (meNoTokenRes.status !== 401) {
    throw new Error(`Expected 401 when accessing protected route without token, got ${meNoTokenRes.status}`);
  }

  // Test 7: GET /api/auth/me WITH valid token (Should return 200)
  console.log('\n[Test 7] GET /api/auth/me (With Valid Bearer Token)');
  const meWithTokenRes = await callAPI('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  console.log(` -> Status: ${meWithTokenRes.status}`);
  console.log(` -> Current User: ${meWithTokenRes.data?.user?.name} (${meWithTokenRes.data?.user?.email})`);
  if (meWithTokenRes.status !== 200 || !meWithTokenRes.data?.user?.email) {
    throw new Error('GET /api/auth/me failed with valid token');
  }

  // Test 8: GET /api/telemetry Protected Check WITHOUT token
  console.log('\n[Test 8] GET /api/telemetry (Protected: Without Token)');
  const telNoTokenRes = await callAPI('/api/telemetry?limit=5');
  console.log(` -> Status: ${telNoTokenRes.status} (Expected 401)`);
  console.log(` -> Message: ${telNoTokenRes.data?.message}`);
  if (telNoTokenRes.status !== 401) {
    throw new Error(`Expected 401 for /api/telemetry without token, got ${telNoTokenRes.status}`);
  }

  // Test 9: GET /api/telemetry Protected Check WITH token
  console.log('\n[Test 9] GET /api/telemetry (Protected: With Valid Token)');
  const telWithTokenRes = await callAPI('/api/telemetry?limit=5', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  console.log(` -> Status: ${telWithTokenRes.status}`);
  console.log(` -> Telemetry Records returned: ${telWithTokenRes.data?.count ?? telWithTokenRes.data?.data?.length}`);
  if (telWithTokenRes.status !== 200) {
    throw new Error('GET /api/telemetry failed with valid token');
  }

  console.log('\n========================================================');
  console.log('   ALL 9 AUTHENTICATION & ROUTE TESTS PASSED 100%!');
  console.log('========================================================\n');
};

runTests().catch((err) => {
  console.error('\n[TEST RUNNER ERROR]', err.message);
  process.exit(1);
});
