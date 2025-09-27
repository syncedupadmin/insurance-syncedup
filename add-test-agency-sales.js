import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function addTestAgencySales() {
  const { data: testAgents } = await supabase
    .from('portal_agents')
    .select('*')
    .in('agency_id', ['test-agency-001', 'test-agency-002']);

  if (!testAgents || testAgents.length === 0) {
    console.log('No test agency agents found');
    return;
  }

  console.log(`Found ${testAgents.length} test agents\n`);

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .limit(50);

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .limit(25);

  const salesData = [];

  for (let i = 0; i < 40; i++) {
    const agent = randomItem(testAgents);
    const customer = randomItem(customers);
    const product = randomItem(products);

    const healthPremium = Math.floor(Math.random() * 300) + 100;
    const hasAddon = Math.random() > 0.7;
    const addonPremium = hasAddon ? Math.floor(Math.random() * 100) + 50 : 0;
    const totalPremium = healthPremium + addonPremium;
    const commissionRate = agent.commission_rate || 30;
    const healthCommission = (healthPremium * commissionRate) / 100;
    const addonCommission = (addonPremium * commissionRate) / 100;
    const totalCommission = healthCommission + addonCommission;

    salesData.push({
      id: `TESTSALE${Date.now()}-${i}`,
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
      is_split_sale: hasAddon,
      sale_date: randomDate(new Date(2024, 8, 1), new Date()).toISOString()
    });
  }

  const { data: insertedSales, error } = await supabase
    .from('portal_sales')
    .insert(salesData)
    .select();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`✅ Created ${insertedSales.length} sales for test agencies\n`);

  const breakdown = {};
  insertedSales.forEach(sale => {
    const agent = testAgents.find(a => a.id === sale.agent_id);
    if (!breakdown[agent.email]) {
      breakdown[agent.email] = { sales: 0, revenue: 0, commissions: 0 };
    }
    breakdown[agent.email].sales++;
    breakdown[agent.email].revenue += sale.total_premium;
    breakdown[agent.email].commissions += sale.total_commission;
  });

  console.log('Sales breakdown:');
  Object.entries(breakdown).forEach(([email, stats]) => {
    console.log(`  ${email}: ${stats.sales} sales, $${stats.revenue.toFixed(2)} revenue, $${stats.commissions.toFixed(2)} commissions`);
  });
}

addTestAgencySales();