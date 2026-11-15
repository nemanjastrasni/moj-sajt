export class MergeError extends Error {
    status: number;
}
export type MergeInput = {
    action: "preview" | "apply";
    sourceId: string;
    targetId: string;
    choices: Record<string, "source" | "target">;
    version?: string;
    confirmed?: boolean;
};
export type Database = {
    query: (sql: string, params?: unknown[]) => Promise<{
        rows: Record<string, unknown>[];
    }>;
};
export function validate(input: unknown): MergeInput;
export function load(db: Database, input: MergeInput, lock?: boolean): Promise<unknown>;
export function plan(state: unknown, input: MergeInput): unknown;
export function preview(plan: unknown): unknown;
export function apply(db: Database, actorId: string, input: MergeInput): Promise<{
    source: {
        slug: string;
        category: string | null;
    };
    target: {
        id: string;
        slug: string;
        category: string | null;
    };
    moved: number;
    auditId: string;
}>;
