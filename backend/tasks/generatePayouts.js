const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Konfiguration
const PER_ORDER_FEE = 4500; // 45 kr i öre
const PERCENT_FEE = 0.05; // 5%

class PayoutGenerator {
  constructor() {
    this.dbPath = path.join(__dirname, "..", "orders.sqlite");
    this.db = new sqlite3.Database(this.dbPath);
    this.exportsDir = path.join(__dirname, "..", "exports");
    
    // Skapa exports-katalog om den inte finns
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  // Huvudfunktion för att generera payouts
  async generatePayouts(fromDate, toDate) {
    try {
      console.log(`Genererar payouts från ${fromDate} till ${toDate}`);
      
      // Hämta alla restauranger
      const restaurants = await this.getRestaurants();
      console.log(`Hittade ${restaurants.length} restauranger: ${restaurants.join(', ')}`);
      
      const results = [];
      
      for (const restaurantSlug of restaurants) {
        console.log(`\nBearbetar ${restaurantSlug}...`);
        const result = await this.processRestaurant(restaurantSlug, fromDate, toDate);
        results.push(result);
      }
      
      console.log('\n=== PAYOUT SAMMANFATTNING ===');
      results.forEach(result => {
        console.log(`${result.restaurantSlug}: ${result.ordersCount} ordrar, ${(result.grossRevenue / 100).toFixed(2)} kr brutto, ${(result.netAmount / 100).toFixed(2)} kr netto`);
      });
      
      return results;
      
    } catch (error) {
      console.error('Fel vid generering av payouts:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  // Hämta alla unika restauranger
  async getRestaurants() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT DISTINCT restaurant_slug FROM orders WHERE restaurant_slug IS NOT NULL';
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows.map(row => row.restaurant_slug));
      });
    });
  }

  // Bearbeta en specifik restaurang
  async processRestaurant(restaurantSlug, fromDate, toDate) {
    // Hämta ordrar för perioden
    const orders = await this.getOrdersForPeriod(restaurantSlug, fromDate, toDate);
    
    if (orders.length === 0) {
      console.log(`Inga ordrar för ${restaurantSlug} under perioden`);
      return {
        restaurantSlug,
        ordersCount: 0,
        grossRevenue: 0,
        perOrderFee: 0,
        percentFee: 0,
        netAmount: 0
      };
    }

    // Beräkna avgifter
    const grossRevenue = orders.reduce((sum, order) => sum + order.grand_total, 0);
    const ordersCount = orders.length;
    const perOrderFeeTotal = ordersCount * PER_ORDER_FEE;
    const percentFeeTotal = Math.round(grossRevenue * PERCENT_FEE);
    const totalFees = perOrderFeeTotal + percentFeeTotal;
    const netAmount = grossRevenue - totalFees;

    // Skapa export-filer
    await this.createExportFiles(restaurantSlug, fromDate, toDate, orders, {
      ordersCount,
      grossRevenue,
      perOrderFeeTotal,
      percentFeeTotal,
      netAmount
    });

    // Spara payout i databasen
    await this.savePayout(restaurantSlug, fromDate, toDate, {
      ordersCount,
      grossRevenue,
      perOrderFeeTotal,
      percentFeeTotal,
      netAmount
    });

    console.log(`${restaurantSlug}: ${ordersCount} ordrar, ${(grossRevenue / 100).toFixed(2)} kr brutto, ${(totalFees / 100).toFixed(2)} kr avgifter, ${(netAmount / 100).toFixed(2)} kr netto`);

    return {
      restaurantSlug,
      ordersCount,
      grossRevenue,
      perOrderFee: perOrderFeeTotal,
      percentFee: percentFeeTotal,
      netAmount
    };
  }

  // Hämta ordrar för en period
  async getOrdersForPeriod(restaurantSlug, fromDate, toDate) {
    return new Promise((resolve, reject) => {
      const fromTimestamp = new Date(fromDate).getTime();
      const toTimestamp = new Date(toDate + 'T23:59:59.999Z').getTime();
      
      const sql = `
        SELECT id, customer_name, grand_total, created_at, status
        FROM orders 
        WHERE restaurant_slug = ? 
          AND created_at >= ? 
          AND created_at <= ?
        ORDER BY created_at ASC
      `;
      
      this.db.all(sql, [restaurantSlug, fromTimestamp, toTimestamp], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  // Skapa CSV och JSON export-filer
  async createExportFiles(restaurantSlug, fromDate, toDate, orders, summary) {
    const periodDir = path.join(this.exportsDir, restaurantSlug);
    if (!fs.existsSync(periodDir)) {
      fs.mkdirSync(periodDir, { recursive: true });
    }

    const yearMonth = fromDate.substring(0, 7); // YYYY-MM
    const csvPath = path.join(periodDir, `${yearMonth}.csv`);
    const jsonPath = path.join(periodDir, `${yearMonth}.json`);

    // Skapa CSV
    const csvContent = this.generateCSV(orders, summary);
    fs.writeFileSync(csvPath, csvContent, { mode: 0o600 });

    // Skapa JSON
    const jsonContent = this.generateJSON(orders, summary, fromDate, toDate);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2), { mode: 0o600 });

    console.log(`Exporterade filer för ${restaurantSlug}:`);
    console.log(`  CSV: ${csvPath}`);
    console.log(`  JSON: ${jsonPath}`);
  }

  // Generera CSV-innehåll
  generateCSV(orders, summary) {
    const lines = [];
    
    // Header
    lines.push('order_id,customer_name,created_at,grand_total_öre,grand_total_kr');
    
    // Data
    orders.forEach(order => {
      const date = new Date(order.created_at).toISOString().replace('T', ' ').substring(0, 19);
      lines.push(`${order.id},"${order.customer_name}",${date},${order.grand_total},${(order.grand_total / 100).toFixed(2)}`);
    });
    
    // Sammanfattning
    lines.push('');
    lines.push('SAMMANFATTNING');
    lines.push(`Antal ordrar,${summary.ordersCount}`);
    lines.push(`Bruttot (öre),${summary.grossRevenue}`);
    lines.push(`Bruttot (kr),${(summary.grossRevenue / 100).toFixed(2)}`);
    lines.push(`Per order avgift (öre),${summary.perOrderFee}`);
    lines.push(`Per order avgift (kr),${(summary.perOrderFee / 100).toFixed(2)}`);
    lines.push(`Procentuell avgift (öre),${summary.percentFee}`);
    lines.push(`Procentuell avgift (kr),${(summary.percentFee / 100).toFixed(2)}`);
    lines.push(`Total avgift (öre),${summary.perOrderFee + summary.percentFee}`);
    lines.push(`Total avgift (kr),${((summary.perOrderFee + summary.percentFee) / 100).toFixed(2)}`);
    lines.push(`Netto (öre),${summary.netAmount}`);
    lines.push(`Netto (kr),${(summary.netAmount / 100).toFixed(2)}`);
    
    return lines.join('\n');
  }

  // Generera JSON-innehåll
  generateJSON(orders, summary, fromDate, toDate) {
    return {
      restaurant_slug: orders[0]?.restaurant_slug || 'unknown',
      period: {
        start: fromDate,
        end: toDate
      },
      summary: {
        orders_count: summary.ordersCount,
        gross_revenue_öre: summary.grossRevenue,
        gross_revenue_kr: parseFloat((summary.grossRevenue / 100).toFixed(2)),
        per_order_fee_öre: summary.perOrderFee,
        per_order_fee_kr: parseFloat((summary.perOrderFee / 100).toFixed(2)),
        percent_fee_öre: summary.percentFee,
        percent_fee_kr: parseFloat((summary.percentFee / 100).toFixed(2)),
        total_fees_öre: summary.perOrderFee + summary.percentFee,
        total_fees_kr: parseFloat(((summary.perOrderFee + summary.percentFee) / 100).toFixed(2)),
        net_amount_öre: summary.netAmount,
        net_amount_kr: parseFloat((summary.netAmount / 100).toFixed(2))
      },
      orders: orders.map(order => ({
        id: order.id,
        customer_name: order.customer_name,
        created_at: new Date(order.created_at).toISOString(),
        grand_total_öre: order.grand_total,
        grand_total_kr: parseFloat((order.grand_total / 100).toFixed(2)),
        status: order.status
      })),
      generated_at: new Date().toISOString()
    };
  }

  // Spara payout i databasen
  async savePayout(restaurantSlug, fromDate, toDate, summary) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO payouts (
          restaurant_slug, period_start, period_end, orders_count,
          gross_revenue, per_order_fee, percent_fee, net_amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const now = Date.now();
      this.db.run(sql, [
        restaurantSlug,
        fromDate,
        toDate,
        summary.ordersCount,
        summary.grossRevenue,
        summary.perOrderFee,
        summary.percentFee,
        summary.netAmount,
        now
      ], function(err) {
        if (err) {
          reject(err);
          return;
        }
        console.log(`Payout sparad i databas med ID: ${this.lastID}`);
        resolve(this.lastID);
      });
    });
  }
}

