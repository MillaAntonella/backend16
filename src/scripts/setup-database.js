#!/usr/bin/env node

require('dotenv').config();
const dbSetup = require('../src/database/setup');
const { logger } = require('../src/utils/logger');

async function main() {
  console.log('='.repeat(60));
  console.log('🛠️  CONFIGURADOR DE BASE DE DATOS - TIENDA DE LIBROS');
  console.log('='.repeat(60));
  
  const args = process.argv.slice(2);
  const command = args[0] || 'setup';
  
  try {
    switch (command) {
      case 'setup':
        console.log('Iniciando configuración completa...\n');
        const result = await dbSetup.setupCompleteDatabase();
        
        if (result.success) {
          console.log('\n🎉 ¡Configuración completada exitosamente!');
          console.log(`📊 Tablas creadas: ${result.tablesCreated}`);
          console.log(`📦 Datos iniciales: ${result.initialData ? 'Sí' : 'No'}`);
        } else {
          console.log('\n⚠️  Configuración no completada:');
          console.log(`📋 Tablas existentes: ${result.existingTables?.length || 0}`);
          console.log('💡 Usa "npm run db:reset" para recrear todo');
        }
        break;
        
      case 'check':
        console.log('Verificando estado de la base de datos...\n');
        const tables = await dbSetup.checkExistingTables();
        console.log(`📋 Tablas encontradas: ${tables.length}`);
        if (tables.length > 0) {
          console.log('📊 Lista:');
          tables.forEach(table => console.log(`   - ${table}`));
        }
        break;
        
      case 'seed':
        console.log('Insertando datos iniciales...\n');
        await dbSetup.insertInitialData();
        console.log('✅ Datos iniciales insertados');
        break;
        
      default:
        console.log('Comandos disponibles:');
        console.log('  npm run db:setup    - Configurar base de datos completa');
        console.log('  npm run db:check    - Verificar tablas existentes');
        console.log('  npm run db:seed     - Insertar solo datos iniciales');
        break;
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  process.exit(0);
}

main();