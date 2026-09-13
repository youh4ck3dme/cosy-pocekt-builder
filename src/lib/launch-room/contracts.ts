import { z } from "zod";

export const PipelineStageIdSchema = z.enum([
  "prompt",
  "generate",
  "validate",
  "repair",
  "audit",
  "package",
  "approval",
  "deploy",
]);
export type PipelineStageId = z.infer<typeof PipelineStageIdSchema>;

export const PipelineStageStatusSchema = z.enum([
  "idle",
  "running",
  "passed",
  "warning",
  "failed",
]);
export type PipelineStageStatus = z.infer<typeof PipelineStageStatusSchema>;

export const PipelineStageSchema = z.object({
  id: PipelineStageIdSchema,
  name: z.string().min(1),
  desc: z.string(),
  status: PipelineStageStatusSchema,
  timestamp: z.string().optional(),
  reason: z.string().optional(),
  detail: z.string().optional(),
  durationMs: z.number().optional(),
});
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  ok: z.boolean(),
  note: z.string(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ProofPassportSchema = z.object({
  revisionHash: z.string(),
  title: z.string(),
  htmlBytes: z.number(),
  staticAuditScore: z.number().min(0).max(100),
  staticAuditStatus: z.enum(["pass", "warning", "failed"]),
  staticAuditFindingsCount: z.number().min(0),
  browserValidated: z.boolean(),
  browserValidationStrategy: z.string().optional(),
  approvalCreatedAt: z.string().nullable(),
  clientDecision: z.enum(["none", "pending", "approved", "rejected"]),
  checklist: z.array(ChecklistItemSchema),
  evidenceDisclaimer: z.string(),
});
export type ProofPassport = z.infer<typeof ProofPassportSchema>;

export const LaunchLogChunkSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  level: z.enum(["info", "warn", "error", "success"]),
  stage: z.union([PipelineStageIdSchema, z.literal("system")]),
  message: z.string().min(1),
});
export type LaunchLogChunk = z.infer<typeof LaunchLogChunkSchema>;

export const SelfHealingSuggestionSchema = z.object({
  id: z.string().min(1),
  findingId: z.string().optional(),
  severity: z.enum(["critical", "warning", "info"]),
  title: z.string().min(1),
  description: z.string(),
  suggestedPrompt: z.string().optional(),
  actionLabel: z.string().optional(),
  actionType: z.enum(["repair-prompt", "apply-fix", "manual"]).optional(),
});
export type SelfHealingSuggestion = z.infer<typeof SelfHealingSuggestionSchema>;

export const ClientSignalSchema = z.object({
  hasLink: z.boolean(),
  status: z.enum(["none", "pending", "approved", "rejected"]),
  clientLabel: z.string().optional(),
  createdAt: z.string().optional(),
  expiresAt: z.string().optional(),
  openedAt: z.string().nullable().optional(),
  decisionAt: z.string().nullable().optional(),
  feedback: z.string().nullable().optional(),
  recommendedNextStep: z.string(),
});
export type ClientSignal = z.infer<typeof ClientSignalSchema>;
