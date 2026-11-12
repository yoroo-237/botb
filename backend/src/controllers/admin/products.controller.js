import { prisma } from '../../db.js';
import { ok } from '../../utils/response.js';
import { parsePaginationParams, buildPagination } from '../../utils/pagination.js';
import { appError } from '../../utils/formatters.js';
import { uploadToCloudinary } from '../../middlewares/upload.js';

// Variants (flavor, strain, size), each with its own price and stock. Sent as the whole
// list: existing ones keep their id (orders point to it), missing ones are removed. The
// product's price becomes the lowest variant price and its stock their total.
function readOptions(options) {
  if (!Array.isArray(options)) return null;
  return options
    .map((o, i) => ({ id: Number(o.id) || null, label: String(o.label || '').trim().slice(0, 120), price: parseFloat(o.price), stock: Math.max(0, parseInt(o.stock || 0, 10) || 0), position: i }))
    .filter(o => o.label && o.price >= 0);
}

async function saveOptions(tx, productId, options) {
  const keep = options.filter(o => o.id).map(o => o.id);
  await tx.productOption.deleteMany({ where: { productId, ...(keep.length ? { id: { notIn: keep } } : {}) } });
  for (const o of options) {
    const data = { label: o.label, price: o.price, stock: o.stock, position: o.position };
    if (o.id) await tx.productOption.updateMany({ where: { id: o.id, productId }, data });
    else await tx.productOption.create({ data: { ...data, productId } });
  }
  if (options.length) {
    await tx.product.update({
      where: { id: productId },
      data: { price: Math.min(...options.map(o => o.price)), stock: options.reduce((s, o) => s + o.stock, 0) },
    });
  }
}

const WITH = { images: { orderBy: { position: 'asc' } }, category: true, options: { orderBy: { position: 'asc' } } };

export const adminProductsController = {
  async list(req, res) {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { search, category, isActive } = req.query;

    const where = {};
    if (search)               where.name     = { contains: search.trim(), mode: 'insensitive' };
    if (category)             where.category = { slug: category };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { images: { orderBy: { position: 'asc' } }, category: true, brand: true, options: { orderBy: { position: 'asc' } }, _count: { select: { images: true } } },
      }),
      prisma.product.count({ where }),
    ]);
    res.json(ok({ products, pagination: buildPagination(page, limit, total) }));
  },

  async create(req, res) {
    const { name, slug, price, description, stock, categoryId, brandId, images = [] } = req.body;
    const options = readOptions(req.body.options) || [];
    if (!name?.trim()) throw appError('name is required', 400);
    if (!slug?.trim()) throw appError('slug is required', 400);
    if (!price && !options.length) throw appError('price is required', 400);

    const created = await prisma.product.create({
      data: {
        name:        name.trim(),
        slug:        slug.trim().toLowerCase(),
        price:       options.length ? Math.min(...options.map(o => o.price)) : parseFloat(price),
        description: description?.trim() || null,
        stock:       options.length ? options.reduce((s, o) => s + o.stock, 0) : parseInt(stock || 0, 10),
        categoryId:  categoryId ? parseInt(categoryId, 10) : null,
        brandId:     brandId    ? parseInt(brandId, 10)    : null,
        images:      images.length ? { create: images.map((img, i) => ({ url: img.url, thumbnail: img.thumbnail || null, position: i, mediaType: img.mediaType || 'image' })) } : undefined,
      },
    });
    if (options.length) await prisma.$transaction(tx => saveOptions(tx, created.id, options));
    const product = await prisma.product.findUnique({ where: { id: created.id }, include: WITH });
    res.status(201).json(ok(product));
  },

  async update(req, res) {
    const id   = parseInt(req.params.id, 10);
    const { name, slug, price, description, stock, isActive, categoryId, brandId } = req.body;
    const data = {};
    if (name        !== undefined) data.name        = name.trim();
    if (slug        !== undefined) data.slug        = slug.trim().toLowerCase();
    if (price       !== undefined) data.price       = parseFloat(price);
    if (description !== undefined) data.description = description?.trim() || null;
    if (stock       !== undefined) data.stock       = parseInt(stock, 10);
    if (isActive    !== undefined) data.isActive    = Boolean(isActive);
    if (categoryId  !== undefined) data.categoryId  = categoryId ? parseInt(categoryId, 10) : null;
    if (brandId     !== undefined) data.brandId     = brandId    ? parseInt(brandId, 10)    : null;

    const options = readOptions(req.body.options);
    await prisma.$transaction(async tx => {
      if (Object.keys(data).length) await tx.product.update({ where: { id }, data });
      if (options) await saveOptions(tx, id, options);
    });
    const product = await prisma.product.findUnique({ where: { id }, include: WITH });
    res.json(ok(product));
  },

  async remove(req, res) {
    const id = parseInt(req.params.id, 10);
    await prisma.productImage.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    res.json(ok({ deleted: true }));
  },

  // ─── Images ─────────────────────────────────────────────────────────────────

  async addImage(req, res) {
    const productId = parseInt(req.params.id, 10);
    const { url, thumbnail, position = 0, mediaType = 'image' } = req.body;
    if (!url) throw appError('url is required', 400);
    const validTypes = ['image', 'video'];
    const type = validTypes.includes(mediaType) ? mediaType : 'image';
    const img = await prisma.productImage.create({ data: { productId, url, thumbnail: thumbnail || null, position: parseInt(position, 10), mediaType: type } });
    res.status(201).json(ok(img));
  },

  async removeImage(req, res) {
    await prisma.productImage.delete({ where: { id: parseInt(req.params.imgId, 10) } });
    res.json(ok({ deleted: true }));
  },

  async uploadImage(req, res) {
    const productId = parseInt(req.params.id, 10);
    const files = req.files;
    if (!files || files.length === 0) throw appError('No files uploaded', 400);

    const startPosition = await prisma.productImage.count({ where: { productId } });

    const imgs = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const type = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const { url, thumbnail } = await uploadToCloudinary(file.buffer, file.mimetype);
      const img = await prisma.productImage.create({
        data: { productId, url, thumbnail, position: startPosition + i, mediaType: type },
      });
      imgs.push(img);
    }

    res.status(201).json(ok(imgs));
  },
};
