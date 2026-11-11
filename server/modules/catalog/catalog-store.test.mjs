import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogStore } from "./catalog-store.mjs";

function fakeDatabase() {
  let rows = [];
  let failNextInsert = false;
  const transaction = {
    delete: () =>
      Promise.resolve().then(() => {
        rows = [];
      }),
    insert: () => ({
      values: async (values) => {
        if (failNextInsert) {
          failNextInsert = false;
          throw new Error("insert failed");
        }
        rows.push(...values);
      },
    }),
  };
  return {
    failNextInsert() {
      failNextInsert = true;
    },
    async transaction(work) {
      const before = rows;
      rows = [...rows];
      try {
        return await work(transaction);
      } catch (error) {
        rows = before;
        throw error;
      }
    },
    select: () => ({
      from() {
        return this;
      },
      async orderBy() {
        return rows.toSorted((left, right) => left.position - right.position).map(({ payload }) => ({ payload }));
      },
    }),
  };
}

test("replaces the persisted catalog and returns scenarios in source order", async () => {
  const database = fakeDatabase();
  const store = createCatalogStore(() => database);
  const first = { key: "auth.feature:2", id: "TEN_AUT_E2E_001", module: "auth", file: "auth.feature", line: 2 };
  const second = { key: "users.feature:7", id: "TEN_USR_E2E_001", module: "users", file: "users.feature", line: 7 };

  await store.replace([first, second]);
  assert.deepEqual(await store.list(), [first, second]);

  const replacement = {
    key: "users.feature:9",
    id: "TEN_USR_E2E_002",
    module: "users",
    file: "users.feature",
    line: 9,
  };
  await store.replace([replacement]);
  assert.deepEqual(await store.list(), [replacement]);
});

test("an unsuccessful replacement preserves the previous catalog", async () => {
  const database = fakeDatabase();
  const store = createCatalogStore(() => database);
  const current = { key: "auth.feature:2", id: "TEN_AUT_E2E_001", module: "auth", file: "auth.feature", line: 2 };
  await store.replace([current]);
  database.failNextInsert();

  await assert.rejects(store.replace([{ ...current, title: "replacement" }]), /insert failed/);
  assert.deepEqual(await store.list(), [current]);
});
