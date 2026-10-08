/** PROD-007: wire contract only; not connected to screens, storage or cloud. */
export type Id = string;
export type DateKey = string; // Gregorian YYYY-MM-DD, validated at the boundary.
export type Instant = string; // UTC ISO 8601 with milliseconds.
export type Revision = string; // Decimal server integer: never coerce bigint to JS number.

export interface Entity {
  id: Id;
  spaceId: Id;
  createdAt: Instant;
  updatedAt: Instant;
  deletedAt: Instant | null;
  serverRevision: Revision | null;
}
export interface Task extends Entity {
  name: string;
  description: string;
  day: DateKey | null;
  order: number;
  done: boolean;
  completedAt: Instant | null;
  resolvedAt: Instant | null;
  resolution: 'deleted' | 'postponed' | 'late_completed' | 'ignored' | null;
  carriedFromId: Id | null;
  delayCount: number;
  lateAdjustedAt: Instant | null;
  tagIds: Id[];
}
export interface Tag extends Entity { name: string; color: string }
export interface Day extends Entity {
  date: DateKey;
  timeZone: string;
  closedAt: Instant | null;
  isRest: boolean;
  dailyReviewedAt: Instant | null;
}
export interface RestPeriod extends Entity {
  startDate: DateKey;
  endDate: DateKey;
  activatedAt: Instant;
  cancelledAt: Instant | null;
}
export interface Objective extends Entity {
  target: 1 | 2 | 3 | 4 | 7 | 14;
  confirmedAt: Instant;
  startDate: DateKey;
  firstAchievedAt: Instant | null;
  firstAchievedDate: DateKey | null;
}
export interface Preferences extends Entity {
  displayName: string;
  onboardingCompletedAt: Instant | null;
  dailyEnabled: boolean;
  lockPastDaysEnabled: boolean;
  language: 'fr' | 'en';
  theme: 'light' | 'dark' | 'system';
  textSize: 'small' | 'medium' | 'large';
  palette: string;
  calendar: 'slider' | 'text';
  progress: 'linear' | 'circular';
  stackCompletedTasks: boolean;
  statsVisibility: { today: boolean; future: boolean; empty: boolean; rest: boolean };
  reminders: {
    enabled: boolean;
    hour: number;
    minute: number;
    weekdays: number[]; // ISO Monday=1 ... Sunday=7.
    repetitionsEnabled: boolean;
    repetitions: number;
    delayMinutes: number;
  };
}
export interface SnapshotV1 {
  format: 'dun-productivity';
  formatVersion: 1;
  exportedAt: Instant;
  source: { spaceId: Id; ownerId: Id | null; generation: Id };
  tasks: Task[];
  tags: Tag[];
  days: Day[];
  restPeriods: RestPeriod[];
  objective: Objective | null;
  preferences: Preferences;
}

export type SyncEntity = Task | Tag | Day | RestPeriod | Objective | Preferences;
export interface OperationIdentity {
  operationId: Id;
  spaceId: Id;
  generation: Id;
  deviceId: Id;
  localSequence: number;
  createdAt: Instant; // Diagnostic only: not conflict priority.
}
export interface LocalSpace {
  id: Id;
  ownerId: Id | null;
  generation: Id;
  visibility: 'visible' | 'signed_out' | 'deleting';
}
export interface MutationValues {
  task: Task;
  tag: Tag;
  day: Day;
  rest: RestPeriod;
  objective: Objective;
  preferences: Preferences;
}
export type EntityChange = { [K in keyof MutationValues]: { entity: K; value: MutationValues[K] } }[keyof MutationValues];
export interface PendingMutation extends OperationIdentity {
  kind: 'mutation';
  // All changes of a report/reorder/Daily action commit together.
  changes: EntityChange[];
}
export interface PendingReplacement extends OperationIdentity {
  kind: 'replacement';
  expectedGeneration: Id;
  snapshot: SnapshotV1;
}
export type PendingOperation = PendingMutation | PendingReplacement;
export interface Acknowledgement {
  operationId: Id;
  generation: Id;
  serverRevision: Revision;
  receivedAt: Instant;
}
export interface ReplacedVersion {
  spaceId: Id;
  generation: Id;
  entityId: Id;
  replacedAt: Instant;
  recoverableUntil: Instant;
  previous: SyncEntity;
}
export interface PullCheckpoint {
  spaceId: Id;
  generation: Id;
  cursor: string; // Opaque; persist in the same transaction as the page.
}
