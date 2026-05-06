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
      description: 'Write content to a file in the sandbox (creates or overwrites).',
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

    if (name === 'run_command') {
      let stdout = ''
      let stderr = ''
      const result = await sandbox.commands.run(input.command, {
        timeoutMs: 30_000,
        onStdout: (d) => { stdout += d },
        onStderr: (d) => { stderr += d },
      })
      const out = stdout + (stderr ? `\n[stderr] ${stderr}` : '')
      return out || `(exit code ${result.exitCode})`
    }

    return `Unknown tool: ${name}`
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}
