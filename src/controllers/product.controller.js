const ProductModel = require('../models/product.model');

class ProductController {
  static async createProduct(req, res, next) {
    try {
      if (req.user.rol !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear productos'
        });
      }

      const productData = req.body;
      
      // Validar datos necesarios
      if (!productData.titulo || !productData.precio || !productData.id_autor || !productData.id_editorial) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos: título, precio, autor y editorial son obligatorios'
        });
      }

      // Generar slug si no se proporciona
      if (!productData.slug) {
        productData.slug = productData.titulo
          .toLowerCase()
          .replace(/[^\w\s]/gi, '')
          .replace(/\s+/g, '-');
      }

      const product = await ProductModel.create(productData);

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProducts(req, res, next) {
    try {
      const filters = req.query;
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const products = await ProductModel.findAll({ ...filters, limit, offset });
      const total = await ProductModel.count(filters);
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await ProductModel.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req, res, next) {
    try {
      if (req.user.rol !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar productos'
        });
      }

      const { id } = req.params;
      const updates = req.body;

      const product = await ProductModel.update(id, updates);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req, res, next) {
    try {
      if (req.user.rol !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar productos'
        });
      }

      const { id } = req.params;
      await ProductModel.delete(id);

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req, res, next) {
    try {
      const categories = await ProductModel.getCategories();
      
      res.json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAuthors(req, res, next) {
    try {
      const authors = await ProductModel.getAuthors();
      
      res.json({
        success: true,
        data: { authors }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPublishers(req, res, next) {
    try {
      const publishers = await ProductModel.getPublishers();
      
      res.json({
        success: true,
        data: { publishers }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFeaturedProducts(req, res, next) {
    try {
      const products = await ProductModel.findAll({ destacado: true, limit: 10 });
      
      res.json({
        success: true,
        data: { products }
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchProducts(req, res, next) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const products = await ProductModel.findAll({ search: q, limit: 20 });
      
      res.json({
        success: true,
        data: { products }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ProductController;