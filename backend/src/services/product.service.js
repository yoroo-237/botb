import { prisma } from '../db.js';
import { parsePaginationParams, buildPagination } from '../utils/pagination.js';

export const productService = {
  async list(query) {
    const { page, limit, skip } = parsePaginationParams(query);
    const { search, category, sort } = query;

    const where = { isActive: true };

    if (search) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) {
        // Include subcategories
        const children = await prisma.category.findMany({ where: { parentId: cat.id } });
        const ids      = [cat.id, ...children.map(c => c.id)];
        where.categoryId = { in: ids };
      }
    }

    const sortMap = {
      price_asc:  { price: 'asc' },
      price_desc: { price: 'desc' },
      latest:     { createdAt: 'desc' },
      popularity: { orderItems: { _count: 'desc' } },
    };
    const orderBy = sortMap[sort] || { id: 'asc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: limit, orderBy,
        include: { images: { orderBy: { position: 'asc' } }, category: true },
      }),
      prisma.product.count({ where }),
    ]);

    return { products, pagination: buildPagination(page, limit, total) };
  },

  async getBySlug(slug) {
    return prisma.product.findFirstOrThrow({
      where:   { slug, isActive: true },
      include: {
        images:   { orderBy: { position: 'asc' } },
        category: { include: { parent: true } },
        brand:    true,
      },
    });
  },

  async getRelated(slug) {
    const product = await prisma.product.findFirstOrThrow({ where: { slug } });
    return prisma.product.findMany({
      where:   { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
      take:    4,
      include: { images: { take: 1, orderBy: { position: 'asc' } } },
    });
  },
};
