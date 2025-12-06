const validators = {
  // Validar email
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validar teléfono (formato básico)
  isValidPhone: (phone) => {
    const phoneRegex = /^[0-9+\-\s()]{10,20}$/;
    return phoneRegex.test(phone);
  },

  // Validar precio
  isValidPrice: (price) => {
    return !isNaN(price) && price >= 0;
  },

  // Validar stock
  isValidStock: (stock) => {
    return Number.isInteger(stock) && stock >= 0;
  },

  // Validar slug
  isValidSlug: (slug) => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  },

  // Generar slug a partir de texto
  generateSlug: (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  },

  // Formatear precio
  formatPrice: (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  },

  // Validar y parsear JSON
  safeParseJSON: (str) => {
    try {
      return JSON.parse(str);
    } catch (error) {
      return null;
    }
  }
};

module.exports = validators;