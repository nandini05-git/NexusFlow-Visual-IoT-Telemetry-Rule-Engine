import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isSafeUrl, dispatchMockSms, testAction } from '../src/services/actionDispatcher.js';

describe('NexusFlow Action Dispatcher & SSRF Firewall Test Suite', () => {
  describe('SSRF Protection (isSafeUrl)', () => {
    it('1. Allows public HTTPS endpoints', () => {
      const allowed = [
        'https://api.iot-dispatch.com/webhook',
        'https://hooks.slack.com/services/T00/B00/XXXX',
        'https://webhook.site/12345-abcde',
        'http://example.com/api/alerts',
      ];

      for (const url of allowed) {
        const res = isSafeUrl(url);
        assert.strictEqual(res.safe, true, `Expected URL to be safe: ${url}`);
      }
    });

    it('2. Blocks loopback and local hostnames', () => {
      const blocked = [
        'http://localhost/api',
        'http://localhost:5000/api',
        'https://127.0.0.1/admin',
        'http://127.0.0.1:8080/metrics',
        'http://0.0.0.0:3000',
        'http://[::1]:5000',
        'http://server.local/internal',
        'http://backend.internal/db',
      ];

      for (const url of blocked) {
        const res = isSafeUrl(url);
        assert.strictEqual(res.safe, false, `Expected URL to be blocked: ${url}`);
        assert.match(res.reason, /SSRF Blocked/);
      }
    });

    it('3. Blocks private RFC 1918 IP addresses', () => {
      const privateIps = [
        'http://10.0.0.1/secrets',
        'http://10.254.1.1:9000',
        'http://172.16.0.1/admin',
        'http://172.31.255.255/internal',
        'http://192.168.1.1/router-login',
        'http://192.168.0.254:8080',
      ];

      for (const url of privateIps) {
        const res = isSafeUrl(url);
        assert.strictEqual(res.safe, false, `Expected private IP to be blocked: ${url}`);
        assert.match(res.reason, /Private Class|restricted/i);
      }
    });

    it('4. Blocks Cloud Metadata IP (169.254.169.254)', () => {
      const metadataUrls = [
        'http://169.254.169.254/latest/meta-data/',
        'http://169.254.169.254/computeMetadata/v1/',
      ];

      for (const url of metadataUrls) {
        const res = isSafeUrl(url);
        assert.strictEqual(res.safe, false, `Expected metadata IP to be blocked: ${url}`);
        assert.match(res.reason, /Cloud metadata/i);
      }
    });

    it('5. Rejects non-HTTP protocols (file, ftp, javascript)', () => {
      const invalidProtocols = [
        'file:///etc/passwd',
        'ftp://anonymous@ftp.example.com/dump.tar',
        'javascript:alert(1)',
      ];

      for (const url of invalidProtocols) {
        const res = isSafeUrl(url);
        assert.strictEqual(res.safe, false);
      }
    });
  });

  describe('Mock SMS Dispatcher', () => {
    it('6. Successfully delivers formatted SMS to valid phone number', async () => {
      const res = await dispatchMockSms('+1 (555) 019-2834', 'ALERT: Turbine-01 overheat 92°C');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.responseStatus, 200);
      assert.ok(res.responseBody);
      const parsed = JSON.parse(res.responseBody);
      assert.strictEqual(parsed.status, 'delivered');
      assert.ok(parsed.sid);
    });

    it('7. Rejects invalid or empty phone numbers', async () => {
      const res = await dispatchMockSms('123', 'Hello');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.responseStatus, 400);
      assert.match(res.error, /Invalid phone number/);
    });
  });

  describe('Diagnostic testAction API', () => {
    it('8. Diagnostic testAction catches SSRF attempts before dispatch', async () => {
      const res = await testAction({
        actionType: 'webhook',
        target: 'http://127.0.0.1:27017',
        template: 'Test SSRF',
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.status, 'blocked');
      assert.match(res.error, /SSRF Blocked/);
    });

    it('9. Diagnostic testAction dispatches mock SMS successfully', async () => {
      const res = await testAction({
        actionType: 'sms_alert',
        target: '+1 (555) 999-8888',
        template: 'Diagnostic test message',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.status, 'success');
      assert.strictEqual(res.responseStatus, 200);
      assert.ok(res.responseBody);
    });
  });
});
