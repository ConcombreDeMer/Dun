const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(name, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', name), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (id) => {
      if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`);
      return dependencies[id];
    },
    console,
  }, { filename: name });
  return module.exports;
}

function query(result) {
  const q = {
    eq() { return q; },
    is() { return q; },
    select() { return q; },
    single: async () => result,
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return q;
}

test('profile patch rejects a matched update that returns no row', async () => {
  let selected = false;
  const supabase = {
    from: () => ({ update: () => ({ eq: () => ({
      select: () => { selected = true; return query({ error: new Error('No rows') }); },
    }) }) }),
  };
  const { supabaseProfileRepository } = loadModule('profileRepository.ts', { './supabase': { supabase } });
  await assert.rejects(supabaseProfileRepository.patch('user-1', { dailyEnabled: true }), /No rows/);
  assert.equal(selected, true);
});

test('order save stops after the first rejected row', async () => {
  const updated = [];
  const supabase = {
    from: () => ({ update: (patch) => {
      updated.push(patch.order);
      return query({ error: patch.order === 2 ? new Error('offline') : null });
    } }),
  };
  const { supabaseTaskOrderRepository } = loadModule('taskOrderRepository.ts', { './supabase': { supabase } });
  await assert.rejects(supabaseTaskOrderRepository.save('user-1', [
    { id: 1, order: 1 }, { id: 2, order: 2 }, { id: 3, order: 3 },
  ]), /offline/);
  assert.deepEqual(updated, [1, 2]);
});

test('tag replacement restores previous links after an insert failure', async () => {
  const inserted = [];
  let current = ['old-tag'];
  let insertCount = 0;
  const supabase = {
    from: (table) => {
      assert.equal(table, 'Task_Tags');
      return {
        select: () => query({ data: current.map((tag_id) => ({ tag_id })), error: null }),
        delete: () => { current = []; return query({ error: null }); },
        insert: async (rows) => {
          inserted.push(rows.map((row) => row.tag_id));
          insertCount += 1;
          if (insertCount === 1) return { error: { message: 'insert denied' } };
          current = rows.map((row) => row.tag_id);
          return { error: null };
        },
      };
    },
  };
  const { setTaskTags } = loadModule('tags.ts', {
    './supabase': { supabase },
    './plan': { FREE_TAG_LIMIT: 5, MAX_TAGS_PER_TASK: 3 },
  });
  await assert.rejects(setTaskTags(7, ['new-tag'], 'user-1'), /insert denied/);
  assert.equal(JSON.stringify(inserted), JSON.stringify([['new-tag'], ['old-tag']]));
  assert.equal(JSON.stringify(current), JSON.stringify(['old-tag']));
});

test('two tag saves for one task run in order and a failed second save restores the first', async () => {
  let current = ['original'];
  const operations = [];
  const supabase = {
    from: () => ({
      select: () => query({ data: current.map((tag_id) => ({ tag_id })), error: null }),
      delete: () => {
        operations.push('delete');
        current = [];
        return query({ error: null });
      },
      insert: async (rows) => {
        const ids = rows.map((row) => row.tag_id);
        operations.push(`insert:${ids.join(',')}`);
        if (ids[0] === 'second') return { error: new Error('second denied') };
        current = ids;
        return { error: null };
      },
    }),
  };
  const { setTaskTags } = loadModule('tags.ts', {
    './supabase': { supabase }, './plan': { FREE_TAG_LIMIT: 5, MAX_TAGS_PER_TASK: 3 },
  });
  const first = setTaskTags(7, ['first'], 'user-1');
  const second = setTaskTags(7, ['second'], 'user-1');
  await first;
  await assert.rejects(second, /second denied/);
  assert.equal(JSON.stringify(current), JSON.stringify(['first']));
  assert.equal(operations.join('|'), 'delete|insert:first|delete|insert:second|insert:first');
});

test('Daily deletion failure preserves task tags through the database cascade', async () => {
  const tables = [];
  const supabase = {
    from: (table) => {
      tables.push(table);
      assert.equal(table, 'Tasks');
      return {
        select: () => query({ data: { date: '2026-09-25' }, error: null }),
        delete: () => query({ data: null, error: new Error('delete denied') }),
      };
    },
  };
  const { deleteDailyPendingTask } = loadModule('daily.ts', {
    './date': { toAppDateKey: (value) => value, toDailyDateKey: () => '2026-09-26' },
    './supabase': { supabase },
    './tasks': {},
  });
  await assert.rejects(deleteDailyPendingTask(7, 'user-1'), /delete denied/);
  assert.equal(tables.join(','), 'Tasks,Tasks');
});

test('more than three tags is rejected before any write', async () => {
  let queried = false;
  const { setTaskTags } = loadModule('tags.ts', {
    './supabase': { supabase: { from: () => { queried = true; throw new Error('unexpected query'); } } },
    './plan': { FREE_TAG_LIMIT: 5, MAX_TAGS_PER_TASK: 3 },
  });
  await assert.rejects(setTaskTags(7, ['a', 'b', 'c', 'd'], 'user-1'), /3 tags/);
  assert.equal(queried, false);
});

test('day read propagates an error instead of returning an empty calendar', async () => {
  const supabase = {
    from: () => ({ select: () => ({ eq: () => ({
      order: async () => ({ data: null, error: new Error('offline') }),
    }) }) }),
  };
  const { supabaseDayRepository } = loadModule('dayRepository.ts', { './supabase': { supabase } });
  await assert.rejects(supabaseDayRepository.listAll('user-1'), /offline/);
});

test('task creation removes the new row when tag association fails', async () => {
  let rolledBack = false;
  const supabase = {
    from: (table) => {
      if (table === 'Profiles') return { select: () => query({ data: { lockPastDaysEnabled: false }, error: null }) };
      assert.equal(table, 'Tasks');
      return {
        select: () => query({ data: [], error: null }),
        insert: () => ({ select: () => query({ data: { id: 44 }, error: null }) }),
        delete: () => {
          rolledBack = true;
          return query({ data: { id: 44 }, error: null });
        },
      };
    },
  };
  const { createTask } = loadModule('tasks.ts', {
    './date': { getTodayAppDateKey: () => '2026-09-26', isPastAppDateKey: () => false, toAppDateKey: () => '2026-09-26' },
    './plan': { FREE_DAILY_TASK_LIMIT: 5 },
    './supabase': { supabase },
    './tags': { setTaskTags: async () => { throw new Error('tag insert failed'); }, copyTaskTags: async () => {} },
  });
  await assert.rejects(createTask({ name: 'Example', dateKey: null, tagIds: ['tag-1'], userId: 'user-1' }), /tag insert failed/);
  assert.equal(rolledBack, true);
});

test('task creation exposes the persisted ID when rollback fails', async () => {
  let taskStillExists = false;
  const supabase = {
    from: (table) => {
      if (table === 'Profiles') return { select: () => query({ data: { lockPastDaysEnabled: false }, error: null }) };
      assert.equal(table, 'Tasks');
      return {
        select: () => query({ data: [], error: null }),
        insert: () => {
          taskStillExists = true;
          return { select: () => query({ data: { id: 44 }, error: null }) };
        },
        delete: () => query({ data: null, error: new Error('rollback denied') }),
      };
    },
  };
  const { createTask, TaskCreationUncertainError } = loadModule('tasks.ts', {
    './date': { getTodayAppDateKey: () => '2026-09-26', isPastAppDateKey: () => false, toAppDateKey: () => '2026-09-26' },
    './plan': { FREE_DAILY_TASK_LIMIT: 5 },
    './supabase': { supabase },
    './tags': { setTaskTags: async () => { throw new Error('tag insert failed'); }, copyTaskTags: async () => {} },
  });
  await assert.rejects(
    createTask({ name: 'Example', dateKey: null, tagIds: ['tag-1'], userId: 'user-1' }),
    (error) => error instanceof TaskCreationUncertainError && error.createdTaskId === 44,
  );
  assert.equal(taskStillExists, true);
});

test('initial task insertion failure leaves no row and never writes tags', async () => {
  let tagsWritten = false;
  const supabase = {
    from: (table) => {
      if (table === 'Profiles') return { select: () => query({ data: { lockPastDaysEnabled: false }, error: null }) };
      assert.equal(table, 'Tasks');
      return {
        select: () => query({ data: [], error: null }),
        insert: () => ({ select: () => query({ data: null, error: new Error('insert denied') }) }),
      };
    },
  };
  const { createTask } = loadModule('tasks.ts', {
    './date': { getTodayAppDateKey: () => '2026-09-26', isPastAppDateKey: () => false, toAppDateKey: () => '2026-09-26' },
    './plan': { FREE_DAILY_TASK_LIMIT: 5 },
    './supabase': { supabase },
    './tags': { setTaskTags: async () => { tagsWritten = true; } },
  });
  await assert.rejects(createTask({ name: 'Draft', dateKey: null, tagIds: ['tag-1'], userId: 'user-1' }), /insert denied/);
  assert.equal(tagsWritten, false);
});

function reminderHarness() {
  const values = new Map();
  const native = new Map();
  const cancelled = [];
  let nextId = 0;
  let onSchedule = async () => {};
  let onCancel = async () => {};
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
  };
  const notifications = {
    setNotificationHandler() {},
    SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
    IosAuthorizationStatus: { PROVISIONAL: 'provisional' },
    getPermissionsAsync: async () => ({ granted: true }),
    getAllScheduledNotificationsAsync: async () => [...native.values()],
    scheduleNotificationAsync: async (request) => {
      nextId += 1;
      await onSchedule(nextId);
      const id = `new-${nextId}`;
      native.set(id, { identifier: id, ...request });
      return id;
    },
    cancelScheduledNotificationAsync: async (id) => {
      await onCancel(id);
      cancelled.push(id);
      native.delete(id);
    },
  };
  const service = loadModule('notificationService.ts', {
    '@react-native-async-storage/async-storage': storage,
    'expo-notifications': notifications,
    'react-native': { Platform: { OS: 'ios' } },
    './i18n': { i18n: { t: () => [{ title: 'A', body: 'B' }] } },
    './notificationLimits': {
      NOTIFICATION_REMINDER_LIMITS: { delayMinutes: { min: 1, max: 60 }, repetitions: { min: 1, max: 5 } },
      clampInteger: (value) => value,
      parseIntegerInput: (value) => {
        const parsed = Number.parseInt(`${value ?? ''}`, 10);
        return Number.isNaN(parsed) ? null : parsed;
      },
    },
  });
  return {
    service, values, native, cancelled,
    setOnSchedule: (callback) => { onSchedule = callback; },
    setOnCancel: (callback) => { onCancel = callback; },
  };
}

test('failed second notification keeps the old reminder and cleans the new one', async () => {
  const h = reminderHarness();
  h.values.set('scheduledReminderIds', JSON.stringify(['old-id']));
  h.native.set('old-id', { identifier: 'old-id', content: { data: {} } });
  h.setOnSchedule(async (number) => { if (number === 2) throw new Error('schedule denied'); });
  h.service.setReminderSessionUser('user-1');
  await assert.rejects(h.service.scheduleDailyReminder('user-1', 9, 0, true, '10', '1'), /schedule denied/);
  assert.equal(h.native.has('old-id'), true);
  assert.equal(h.native.has('new-1'), false);
  assert.equal(h.values.get('scheduledReminderIds'), JSON.stringify(['old-id']));
  assert.equal(h.values.get('reminderSyncPending:user-1'), '1');
});

test('failed old cancellation leaves tagged new reminder discoverable for recovery', async () => {
  const h = reminderHarness();
  h.values.set('scheduledReminderIds', JSON.stringify(['old-id']));
  h.native.set('old-id', { identifier: 'old-id', content: { data: {} } });
  let deny = true;
  h.setOnCancel(async (id) => { if (id === 'old-id' && deny) throw new Error('cancel denied'); });
  h.service.setReminderSessionUser('user-1');
  await assert.rejects(h.service.scheduleDailyReminder('user-1', 9, 0), /cancel denied/);
  assert.equal(h.native.get('new-1').content.data.dunDailyReminder, true);
  assert.equal(h.values.get('reminderSyncPending:user-1'), '1');
  deny = false;
  await h.service.cancelDailyReminder('user-1');
  assert.equal(h.native.size, 0);
  assert.equal(h.values.has('scheduledReminderIds'), false);
});

test('restart discovers a tagged reminder created before its ID was stored', async () => {
  const h = reminderHarness();
  h.native.set('orphan', {
    identifier: 'orphan', content: { data: { dunDailyReminder: true, userId: 'user-1', signature: 'old' } },
  });
  h.values.set('reminderSyncPending:user-1', '1');
  h.service.setReminderSessionUser('user-1');
  await h.service.scheduleDailyReminder('user-1', 9, 0);
  assert.equal(h.native.size, 1);
  assert.equal(h.native.has('orphan'), false);
  assert.equal(h.values.has('reminderSyncPending:user-1'), false);
});

test('account B clears A reminders even if A scheduling was in flight', async () => {
  const h = reminderHarness();
  let release;
  h.setOnSchedule(async (number) => {
    if (number === 1) await new Promise((resolve) => { release = resolve; });
  });
  h.service.setReminderSessionUser('user-A');
  const savingA = h.service.scheduleDailyReminder('user-A', 9, 0);
  for (let i = 0; i < 20 && !release; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof release, 'function');
  h.service.setReminderSessionUser('user-B');
  const cleanupB = h.service.reconcileReminderOwner('user-B');
  release();
  await assert.rejects(savingA, /compte a changé/);
  await cleanupB;
  assert.equal(h.native.size, 0);
  await h.service.scheduleDailyReminder('user-B', 10, 0);
  assert.equal(h.native.size, 1);
  assert.equal([...h.native.values()][0].content.data.userId, 'user-B');
});

test('account change clears existing A reminders without visiting home', async () => {
  const h = reminderHarness();
  h.service.setReminderSessionUser('user-A');
  await h.service.scheduleDailyReminder('user-A', 9, 0);
  assert.equal(h.native.size, 1);
  h.service.setReminderSessionUser('user-B');
  await h.service.reconcileReminderOwner('user-B');
  assert.equal(h.native.size, 0);
  await h.service.scheduleDailyReminder('user-B', 10, 0);
  assert.equal([...h.native.values()][0].content.data.userId, 'user-B');
});
