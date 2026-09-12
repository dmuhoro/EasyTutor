import { testLog } from './flowLogger';

type Row = Record<string, any>;
type TableName =
  | 'profiles'
  | 'subjects'
  | 'topics'
  | 'quiz_sessions'
  | 'user_progress'
  | 'cached_roadmaps'
  | 'user_events'
  | 'ai_feedback'
  | 'user_feedback'
  | 'knowledge_chunks'
  | 'document_chunks'
  | 'learning_goals'
  | 'documents'
  | 'business_clients'
  | 'operational_workflows'
  | 'operational_tasks'
  | 'workflow_memory'
  | 'business_referrals'
  | 'cluster_nodes'
  | 'billing_statements'
  | 'tenant_subscriptions'
  | 'product_deployments'
  | 'freelancer_proposals'
  | 'freelancer_projects'
  | 'freelancer_deliverables'
  | 'garage_repair_tickets'
  | 'garage_inventory'
  | 'garage_service_history'
  | 'sales_opportunities'
  | 'marketing_campaigns'
  | 'business_sla_timers'
  | 'user_activity_feed'
  | 'pilot_organizations'
  | 'user_activation_states'
  | 'market_feedback'
  | 'execution_checkpoints'
  | 'customers'
  | 'customer_interactions'
  | 'service_instances'
  | 'service_events';

type Db = Record<TableName, Row[]>;
type Failure = { table: string; action: string; error: Error };
type Filter = { column: string; op: 'eq' | 'ilike' | 'lt'; value: any };

export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createSeedDb(): Db {
  return {
    profiles: [
      {
        id: TEST_USER_ID,
        email: 'student@example.com',
        xp_total: 0,
        level: 1,
        onboarding_complete: true,
      },
    ],
    subjects: [
      {
        id: 'hs-math',
        name: 'Mathematics',
        icon: 'calculator',
        level: 'high_school',
        description: 'KCSE Mathematics',
        kicd_ref: 'KICD/MAT/001',
      },
      {
        id: 'HS-MATH',
        name: 'Mathematics',
        icon: 'calculator',
        level: 'high_school',
        description: 'KCSE Mathematics',
      },
      {
        id: 'uni-engineering',
        name: 'Engineering',
        icon: 'hammer',
        level: 'university',
        description: 'Degree-level Engineering',
      },
      {
        id: 'sd-computer-science',
        name: 'Computer Science Pro',
        icon: 'code-slash',
        level: 'self_directed',
        description: 'Self-directed computer science',
      },
    ],
    topics: [
      {
        id: '22222222-2222-4222-8222-222222222222', // Still a UUID in DB, but matches a lookup
        subject_id: 'hs-math',
        title: 'Linear Equations',
        sort_order: 1,
      },
      {
        id: 'ALG-001',
        subject_id: 'HS-MATH',
        title: 'Linear Equations',
        sort_order: 1,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        subject_id: 'uni-engineering',
        title: 'Calculus I',
        sort_order: 1,
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        subject_id: 'sd-computer-science',
        title: 'Introduction to Programming',
        sort_order: 1,
      },
    ],
    quiz_sessions: [],
    user_progress: [],
    cached_roadmaps: [],
    user_events: [],
    ai_feedback: [],
    user_feedback: [],
    knowledge_chunks: [
      {
        id: 'chunk-1',
        canonical_id: 'HS-HS-MATH-ALG-001',
        portal_type: 'high_school',
        content: 'Algebra context'
      },
      {
        id: 'chunk-tenant-mkt',
        canonical_id: 'tenant_mkt',
        portal_type: 'high_school',
        content: 'Marketing context'
      }
    ],
    document_chunks: [],
    documents: [],
    learning_goals: [],
    business_clients: [],
    operational_workflows: [],
    operational_tasks: [],
    workflow_memory: [],
    business_referrals: [],
    cluster_nodes: [],
    billing_statements: [],
    tenant_subscriptions: [],
    product_deployments: [],
    freelancer_proposals: [],
    freelancer_projects: [],
    freelancer_deliverables: [],
    garage_repair_tickets: [],
    garage_inventory: [],
    garage_service_history: [],
    sales_opportunities: [],
    marketing_campaigns: [],
    business_sla_timers: [],
    user_activity_feed: [],
    pilot_organizations: [],
    user_activation_states: [],
    market_feedback: [],
    execution_checkpoints: [],
    customers: [],
    customer_interactions: [],
    service_instances: [],
    service_events: []
  };
}

