// Test para verificar estrutura da tabela investimento
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://unjcjkcyirklpuwwnajc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuamNqa2N5aXJrbHB1d3duYWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjY4NTgsImV4cCI6MjA4NjMwMjg1OH0.RlB1hE5eOIiQUCfwr7VEipE_vIfs241KdjM9d750qJQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInvestimento() {
    console.log('🔍 Testando tabela investimento...\n');

    try {
        const { data, error } = await supabase
            .from('investimento')
            .select('*')
            .limit(3);

        if (error) {
            console.error('❌ Erro ao buscar:', error);
            return;
        }

        console.log(`✅ Sucesso! Encontrados ${data?.length || 0} registros\n`);

        if (data && data.length > 0) {
            console.log('📋 Colunas disponíveis:');
            console.log(Object.keys(data[0]));

            console.log('\n📊 Registros:');
            data.forEach((row, index) => {
                console.log(`\nRegistro ${index + 1}:`);
                console.log(JSON.stringify(row, null, 2));
            });
        } else {
            console.log('⚠️ Tabela vazia - não há registros.');
        }

    } catch (error) {
        console.error('💥 Erro inesperado:', error);
    }
}

testInvestimento();
