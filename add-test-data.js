import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Lisa', 'James', 'Jennifer', 'William', 'Mary', 'Richard', 'Patricia', 'Thomas', 'Linda', 'Charles', 'Barbara', 'Daniel', 'Susan'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee'];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function addTestData() {
  console.log('Starting test data creation...');

  const { data: agencies, error: agencyError } = await supabase
    .from('portal_agencies')
    .select('id, name');

  if (agencyError) {
    console.error('Error fetching agencies:', agencyError);
    return;
  }

  console.log(`Found ${agencies.length} agencies`);

  const { data: agents, error: agentError } = await supabase
    .from('portal_agents')
    .select('id, name, email, agency_id, user_id')
    .eq('status', 'active');

  if (agentError) {
    console.error('Error fetching agents:', agentError);
    return;
  }

  console.log(`Found ${agents.length} active agents`);

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, carrier, commission_rate');

  if (productError) {
    console.error('Error fetching products:', productError);
    return;
  }

  console.log(`Found ${products.length} products`);

  const { data: existingCustomers, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .limit(100);

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  console.log(`Found ${existingCustomers.length} existing customers`);

  const salesData = [];

  for (let i = 0; i < 80; i++) {
    const customer = randomItem(existingCustomers);
    const agent = randomItem(agents);
    const product = randomItem(products);
    const healthPremium = Math.floor(Math.random() * 300) + 100;
    const hasAddon = Math.random() > 0.7;
    const addonPremium = hasAddon ? Math.floor(Math.random() * 100) + 50 : 0;
    const totalPremium = healthPremium + addonPremium;
    const commissionRate = product.commission_rate || agent.commission_rate || 30;
    const healthCommission = (healthPremium * commissionRate) / 100;
    const addonCommission = (addonPremium * commissionRate) / 100;
    const totalCommission = healthCommission + addonCommission;

    salesData.push({
      id: `SALE${Date.now()}-${i}`,
      agent_id: agent.id,
      agency_id: agent.agency_id,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      customer_email: customer.email,
      product_name: product.name,
      health_premium: healthPremium,
      addon_premium: hasAddon ? addonPremium : null,
      total_premium: totalPremium,
      health_commission: healthCommission,
      addon_commission: hasAddon ? addonCommission : null,
      total_commission: totalCommission,
      is_split_sale: hasAddon
    });
  }

  console.log('Inserting sales...');
  const { data: insertedSales, error: salesInsertError } = await supabase
    .from('portal_sales')
    .insert(salesData)
    .select();

  if (salesInsertError) {
    console.error('Error inserting sales:', salesInsertError);
    console.error('Error details:', JSON.stringify(salesInsertError, null, 2));
  } else {
    console.log(`Inserted ${insertedSales.length} sales`);
  }

  console.log('\n=== TEST DATA SUMMARY ===');
  console.log(`Sales created: ${insertedSales?.length || 0}`);

  if (insertedSales && insertedSales.length > 0) {
    const agentBreakdown = {};
    insertedSales.forEach(sale => {
      if (!agentBreakdown[sale.agent_id]) {
        const agent = agents.find(a => a.id === sale.agent_id);
        agentBreakdown[sale.agent_id] = {
          name: agent?.name || 'Unknown',
          sales: 0
        };
      }
      agentBreakdown[sale.agent_id].sales += 1;
    });

    console.log('\n=== AGENT BREAKDOWN ===');
    Object.entries(agentBreakdown).forEach(([agentId, data]) => {
      console.log(`${data.name}: ${data.sales} sales`);
    });
  }

  console.log('\nTest data creation complete!');
}

addTestData().catch(console.error);