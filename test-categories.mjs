// Test script to check Categoria table in Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unjcjkcyirklpuwwnajc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamNqa2N5aXJrbHB1d3duYWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjY4NTgsImV4cCI6MjA4NjMwMjg1OH0.RlB1hE5eOIiQUCfwr7VEipE_vIfs241KdjM9d750qJQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCategories() {
    console.log('🔍 Testando conexão com Supabase...\n');

    try {
        const { data, error } = await supabase
            .from('Categoria')
            .select('*')
            .limit(10);

        if (error) {
            console.error('❌ Erro ao buscar categorias:', error);
            return;
        }

        console.log(`✅ Conexão bem sucedida!`);
        console.log(`📊 Total de registros encontrados: ${data?.length || 0}\n`);

        if (data && data.length > 0) {
            console.log('📋 Dados brutos da tabela Categoria:');
            console.log(JSON.stringify(data, null, 2));

            console.log('\n🔍 Análise dos campos:');
            const firstRecord = data[0];
            console.log('Campos disponíveis:', Object.keys(firstRecord));

            console.log('\n📝 Cada registro contém:');
            data.forEach((cat, index) => {
                console.log(`\n  Registro ${index + 1}:`);
                console.log(`    - id: ${cat.id}`);
                console.log(`    - Categoria: ${cat.Categoria}`);
                console.log(`    - Sub categoria: ${cat['Sub categoria']}`);
                console.log(`    - etiquetas: ${cat.etiquetas}`);
            });
        } else {
            console.log('⚠️  Nenhuma categoria encontrada na tabela!');
        }

    } catch (error) {
        console.error('💥 Erro inesperado:', error);
    }
}

testCategories();
