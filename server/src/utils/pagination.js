const getPagination = (query, defaultLimit = 50) => {
  const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
  const limitNum = Math.max(1, parseInt(query.limit, 10) || defaultLimit);
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

const buildMeta = (pageNum, limitNum, total) => ({
  page: pageNum,
  limit: limitNum,
  total,
  pages: Math.max(1, Math.ceil(total / limitNum)),
});

module.exports = { getPagination, buildMeta };