// CLI-hantering
function parseArguments() {
  const args = process.argv.slice(2);
  let fromDate, toDate;

  args.forEach(arg => {
    if (arg.startsWith('--from=')) {
      fromDate = arg.split('=')[1];
    } else if (arg.startsWith('--to=')) {
      toDate = arg.split('=')[1];
    }
  });

  // Default: senaste 30 dagarna
  if (!fromDate || !toDate) {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    fromDate = fromDate || thirtyDaysAgo.toISOString().split('T')[0];
    toDate = toDate || today.toISOString().split('T')[0];
  }

  return { fromDate, toDate };
}

// Huvudfunktion
async function main() {
  try {
    const { fromDate, toDate } = parseArguments();
    
    console.log('=== ANNOS PAYOUT GENERATOR ===');
    console.log(`Period: ${fromDate} till ${toDate}`);
    console.log(`Avgifter: ${PER_ORDER_FEE / 100} kr per order + ${(PERCENT_FEE * 100)}% av bruttot`);
    console.log('');
    
    const generator = new PayoutGenerator();
    const results = await generator.generatePayouts(fromDate, toDate);
    
    const totalOrders = results.reduce((sum, r) => sum + r.ordersCount, 0);
    const totalGross = results.reduce((sum, r) => sum + r.grossRevenue, 0);
    const totalNet = results.reduce((sum, r) => sum + r.netAmount, 0);
    
    console.log('\n=== TOTALT ===');
    console.log(`Antal ordrar: ${totalOrders}`);
    console.log(`Bruttot: ${(totalGross / 100).toFixed(2)} kr`);
    console.log(`Netto: ${(totalNet / 100).toFixed(2)} kr`);
    console.log(`Avgifter: ${((totalGross - totalNet) / 100).toFixed(2)} kr`);
    
    console.log('\nPayout-generering slutförd!');
    
  } catch (error) {
    console.error('Fel:', error.message);
    process.exit(1);
  }
}

// Kör om scriptet körs direkt
if (require.main === module) {
  main();
}

module.exports = { PayoutGenerator };
