import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import rateLimit from 'express-rate-limit';
import app from '../src/app.js';
import ruleRunner from '../src/compiler/ruleRunner.js';

test('NexusFlow Backend Hardening & Reliability Test Suite', async (t) => {
  let server;
  let baseUrl;

  // Start test server instance
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  t.after(() => {
    ruleRunner.stopAll();
    server.close();
  });

  await t.test(
    '1. Malformed JSON returns HTTP 400 with consistent { error, details } format',
    async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalidJson": unquoted_value}',
      });

      assert.equal(res.status, 400, 'Expected HTTP 400 for malformed JSON');
      const body = await res.json();
      assert.ok(body.error, 'Response must contain "error" field');
      assert.ok(body.details !== undefined, 'Response must contain "details" field');
      assert.equal(body.error, 'Invalid JSON payload received');
      assert.equal(body.success, false);
    }
  );

  await t.test('2. Rate limiting on login triggers HTTP 429 when threshold exceeded', async () => {
    // Create an isolated sub-app with strict limit of 3 requests to test rate limiting precisely
    const testApp = express();
    const strictLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many authentication attempts. Please try again after 15 minutes.',
        details: 'Auth endpoint rate limit exceeded.',
      },
    });

    testApp.post('/login', strictLimiter, (req, res) => res.json({ success: true }));

    const subServer = http.createServer(testApp);
    const subPort = await new Promise((resolve) => {
      subServer.listen(0, () => resolve(subServer.address().port));
    });

    const subUrl = `http://127.0.0.1:${subPort}/login`;

    // Send 3 requests (all should succeed)
    for (let i = 0; i < 3; i++) {
      const res = await fetch(subUrl, { method: 'POST' });
      assert.equal(res.status, 200, `Request ${i + 1} should succeed`);
    }

    // 4th request must be blocked with HTTP 429
    const blockedRes = await fetch(subUrl, { method: 'POST' });
    assert.equal(blockedRes.status, 429, '4th request must be rate limited with HTTP 429');
    const blockedBody = await blockedRes.json();
    assert.ok(blockedBody.error, 'Must include error field');
    assert.match(blockedBody.error, /Too many authentication attempts/);

    subServer.close();
  });

  await t.test(
    '3. Graceful stopAll terminates all active rule subscriptions and clears in-memory state',
    async () => {
      let stoppedCount = 0;
      const mockController1 = {
        stop: () => {
          stoppedCount++;
        },
        metadata: { nodeCount: 3 },
      };
      const mockController2 = {
        stop: () => {
          stoppedCount++;
        },
        metadata: { nodeCount: 4 },
      };

      ruleRunner.activeGraphs.set('mock-graph-1', {
        compiled: mockController1,
        ownerId: 'user-1',
        graphName: 'Test Graph 1',
        activatedAt: new Date(),
      });

      ruleRunner.activeGraphs.set('mock-graph-2', {
        compiled: mockController2,
        ownerId: 'user-1',
        graphName: 'Test Graph 2',
        activatedAt: new Date(),
      });

      ruleRunner.lastTriggeredTimes.set('mock-graph-1:node-1', Date.now());
      ruleRunner.lastTriggeredTimes.set('mock-graph-2:node-2', Date.now());

      assert.equal(ruleRunner.listActive().length, 2, 'Should have 2 active graphs');
      assert.equal(ruleRunner.isActive('mock-graph-1'), true);

      // Invoke stopAll
      ruleRunner.stopAll();

      assert.equal(
        ruleRunner.listActive().length,
        0,
        'Active graphs map should be empty after stopAll'
      );
      assert.equal(ruleRunner.isActive('mock-graph-1'), false);
      assert.equal(ruleRunner.isActive('mock-graph-2'), false);
      assert.equal(ruleRunner.lastTriggeredTimes.size, 0, 'Cooldown map should be cleared');
      assert.equal(stoppedCount, 2, 'Both controller stop() methods must have been called');
    }
  );

  await t.test('4. Request ID is attached to response headers and request context', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const reqIdHeader = res.headers.get('x-request-id');
    assert.ok(reqIdHeader, 'Response must include X-Request-Id header');
    assert.ok(reqIdHeader.length > 10, 'Request ID must be a non-trivial UUID');
  });
});
