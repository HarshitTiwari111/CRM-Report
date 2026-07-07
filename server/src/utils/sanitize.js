const KEY_PATTERN = /^\$|\./;

const escapeHtml = (str) =>
  str.replace(/[&<>"'`]/g, (ch) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '`': '&#96;',
    };
    return map[ch];
  });

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return escapeHtml(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return sanitizeObject(value);
  }

  return value;
};

const sanitizeObject = (obj) => {
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (KEY_PATTERN.test(key)) {
      continue;
    }
    clean[key] = sanitizeValue(obj[key]);
  }
  return clean;
};

const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    const cleanedQuery = sanitizeObject(req.query);
    Object.keys(req.query).forEach((k) => delete req.query[k]);
    Object.assign(req.query, cleanedQuery);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

module.exports = { sanitizeRequest, sanitizeObject, sanitizeValue, escapeHtml };
