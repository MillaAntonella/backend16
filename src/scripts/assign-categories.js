#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

// Palabras clave para clasificar libros automáticamente
const CATEGORY_KEYWORDS = {
  'ciencia-ficcion-fantasia': [
    'ciencia ficción', 'sci-fi', 'fantasía', 'fantasy', 'distopía', 'distopia',
    'futurista', 'espacial', 'alien', 'robot', 'magia', 'dragón', 'dragon',
    'elfo', 'hechicero', 'mago', 'apocalipsis', 'guerra mundial', 'espacio'
  ],
  'misterio-thriller': [
    'misterio', 'mystery', 'thriller', 'suspenso', 'detective', 'crimen',
    'asesinato', 'investigación', 'policial', 'noir', 'intriga', 'secreto'
  ],
  'ficcion': [
    'novela', 'ficción', 'fiction', 'historia', 'relato', 'cuento',
    'drama', 'narrativa', 'amor', 'romance', 'vida', 'familia'
  ]
};

async function assignCategoriesToBooks() {
  let connection;
  
  try {
    console.log('='.repeat(60));
    console.log('📚 ASIGNACIÓN AUTOMÁTICA DE CATEGORÍAS A LIBROS');
    console.log('='.repeat(60));
    console.log('');
    
    connection = await pool.getConnection();
    
    // Obtener todas las categorías
    const [categories] = await connection.query(
      'SELECT id_categoria, nombre, slug FROM categorias WHERE activa = 1'
    );
    
    if (categories.length === 0) {
      console.log('❌ No hay categorías disponibles. Ejecuta el setup primero.');
      return;
    }
    
    console.log(`✅ Categorías encontradas: ${categories.length}`);
    categories.forEach(cat => console.log(`   - ${cat.nombre} (${cat.slug})`));
    console.log('');
    
    // Obtener todos los libros sin categorías
    const [books] = await connection.query(`
      SELECT l.id_libro, l.titulo, l.sinopsis, l.slug
      FROM libros l
      LEFT JOIN libro_categorias lc ON l.id_libro = lc.id_libro
      WHERE lc.id_libro IS NULL AND l.activo = 1
    `);
    
    if (books.length === 0) {
      console.log('✅ Todos los libros ya tienen categorías asignadas.');
      return;
    }
    
    console.log(`📖 Libros sin categoría encontrados: ${books.length}`);
    console.log('');
    
    let assigned = 0;
    let notAssigned = 0;
    
    // Procesar cada libro
    for (const book of books) {
      const textToAnalyze = `${book.titulo} ${book.sinopsis || ''}`.toLowerCase();
      let categoryFound = false;
      
      // Buscar la mejor categoría basándose en palabras clave
      for (const [categorySlug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        const matchCount = keywords.filter(keyword => 
          textToAnalyze.includes(keyword.toLowerCase())
        ).length;
        
        if (matchCount > 0) {
          const category = categories.find(c => c.slug === categorySlug);
          
          if (category) {
            try {
              await connection.query(
                'INSERT IGNORE INTO libro_categorias (id_libro, id_categoria) VALUES (?, ?)',
                [book.id_libro, category.id_categoria]
              );
              
              console.log(`✅ "${book.titulo}" → ${category.nombre}`);
              assigned++;
              categoryFound = true;
              break; // Solo asignar una categoría principal
            } catch (error) {
              console.error(`❌ Error asignando categoría a "${book.titulo}": ${error.message}`);
            }
          }
        }
      }
      
      // Si no se encontró categoría específica, asignar a "Ficción" por defecto
      if (!categoryFound) {
        const defaultCategory = categories.find(c => c.slug === 'ficcion');
        if (defaultCategory) {
          try {
            await connection.query(
              'INSERT IGNORE INTO libro_categorias (id_libro, id_categoria) VALUES (?, ?)',
              [book.id_libro, defaultCategory.id_categoria]
            );
            console.log(`📚 "${book.titulo}" → ${defaultCategory.nombre} (por defecto)`);
            assigned++;
          } catch (error) {
            console.error(`❌ Error asignando categoría por defecto: ${error.message}`);
            notAssigned++;
          }
        } else {
          console.log(`⚠️  "${book.titulo}" - No se pudo asignar categoría`);
          notAssigned++;
        }
      }
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('📊 RESUMEN');
    console.log('='.repeat(60));
    console.log(`✅ Libros categorizados: ${assigned}`);
    console.log(`❌ Libros sin categorizar: ${notAssigned}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Función para asignar categoría manualmente a un libro específico
async function assignCategoryToBook(bookId, categorySlug) {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const [categories] = await connection.query(
      'SELECT id_categoria FROM categorias WHERE slug = ? AND activa = 1',
      [categorySlug]
    );
    
    if (categories.length === 0) {
      throw new Error(`Categoría "${categorySlug}" no encontrada`);
    }
    
    await connection.query(
      'INSERT IGNORE INTO libro_categorias (id_libro, id_categoria) VALUES (?, ?)',
      [bookId, categories[0].id_categoria]
    );
    
    console.log(`✅ Categoría asignada al libro ID ${bookId}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Ejecutar script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 2) {
    // Modo manual: node assign-categories.js <bookId> <categorySlug>
    const bookId = parseInt(args[0]);
    const categorySlug = args[1];
    assignCategoryToBook(bookId, categorySlug)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    // Modo automático: asignar a todos los libros
    assignCategoriesToBooks()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { assignCategoriesToBooks, assignCategoryToBook };