function validateRequiredWrite(table: string, row: Row): Error | null {
  if (table === 'quiz_sessions' || table === 'user_progress') {
    if (!row.user_id) return new Error(`${table}.user_id is required`);
    if (!row.subject_id) return new Error(`${table}.subject_id is required`);
    if (!row.topic_id) return new Error(`${table}.topic_id is required`);
    if (!uuidPattern.test(row.topic_id)) return new Error(`${table}.topic_id must be a UUID`);
  }

  if (row.subject_id && !mockSupabase.db.subjects.some((subject) => subject.id === row.subject_id)) {
    return new Error(`${table}.subject_id does not reference subjects.id: ${row.subject_id}`);
  }

  if (row.topic_id && !mockSupabase.db.topics.some((topic) => topic.id === row.topic_id)) {
    return new Error(`${table}.topic_id does not reference topics.id: ${row.topic_id}`);
  }

  return null;
}

class QueryBuilder {
  private filters: Filter[] = [];
  private limitCount: number | null = null;
  private orders: { column: string; ascending: boolean }[] = [];

  constructor(private readonly table: TableName) {}

  select(_columns = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  ilike(column: string, value: any) {
    this.filters.push({ column, op: 'ilike', value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, op: 'lt' as any, value });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  maybeSingle() {
    const result = this.executeSelect();
    if (result.error) return result;
    return { data: result.data[0] ?? null, error: null };
  }

  async insert(payload: Row | Row[]) {
    return this.write('insert', payload);
  }

  async upsert(payload: Row | Row[], options?: { onConflict?: string }) {
    return this.write('upsert', payload, options);
  }

  update(payload: Row) {
    return {
      eq: async (column: string, value: any) => {
        this.filters.push({ column, op: 'eq', value });
        return this.updateRows(payload);
      },
    };
  }

  then(resolve: (value: any) => void) {
    resolve(this.executeSelect());
  }

  private applyFilters(rows: Row[]) {
    let next = rows;
    for (const filter of this.filters) {
      next = next.filter((row) => {
        if (filter.op === 'eq') return row[filter.column] === filter.value;
        if (filter.op === 'lt') return row[filter.column] < filter.value;
        return String(row[filter.column] ?? '').toLowerCase() === String(filter.value).toLowerCase();
      });
    }
    if (this.orders.length > 0) {
      next = [...next].sort((a, b) => {
        for (const { column, ascending } of this.orders) {
          const left = a[column];
          const right = b[column];
          if (left === right) continue;
          const result = left < right ? -1 : 1;
          return ascending ? result : -result;
        }
        return 0;
      });
    }
    if (this.limitCount !== null) next = next.slice(0, this.limitCount);
    return next;
  }

  private executeSelect() {
    const failure = mockSupabase.getFailure(this.table, 'select');
    if (failure) {
      testLog('[TEST_FAILURE]', 'select failed', { table: this.table, error: failure.message });
      return { data: null, error: failure };
    }

    return { data: clone(this.applyFilters(mockSupabase.db[this.table])), error: null };
  }

  private async write(action: 'insert' | 'upsert', payload: Row | Row[], options?: { onConflict?: string }) {
    const failure = mockSupabase.getFailure(this.table, action);
    const rows = Array.isArray(payload) ? payload : [payload];
    testLog('[TEST_DB_WRITE]', `${action}:${this.table}`, { rows });

    if (failure) {
      testLog('[TEST_FAILURE]', `${action} failed`, { table: this.table, error: failure.message });
      return { data: null, error: failure };
    }

    for (const row of rows) {
      const validationError = validateRequiredWrite(this.table, row);
      if (validationError) {
        testLog('[TEST_FAILURE]', `${action} rejected invalid payload`, {
          table: this.table,
          error: validationError.message,
          row,
        });
        return { data: null, error: validationError };
      }
    }

    if (action === 'upsert') {
      const conflictColumns = options?.onConflict?.split(',').map((key) => key.trim()).filter(Boolean);
      for (const row of rows) {
        const conflictIndex = mockSupabase.db[this.table].findIndex((existing) => {
          // When governedWrites provides an onConflict key set, use it strictly.
          if (conflictColumns && conflictColumns.length > 0) {
            return conflictColumns.every((key) => row[key] === existing[key]);
          }

          // Fallback to legacy heuristics
          if (row.user_id && row.topic_id && existing.user_id === row.user_id && existing.topic_id === row.topic_id) return true;
          if (row.tenant_id && row.product_id && existing.tenant_id === row.tenant_id && existing.product_id === row.product_id) return true;
          if (row.id && existing.id === row.id) return true;
          return false;
        });

        if (conflictIndex >= 0) mockSupabase.db[this.table][conflictIndex] = { ...mockSupabase.db[this.table][conflictIndex], ...clone(row) };
        else mockSupabase.db[this.table].push(clone(row));
      }
    } else {
      mockSupabase.db[this.table].push(...clone(rows));
    }

    return { data: clone(rows), error: null };
  }

  private async updateRows(payload: Row) {
    const failure = mockSupabase.getFailure(this.table, 'update');
    testLog('[TEST_DB_WRITE]', `update:${this.table}`, { payload, filters: this.filters });

    if (failure) {
      testLog('[TEST_FAILURE]', 'update failed', { table: this.table, error: failure.message });
      return { data: null, error: failure };
    }

    const rows = this.applyFilters(mockSupabase.db[this.table]);
    rows.forEach((row) => Object.assign(row, clone(payload)));
    return { data: clone(rows), error: null };
  }
}

export const mockSupabase = {
  db: createSeedDb(),
  writes: [] as Array<{ table: string; action: string; payload: Row | Row[] }>,
  failures: [] as Failure[],
  rpcResults: {} as Record<string, { data: unknown; error?: { message: string } }>,
  user: {
    id: TEST_USER_ID,
    email: 'student@example.com',
  },
  client: {
    auth: {
      getUser: async () => ({
        data: { user: mockSupabase.user },
        error: null,
      }),
      signUp: async () => ({ data: { user: mockSupabase.user }, error: null }),
      signInWithPassword: async () => ({ data: { user: mockSupabase.user }, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => undefined,
          },
        },
      }),
    },
    rpc: async (name: string) => mockSupabase.rpcResults[name] ?? { data: [], error: null },
    from: (table: TableName) => new QueryBuilder(table),
  },
  reset() {
    this.db = createSeedDb();
    this.writes = [];
    this.failures = [];
    this.rpcResults = {};
    this.user = {
      id: TEST_USER_ID,
      email: 'student@example.com',
    };
  },
  setRpcResult(name: string, data: unknown) {
    this.rpcResults[name] = { data };
  },
  failRpc(name: string, message: string) {
    this.rpcResults[name] = { data: null, error: { message } };
  },
  failNext(table: string, action: string, message: string) {
    this.failures.push({ table, action, error: new Error(message) });
  },
  getFailure(table: string, action: string) {
    const index = this.failures.findIndex((failure) => failure.table === table && failure.action === action);
    if (index < 0) return null;
    return this.failures.splice(index, 1)[0].error;
  },
};
