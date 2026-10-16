// The single seam between the M2 gameplay UI and the frozen, Astra-approved contract (docs/m2 at 11ec4ca).
// Every gameplay module imports contract types and equipment language from HERE and nowhere else.
//
// Integration with Sol's Stage A (see docs/M2_FRONTEND_INTEGRATION.md):
//   1. Re-point the type export below to '@microfire/shared' (same names).
//   2. Re-point ./contract/parts.ts to '@microfire/shared' (partDefinitions now carries label/anchorLabel) and delete
//      ./contract/equipment-copy.ts (a byte-identical, drift-tested mirror of docs/m2/fixtures/equipment-copy.ts).
//   3. Set `contractRuntime` to Sol's response schemas, `requestIdentity` and `noteIssue`.
// Nothing else in apps/web/game changes.
export type {
  ActionRequest, ActionResponse, AuthorizeRequest, AuthorizeResponse, CapabilityResponse, CheckpointBudget, CorePreviewAction,
  CurrentDiagnostic, DiagnosticFinding, DiagnosticResult, DisplayFault, DomainResult, FaultCode, HttpCode, HttpFailure, LearningCheck,
  LocalSaveResult, LocalSlot, NoteIssue, PassportPresentation, PreviewId, Progress, ResumeRequest, ResumeResponse, RevokeResponse,
  SaveConflictCode, Snapshot, StartRequest, StartResponse, Step, Training, TrainingAction, TrainingCode, TrainingCorrection
} from '../../../docs/m2/fixtures/contract-types';
import type { PartId } from '@microfire/shared';
import type {
  ActionResponse, AuthorizeResponse, CapabilityResponse, HttpFailure, NoteIssue, RevokeResponse, StartResponse
} from '../../../docs/m2/fixtures/contract-types';

/** Plain, serialisable part data that server components hand to the client game (see ./contract/parts.ts). */
export type PartSpec = { id: PartId; label: string; anchorId: string; anchorLabel: string; requires: PartId[]; sourceNote: string;
  /** Frozen repair copy for a reversed orientation, or null when orientation has no training consequence. */
  reversedRepair: string | null };

/** Throws when the value does not match the frozen schema. */
export type { PartId };
export type Parse<T> = (value: unknown) => T;
export type ContractRuntime = {
  parse: { capability: Parse<CapabilityResponse>; authorize: Parse<AuthorizeResponse>; revoke: Parse<RevokeResponse>;
    snapshot: Parse<StartResponse>; action: Parse<ActionResponse>; failure: Parse<HttpFailure> };
  /** Sol's shared requestIdentity: SHA-256 of the one canonical JSON implementation. Never reimplemented here. */
  identify: (endpoint: 'start' | 'action' | 'resume', request: object) => Promise<string>;
  /** Sol's shared learner-note preflight. */
  noteIssue: (text: string) => NoteIssue | null;
};
/** Not available on this branch: Sol's runtime schemas and canonical identity live on codex/m2-stage-a-backend. */
export const contractRuntime: ContractRuntime | null = null;
