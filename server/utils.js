const { randomUUID } = require('crypto');

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-Id',
  };
}

function sendJson(res, statusCode, payload, correlationId) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Correlation-Id': correlationId,
    ...getCorsHeaders(),
  });
  res.end(JSON.stringify(payload));
}

function notFound(res, correlationId) {
  sendJson(res, 404, { error: 'Not found' }, correlationId);
}

function methodNotAllowed(res, correlationId) {
  sendJson(res, 405, { error: 'Method not allowed' }, correlationId);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024 * 3) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function getTokenFromAuthHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
}

function getCorrelationId(req) {
  return req.headers['x-correlation-id'] || randomUUID();
}

function parseQuery(urlObj) {
  const query = {};
  urlObj.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

module.exports = {
  sendJson,
  notFound,
  methodNotAllowed,
  parseJsonBody,
  getTokenFromAuthHeader,
  getCorrelationId,
  parseQuery,
  getCorsHeaders,
};
