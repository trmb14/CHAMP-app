require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase REST client — works immediately, no TCP provisioning needed
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// Knex-compatible query builder shim backed by Supabase REST API.
// Supports the query patterns used in all CHAMP routes.
class QueryBuilder {
  constructor(table) {
    this._table = table;
    this._selects = '*';
    this._wheres = [];
    this._whereIns = [];
    this._whereNots = [];
    this._whereRaws = [];
    this._joins = [];
    this._orders = [];
    this._limitVal = null;
    this._operation = 'select';
    this._insertData = null;
    this._updateData = null;
    this._onConflict = null;
    this._mergeData = null;
    this._returning = null;
    this._distinctCols = null;
    this._countCol = null;
    this._sumCol = null;
    this._firstOnly = false;
    this._pluckCol = null;
  }

  select(...cols) {
    this._selects = cols.length === 1 && cols[0] === '*' ? '*' : cols.join(',');
    return this;
  }

  distinct(col) { this._distinctCols = col; return this; }
  pluck(col) { this._pluckCol = col; return this; }
  first() { this._firstOnly = true; return this; }
  limit(n) { this._limitVal = n; return this; }
  returning(cols) { this._returning = cols; return this; }

  where(colOrObj, opOrVal, val) {
    if (typeof colOrObj === 'object') {
      Object.entries(colOrObj).forEach(([k, v]) => this._wheres.push([k, 'eq', v]));
    } else if (val !== undefined) {
      // 3-argument form: where(col, operator, val)
      const opMap = { '>=': 'gte', '<=': 'lte', '>': 'gt', '<': 'lt', '=': 'eq', '!=': 'neq', '<>': 'neq' };
      this._wheres.push([colOrObj, opMap[opOrVal] || opOrVal, val]);
    } else {
      this._wheres.push([colOrObj, 'eq', opOrVal]);
    }
    return this;
  }

  whereNot(col, val) { this._whereNots.push([col, val]); return this; }
  whereNotNull(col) { this._wheres.push([col, 'not.is', null]); return this; }
  whereNull(col) { this._wheres.push([col, 'is', null]); return this; }
  whereIn(col, vals) { this._whereIns.push([col, vals]); return this; }
  whereRaw(sql, bindings) { this._whereRaws.push([sql, bindings]); return this; }

  join(table, col1, col2) { this._joins.push({ table, col1, col2 }); return this; }
  leftJoin(table, col1, col2) { this._joins.push({ table, col1, col2, type: 'left' }); return this; }

  orderBy(col, dir = 'asc') {
    this._orders.push({ col: col.includes('.') ? col.split('.')[1] : col, dir });
    return this;
  }

  count(col) { this._countCol = col; return this; }
  sum(col) { this._sumCol = col; return this; }

  insert(data) { this._operation = 'insert'; this._insertData = data; return this; }
  update(data) { this._operation = 'update'; this._updateData = data; return this; }
  del() { this._operation = 'delete'; return this; }

  onConflict(cols) {
    this._onConflict = Array.isArray(cols) ? cols : [cols];
    return this;
  }

  merge(data) { this._mergeData = data || this._insertData; return this; }

