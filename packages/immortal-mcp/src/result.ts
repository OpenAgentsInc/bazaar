import { BoundaryError } from "./boundaries.js"

export interface ToolResult {
  content: { type: "text"; text: string }[]
  isError?: boolean
  [key: string]: unknown
}

export function ok(payload: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  }
}

export function toolError(
  code: string,
  message: string,
  extra?: Record<string, unknown>
): ToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: { code, message, ...extra } }, null, 2),
      },
    ],
  }
}

/** Wraps a handler so thrown BoundaryErrors become typed tool errors. */
export async function guarded(
  run: () => Promise<ToolResult>
): Promise<ToolResult> {
  try {
    return await run()
  } catch (cause) {
    if (cause instanceof BoundaryError) {
      return toolError(cause.code, cause.message)
    }
    const message = cause instanceof Error ? cause.message : String(cause)
    return toolError("internal_error", message)
  }
}
