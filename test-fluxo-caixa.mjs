// Test script to check Fluxo de caixa table structure in Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unjcjkcyirklpuwwnajc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamNqa2N5aXJrbHB1d3duYWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjY4NTgsImV4cCI6MjA4NjMwMjg1OH0.RlB1hE5eOIiQUCfwr7VEipE_vIfs241KdjM9d750qJQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFluxoCaixa() {
    console.log('🔍 Testando tabela "Fluxo de caixa"...\n');

    try {
        const { data, error } = await supabase
            .from('Fluxo de caixa')
            .select('*')
            .limit(3);

        if (error) {
            console.error('❌ Erro ao buscar dados:', error);
            return;
        }

        console.log(`✅ Conexão bem sucedida!`);
        console.log(`📊 Total de registros encontrados: ${data?.length || 0}\n`);

        if (data && data.length > 0) {
            console.log('🔍 Colunas disponíveis na tabela:');
            const columns = Object.keys(data[0]);
            console.log(columns);

            console.log('\n📋 Primeiros 3 registros:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log('⚠️  Tabela vazia - nenhum registro encontrado.');
            console.log('Isso é normal se você ainda não importou nenhum CSV.');
        }

    } catch (error) {
        console.error('💥 Erro inesperado:', error);
    }
}

testFluxoCaixa();