  async _execute() {
    const table = this._table;

    if (this._operation === 'insert') {
      const { data, error } = await supabase
        .from(table)
        .upsert(this._insertData, {
          onConflict: this._onConflict ? this._onConflict.join(',') : undefined,
          ignoreDuplicates: this._onConflict && !this._mergeData,
        })
        .select();
      if (error) throw new Error(`DB insert error (${table}): ${error.message}`);
      return this._returning ? data : data;
    }

    if (this._operation === 'update') {
      let q = supabase.from(table).update(this._updateData);
      q = this._applyWheres(q);
      const { data, error } = await q.select();
      if (error) throw new Error(`DB update error (${table}): ${error.message}`);
      return data;
    }

    if (this._operation === 'delete') {
      let q = supabase.from(table).delete();
      q = this._applyWheres(q);
      const { error } = await q;
      if (error) throw new Error(`DB delete error (${table}): ${error.message}`);
      return [];
    }

    // SELECT
    let q = supabase.from(table).select(this._selects);

    // Handle joins — Supabase supports embedded selects
    // For joined queries we fall back to individual queries and merge
    if (this._joins.length > 0) {
      return this._executeWithJoins();
    }

    q = this._applyWheres(q);

    for (const [col, vals] of this._whereIns) {
      q = q.in(col, vals);
    }
    for (const [col, val] of this._whereNots) {
      q = q.neq(col, val);
    }

    if (this._orders.length) {
      for (const o of this._orders) {
        q = q.order(o.col, { ascending: o.dir === 'asc' });
      }
    }
    if (this._limitVal) q = q.limit(this._limitVal);

    const { data, error } = await q;
    if (error) throw new Error(`DB select error (${table}): ${error.message}`);

    if (this._countCol) return [{ count: String(data?.length || 0) }];
    if (this._sumCol) {
      const col = this._sumCol.split(' as ')[0].trim().replace(/['"]/g, '').split('.').pop();
      const total = (data || []).reduce((s, r) => s + parseFloat(r[col] || 0), 0);
      return { total: total.toFixed(2) };
    }
    if (this._pluckCol) return (data || []).map(r => r[this._pluckCol]);
    if (this._firstOnly) return data?.[0] || undefined;
    if (this._distinctCols) {
      const seen = new Set();
      return (data || []).filter(r => {
        const key = r[this._distinctCols];
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    }
    return data || [];
  }

  _applyWheres(q) {
    for (const [col, op, val] of this._wheres) {
      const colName = col.includes('.') ? col.split('.').pop() : col;
      if (op === 'eq') q = val === null ? q.is(colName, null) : q.eq(colName, val);
      else if (op === 'not.is') q = q.not(colName, 'is', null);
      else if (op === 'is') q = q.is(colName, val);
      else if (op === 'gte') q = q.gte(colName, val);
      else if (op === 'lte') q = q.lte(colName, val);
      else if (op === 'gt') q = q.gt(colName, val);
      else if (op === 'lt') q = q.lt(colName, val);
      else if (op === 'neq') q = q.neq(colName, val);
      else if (op === 'like' || op === 'ilike') q = q.ilike(colName, val);
    }
    return q;
  }

  async _executeWithJoins() {
    // Fetch primary table — ordering deferred to after join merge because
    // ORDER BY columns may live on joined tables, not the primary table.
    let q = supabase.from(this._table).select('*');
    q = this._applyWheres(q);
    for (const [col, vals] of this._whereIns) q = q.in(col.split('.').pop(), vals);
    for (const [col, val] of this._whereNots) q = q.neq(col.split('.').pop(), val);
    // Only apply limit before join when there is no post-merge sort needed
    if (this._limitVal && !this._orders.length) q = q.limit(this._limitVal);

    const { data: rows, error } = await q;
    if (error) throw new Error(`DB join-select error (${this._table}): ${error.message}`);
    if (!rows || rows.length === 0) return this._firstOnly ? undefined : [];

    // Fetch joined table data for each join
    for (const join of this._joins) {
      const joinTable = join.table;
      const localCol = join.col1.includes('.') ? join.col1.split('.')[1] : join.col1;
      const foreignCol = join.col2.includes('.') ? join.col2.split('.')[1] : join.col2;

      // Determine which side is which
      const isLocalKey = localCol.endsWith('_id') || rows[0]?.[localCol] !== undefined;
      const keyOnMain = isLocalKey ? localCol : foreignCol;
      const keyOnJoined = isLocalKey ? foreignCol : localCol;

      const ids = [...new Set(rows.map(r => r[keyOnMain]).filter(Boolean))];
      if (ids.length === 0) continue;

      const { data: joinedRows } = await supabase.from(joinTable).select('*').in(keyOnJoined, ids);
      if (!joinedRows) continue;

      const SENSITIVE = new Set(['password_hash', 'password', 'secret', 'token']);
      const joinMap = Object.fromEntries(joinedRows.map(r => [r[keyOnJoined], r]));
      for (const row of rows) {
        const joined = joinMap[row[keyOnMain]];
        if (joined) {
          Object.keys(joined).forEach(k => {
            if (k !== 'id' && k !== 'created_at' && k !== 'updated_at' && !SENSITIVE.has(k)) {
              row[`${joinTable.replace(/s$/, '')}_${k}`] = joined[k];
            }
          });
          // Also copy with common alias patterns
          if (joinTable === 'users') {
            row.employee_name = joined.name;
            row.employee_position = joined.position;
            row.pay_rate = joined.pay_rate;
          }
          if (joinTable === 'clients') {
            row.client_name = joined.name;
            row.client_abbreviation = joined.abbreviation;
            row.client_address = joined.address;
            row.client_city = joined.city;
            row.client_province = joined.province;
            row.client_postal_code = joined.postal_code;
            row.client_phone = joined.phone;
            row.client_fax = joined.fax;
            row.client_contact_name = joined.contact_name;
          }
          if (joinTable === 'pay_periods') {
            row.start_date = joined.start_date;
            row.end_date = joined.end_date;
            row.period_status = joined.status;
          }
        }
      }
    }

    // Sort after merge so columns from joined tables are available
    if (this._orders.length) {
      rows.sort((a, b) => {
        for (const o of this._orders) {
          const aVal = a[o.col] ?? '';
          const bVal = b[o.col] ?? '';
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          if (cmp !== 0) return o.dir === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
      if (this._limitVal) rows.splice(this._limitVal);
    }

    if (this._firstOnly) return rows[0];
    if (this._countCol) return [{ count: String(rows.length) }];
    return rows;
  }

  then(resolve, reject) { return this._execute().then(resolve, reject); }
  catch(fn) { return this._execute().catch(fn); }
}

// db(table) returns a QueryBuilder — matches knex(table) API
function db(table) {
  return new QueryBuilder(table);
}

// db.raw for simple queries
db.raw = async (sql, bindings) => {
  // Handle count/sum pattern: SELECT count(*) FROM table
  const countMatch = sql.match(/SELECT\s+count\(\*\)\s+FROM\s+(\w+)/i);
  if (countMatch) {
    const { count, error } = await supabase.from(countMatch[1]).select('*', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return { rows: [{ count: String(count || 0) }] };
  }
  // For version check
  if (sql.trim().toLowerCase() === 'select 1') return { rows: [{ '?column?': 1 }] };
  throw new Error('db.raw not supported for: ' + sql);
};

db.destroy = () => Promise.resolve();
db.supabase = supabase;

module.exports = db;
