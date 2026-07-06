// A minimal in-memory Firestore double covering exactly the surface the WS-4
// functions touch: doc/collection paths, get, set (merge), add (auto-id),
// delete, limit, where-range queries, batch, and runTransaction. It is NOT a
// general Firestore emulator — it implements only what these tests exercise.
//
// Documents are stored flat by path ("rotations/GS/students/s1"). Collection
// membership is derived by prefix so subcollection queries work.

type Data = Record<string, unknown>;

export interface FakeDocSnap {
  id: string;
  ref: FakeDocRef;
  exists: boolean;
  data(): Data | undefined;
  get(field: string): unknown;
}

interface WhereClause {
  field: string;
  op: "==" | ">=" | "<";
  value: unknown;
}

let autoIdCounter = 0;

export class FakeFirestore {
  // path -> document data. Absence of a key means the doc does not exist.
  store = new Map<string, Data>();

  collection(path: string): FakeCollectionRef {
    return new FakeCollectionRef(this, path);
  }

  batch(): FakeWriteBatch {
    return new FakeWriteBatch(this);
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    // No real isolation — tests drive concurrency deterministically by awaiting.
    const tx = new FakeTransaction(this);
    return fn(tx);
  }
}

export class FakeDocRef {
  constructor(public db: FakeFirestore, public path: string) {}

  get id(): string {
    return this.path.slice(this.path.lastIndexOf("/") + 1);
  }

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(this.db, `${this.path}/${name}`);
  }

  async get(): Promise<FakeDocSnap> {
    return snapForPath(this.db, this.path);
  }

  async set(data: Data, options?: { merge?: boolean }): Promise<void> {
    const prev = this.db.store.get(this.path);
    this.db.store.set(this.path, options?.merge && prev ? { ...prev, ...data } : { ...data });
  }

  async update(data: Data): Promise<void> {
    const prev = this.db.store.get(this.path) ?? {};
    this.db.store.set(this.path, { ...prev, ...data });
  }

  async delete(): Promise<void> {
    this.db.store.delete(this.path);
  }
}

export class FakeCollectionRef {
  clauses: WhereClause[] = [];
  limitN: number | null = null;

  constructor(public db: FakeFirestore, public path: string) {}

  doc(id?: string): FakeDocRef {
    const docId = id ?? `auto_${++autoIdCounter}`;
    return new FakeDocRef(this.db, `${this.path}/${docId}`);
  }

  async add(data: Data): Promise<FakeDocRef> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }

  where(field: string, op: WhereClause["op"], value: unknown): FakeCollectionRef {
    const next = new FakeCollectionRef(this.db, this.path);
    next.clauses = [...this.clauses, { field, op, value }];
    next.limitN = this.limitN;
    return next;
  }

  limit(n: number): FakeCollectionRef {
    const next = new FakeCollectionRef(this.db, this.path);
    next.clauses = [...this.clauses];
    next.limitN = n;
    return next;
  }

  async get(): Promise<{ empty: boolean; size: number; docs: FakeDocSnap[] }> {
    const prefix = `${this.path}/`;
    let docs = [...this.db.store.keys()]
      // Direct children only (no deeper subcollection docs).
      .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
      .map((p) => snapForPath(this.db, p));

    for (const c of this.clauses) {
      docs = docs.filter((d) => matches(d.data()?.[c.field], c.op, c.value));
    }
    if (this.limitN != null) docs = docs.slice(0, this.limitN);
    return { empty: docs.length === 0, size: docs.length, docs };
  }
}

export class FakeWriteBatch {
  private ops: Array<() => void> = [];
  constructor(private db: FakeFirestore) {}
  delete(ref: FakeDocRef): void {
    this.ops.push(() => this.db.store.delete(ref.path));
  }
  set(ref: FakeDocRef, data: Data): void {
    this.ops.push(() => this.db.store.set(ref.path, { ...data }));
  }
  async commit(): Promise<void> {
    this.ops.forEach((op) => op());
    this.ops = [];
  }
}

export class FakeTransaction {
  constructor(private db: FakeFirestore) {}
  // Mirrors the Admin SDK's Transaction.get overloads: DocumentReference |
  // Query (CollectionReference extends Query) — onStudentWrite's seeding path
  // reads the students collection inside the transaction.
  async get(ref: FakeDocRef): Promise<FakeDocSnap>;
  async get(ref: FakeCollectionRef): Promise<{ empty: boolean; size: number; docs: FakeDocSnap[] }>;
  async get(ref: FakeDocRef | FakeCollectionRef): Promise<FakeDocSnap | { empty: boolean; size: number; docs: FakeDocSnap[] }> {
    if (ref instanceof FakeCollectionRef) return ref.get();
    return snapForPath(this.db, ref.path);
  }
  update(ref: FakeDocRef, data: Data): void {
    const prev = this.db.store.get(ref.path) ?? {};
    this.db.store.set(ref.path, { ...prev, ...data });
  }
  set(ref: FakeDocRef, data: Data, options?: { merge?: boolean }): void {
    const prev = this.db.store.get(ref.path);
    this.db.store.set(ref.path, options?.merge && prev ? { ...prev, ...data } : { ...data });
  }
}

function snapForPath(db: FakeFirestore, path: string): FakeDocSnap {
  const data = db.store.get(path);
  return {
    id: path.slice(path.lastIndexOf("/") + 1),
    ref: new FakeDocRef(db, path),
    exists: data !== undefined,
    data: () => data,
    get: (field: string) => data?.[field],
  };
}

function matches(actual: unknown, op: WhereClause["op"], value: unknown): boolean {
  if (op === "==") return actual === value;
  if (op === ">=") return (actual as never) >= (value as never);
  if (op === "<") return (actual as never) < (value as never);
  return false;
}
