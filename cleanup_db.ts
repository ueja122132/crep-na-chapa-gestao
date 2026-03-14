
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function cleanData() {
  console.log('Iniciando limpeza...');

  // 1. Remover pedidos de hoje (2026-03-14)
  // Nota: Usando intervalo completo do dia 14
  const { data: deletedToday, error: errorToday } = await supabase
    .from('orders')
    .delete()
    .gte('created_at', '2026-03-14T00:00:00Z')
    .lte('created_at', '2026-03-14T23:59:59Z')
    .select();

  if (errorToday) {
    console.error('Erro ao deletar pedidos de hoje:', errorToday);
  } else {
    console.log(`Pedidos de hoje removidos: ${deletedToday?.length || 0}`);
  }

  // 2. Identificar e remover duplicatas de dias anteriores
  // Vamos buscar pedidos que possuam o mesmo nome de cliente e preço total num intervalo de 1 minuto
  // Como não podemos fazer subqueries complexas facilmente via delete() do client, vamos fazer em duas etapas
  const { data: allOrders, error: errorList } = await supabase
    .from('orders')
    .select('id, customer_name, total_price, created_at')
    .order('created_at', { ascending: true });

  if (errorList) {
    console.error('Erro ao listar pedidos para duplicatas:', errorList);
    return;
  }

  const idsToDelete: number[] = [];
  const handled: Set<string> = new Set();

  allOrders.forEach((order, index) => {
    // Chave de duplicata: Nome + Preço + Minuto da data
    const date = new Date(order.created_at);
    // Zerando segundos e ms para agrupar por minuto
    date.setSeconds(0);
    date.setMilliseconds(0);
    
    const key = `${order.customer_name}|${order.total_price}|${date.getTime()}`;

    if (handled.has(key)) {
      idsToDelete.push(order.id);
    } else {
      handled.add(key);
    }
  });

  if (idsToDelete.length > 0) {
    const { error: errorDup } = await supabase
      .from('orders')
      .delete()
      .in('id', idsToDelete);

    if (errorDup) {
      console.error('Erro ao deletar duplicatas:', errorDup);
    } else {
      console.log(`Pedidos duplicados removidos: ${idsToDelete.length}`);
    }
  } else {
    console.log('Nenhuma duplicata encontrada em dias anteriores.');
  }

  console.log('Limpeza concluída!');
}

cleanData();
