import { supabase } from '../config/supabase.js';

export const csvExportService = {
  /**
   * Fetches full scrape log history and generates CSV formatted per assessment requirements.
   * Format: Store Product ID,Product Name,Selected Option,Timestamp (UTC),Price,Stock,Outcome
   * Failed attempts must leave price and stock empty.
   */
  async generateHistoryCSV() {
    const { data: logs, error } = await supabase
      .from('scrape_logs')
      .select('store_product_id, product_name, selected_option, timestamp, price, stock, outcome')
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const headers = ['Store Product ID', 'Product Name', 'Selected Option', 'Timestamp (UTC)', 'Price', 'Stock', 'Outcome'];
    const rows = [headers.join(',')];

    (logs || []).forEach((row) => {
      const storeId = escapeCSV(row.store_product_id);
      const name = escapeCSV(row.product_name);
      const option = escapeCSV(row.selected_option);
      const timestamp = row.timestamp ? new Date(row.timestamp).toISOString() : '';
      
      // If failed, price and stock MUST be left completely empty
      const price = (row.outcome === 'failed' || row.price === null) ? '' : row.price;
      const stock = (row.outcome === 'failed' || row.price === null) ? '' : escapeCSV(row.stock || '');
      const outcome = escapeCSV(row.outcome);

      rows.push([storeId, name, option, timestamp, price, stock, outcome].join(','));
    });

    return rows.join('\r\n');
  }
};

function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
