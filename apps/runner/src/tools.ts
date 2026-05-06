import { Sandbox } from 'e2b'

export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file in the sandbox.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file in the sandbox (creates or overwrites the entire file).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
          content: { type: 'string', description: 'Text content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Make a targeted edit to a file by replacing an exact string. Prefer this over write_file when changing only part of a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
          old_string: { type: 'string', description: 'The exact string to find and replace' },
          new_string: { type: 'string', description: 'The string to replace it with' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description: 'Run any bash shell command in the sandbox — including git, gh (GitHub CLI), grep, find, ls, cat, curl, npm, python, etc. Returns stdout and stderr.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute' },
        },
        required: ['command'],
      },
    },
  },
]

export async function executeTool(
  name: string,
  input: Record<string, string>,
  sandbox: Sandbox,
): Promise<string> {
  try {
    if (name === 'read_file') return await sandbox.files.read(input.path)

    if (name === 'write_file') {
      await sandbox.files.write(input.path, input.content)
      return `Written: ${input.path}`
    }

    if (name === 'edit_file') {
      const content = await sandbox.files.read(input.path)
      if (!content.includes(input.old_string)) return `Error: old_string not found in ${input.path}`
      await sandbox.files.write(input.path, content.replace(input.old_string, input.new_string))
      return `Edited: ${input.path}`
    }

    if (name === 'run_command') {
      let stdout = ''
      let stderr = ''
      const result = await sandbox.commands.run(input.command, {
        timeoutMs: 300_000,
        onStdout: (d) => { stdout += d },
        onStderr: (d) => { stderr += d },
      })
      const out = (stdout + (stderr ? `\n[stderr] ${stderr}` : '')).trim()
      if (result.exitCode !== 0) {
        return `Error (exit ${result.exitCode}): ${out || '(no output)'}`
      }
      return out || '(no output)'
    }

    return `Unknown tool: ${name}`
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}
