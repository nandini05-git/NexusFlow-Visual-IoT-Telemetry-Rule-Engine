import mongoose from 'mongoose';
import DeliveryLog from '../models/DeliveryLog.js';

/**
 * Action Dispatcher Service
 * Handles outbound webhook dispatches with retries, exponential backoff,
 * SSRF protection, mock SMS deliveries, and persistent DeliveryLog recording.
 */

// Private / restricted IP CIDR and hostname check for SSRF prevention
export const isSafeUrl = (urlString) => {
  if (process.env.ALLOW_PRIVATE_WEBHOOKS === 'true') {
    return { safe: true };
  }

  try {
    const parsed = new URL(urlString);

    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // Block localhost, zero addresses, and standard loopbacks
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { safe: false, reason: `SSRF Blocked: Hostname "${hostname}" points to a local or internal host.` };
    }

    // Check for IPv4 private & restricted ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);

    if (ipMatch) {
      const octet1 = parseInt(ipMatch[1], 10);
      const octet2 = parseInt(ipMatch[2], 10);

      // 127.0.0.0/8 (Loopback)
      if (octet1 === 127) {
        return { safe: false, reason: 'SSRF Blocked: Loopback IP range (127.0.0.0/8) is restricted.' };
      }
      // 10.0.0.0/8 (Private RFC 1918)
      if (octet1 === 10) {
        return { safe: false, reason: 'SSRF Blocked: Private Class A IP range (10.0.0.0/8) is restricted.' };
      }
      // 172.16.0.0/12 (Private RFC 1918)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        return { safe: false, reason: 'SSRF Blocked: Private Class B IP range (172.16.0.0/12) is restricted.' };
      }
      // 192.168.0.0/16 (Private RFC 1918)
      if (octet1 === 192 && octet2 === 168) {
        return { safe: false, reason: 'SSRF Blocked: Private Class C IP range (192.168.0.0/16) is restricted.' };
      }
      // 169.254.0.0/16 (Link-local / Cloud metadata service e.g. AWS 169.254.169.254)
      if (octet1 === 169 && octet2 === 254) {
        return { safe: false, reason: 'SSRF Blocked: Cloud metadata IP range (169.254.0.0/16) is restricted.' };
      }
      // 0.0.0.0/8
      if (octet1 === 0) {
        return { safe: false, reason: 'SSRF Blocked: Current network address range (0.0.0.0/8) is restricted.' };
      }
    }

    // Check IPv6 link-local and unique local ranges
    if (hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) {
      return { safe: false, reason: 'SSRF Blocked: IPv6 private / link-local address is restricted.' };
    }

    return { safe: true };
  } catch (err) {
    return { safe: false, reason: `Invalid target URL: ${err.message}` };
  }
};

/**
 * Executes an HTTP POST webhook with retries and exponential backoff.
 */
export const dispatchWebhookWithRetries = async (target, payload, maxAttempts = 3, timeoutMs = 5000) => {
  let attempt = 0;
  let lastError = null;
  let lastResponse = null;

  while (attempt < maxAttempts) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NexusFlow-IoT-RuleEngine/1.0',
          'X-NexusFlow-Delivery-Attempt': String(attempt),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const status = response.status;
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {
        bodyText = '[Unreadable Response Body]';
      }

      if (response.ok) {
        return {
          success: true,
          attempts: attempt,
          responseStatus: status,
          responseBody: bodyText.slice(0, 500),
          error: null,
        };
      }

      // Non-2xx response: record and retry if 5xx server error
      lastResponse = { status, bodyText: bodyText.slice(0, 500) };
      lastError = new Error(`HTTP Error ${status}: ${bodyText.slice(0, 100)}`);

      if (status < 500 && status !== 429) {
        // 4xx client errors (e.g. 400, 404, 401) should not be retried
        break;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      lastError = isAbort ? new Error(`Webhook request timed out after ${timeoutMs}ms`) : err;
    }

    // Exponential backoff before next attempt: 100ms, 200ms...
    if (attempt < maxAttempts) {
      const backoffMs = Math.min(1000, 100 * Math.pow(2, attempt - 1));
      await new Promise((res) => setTimeout(res, backoffMs));
    }
  }

  return {
    success: false,
    attempts: attempt,
    responseStatus: lastResponse ? lastResponse.status : null,
    responseBody: lastResponse ? lastResponse.bodyText : '',
    error: lastError ? lastError.message : 'Unknown webhook delivery failure',
  };
};

/**
 * Dispatches a simulated SMS alert.
 * Validates target phone number format and returns simulated provider SID.
 */
export const dispatchMockSms = async (target, payload) => {
  const phoneRegex = /^[+]?[\d\s\-().]{7,20}$/;
  const cleanPhone = (target || '').trim();

  if (!phoneRegex.test(cleanPhone)) {
    return {
      success: false,
      attempts: 1,
      responseStatus: 400,
      responseBody: 'Invalid recipient phone number format',
      error: `Invalid phone number "${target}". Must be valid E.164 or international format.`,
    };
  }

  // Simulate realistic network delay (20ms)
  await new Promise((res) => setTimeout(res, 20));

  const sid = `SM_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    success: true,
    attempts: 1,
    responseStatus: 200,
    responseBody: JSON.stringify({ sid, recipient: cleanPhone, status: 'delivered', provider: 'NexusFlow-Mock-SMS' }),
    error: null,
  };
};

/**
 * Central action dispatch entry point.
 * Dispatches the action, records delivery logs, and protects against SSRF.
 */
export const dispatchAction = async ({
  graphId = null,
  ownerId,
  nodeId,
  ruleName = 'NexusFlow Rule',
  actionType = 'webhook',
  target,
  reading = {},
  message = '',
}) => {
  const startTime = Date.now();
  const normalizedType = actionType === 'sms_alert' ? 'sms' : actionType;

  const payload = {
    event: 'rule_triggered',
    ruleName,
    nodeId,
    message,
    reading,
    dispatchedAt: new Date().toISOString(),
  };

  // SSRF Check for Webhooks
  if (normalizedType === 'webhook') {
    const safetyCheck = isSafeUrl(target);
    if (!safetyCheck.safe) {
      const executionTimeMs = Date.now() - startTime;
      let logDoc = null;
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        try {
          logDoc = await DeliveryLog.create({
            graphId,
            owner: ownerId,
            nodeId,
            ruleName,
            actionType: normalizedType,
            target,
            payload,
            status: 'blocked',
            attempts: 0,
            error: safetyCheck.reason,
            executionTimeMs,
            completedAt: new Date(),
          });
        } catch (dbErr) {
          console.warn('[DeliveryLog Save Notice]:', dbErr.message);
        }
      }

      return {
        success: false,
        status: 'blocked',
        error: safetyCheck.reason,
        logId: logDoc?._id || null,
      };
    }
  }

  // Execute Delivery
  let deliveryResult;
  if (normalizedType === 'webhook') {
    deliveryResult = await dispatchWebhookWithRetries(target, payload);
  } else if (normalizedType === 'sms') {
    deliveryResult = await dispatchMockSms(target, payload);
  } else {
    // Custom / log
    deliveryResult = {
      success: true,
      attempts: 1,
      responseStatus: 200,
      responseBody: `Executed custom action ${normalizedType}`,
      error: null,
    };
  }

  const executionTimeMs = Date.now() - startTime;
  const finalStatus = deliveryResult.success ? 'success' : 'failed';

  // Persist DeliveryLog if database connection is active
  let savedLog = null;
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      savedLog = await DeliveryLog.create({
        graphId,
        owner: ownerId,
        nodeId,
        ruleName,
        actionType: normalizedType,
        target,
        payload,
        status: finalStatus,
        attempts: deliveryResult.attempts,
        responseStatus: deliveryResult.responseStatus,
        responseBody: deliveryResult.responseBody,
        error: deliveryResult.error,
        executionTimeMs,
        completedAt: new Date(),
      });
    } catch (err) {
      console.warn('[DeliveryLog Save Warning]:', err.message);
    }
  }

  return {
    ...deliveryResult,
    status: finalStatus,
    executionTimeMs,
    logId: savedLog?._id || null,
  };
};

/**
 * On-demand Action Test runner for /api/actions/test
 */
export const testAction = async ({ actionType, target, payload = {} }) => {
  const startTime = Date.now();
  const normalizedType = actionType === 'sms_alert' ? 'sms' : actionType;

  if (normalizedType === 'webhook') {
    const safetyCheck = isSafeUrl(target);
    if (!safetyCheck.safe) {
      return {
        success: false,
        status: 'blocked',
        error: safetyCheck.reason,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const testPayload = {
      event: 'test_action_dispatch',
      test: true,
      ...payload,
      timestamp: new Date().toISOString(),
    };

    const result = await dispatchWebhookWithRetries(target, testPayload);
    return {
      ...result,
      status: result.success ? 'success' : 'failed',
      executionTimeMs: Date.now() - startTime,
    };
  }

  if (normalizedType === 'sms') {
    const result = await dispatchMockSms(target, payload);
    return {
      ...result,
      status: result.success ? 'success' : 'failed',
      executionTimeMs: Date.now() - startTime,
    };
  }

  return {
    success: true,
    status: 'success',
    attempts: 1,
    responseStatus: 200,
    responseBody: 'Action type acknowledged',
    executionTimeMs: Date.now() - startTime,
  };
};

export default {
  isSafeUrl,
  dispatchWebhookWithRetries,
  dispatchMockSms,
  dispatchAction,
  testAction,
};
