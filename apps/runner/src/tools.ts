import { Sandbox } from 'e2b'

export const sandboxTools = [
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
      description: 'Make a targeted edit to a file by replacing an exact string.',
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
      description: 'Run any bash shell command in the sandbox.',
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

export const orchestrationTools = [
  {
    type: 'function' as const,
    function: {
      name: 'route_task',
      description: 'Mark the current task as done and send a new task to another agent.',
      parameters: {
        type: 'object',
        properties: {
          target_agent_id: { type: 'string', description: 'ID of the agent to send the task to' },
          title: { type: 'string', description: 'Short title for the new task' },
          content: { type: 'string', description: 'Full task description for the target agent' },
        },
        required: ['target_agent_id', 'title', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ask_human',
      description: 'Pause the task and ask the human user a question. The task will resume when the human replies.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question or information needed from the human' },
        },
        required: ['question'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_agent',
      description: 'Create a new agent with a name, system prompt, provider and model.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Display name for the agent' },
          system_prompt: { type: 'string', description: 'The system prompt / instructions for the agent' },
          provider: { type: 'string', description: 'AI provider: ollama | anthropic | openai' },
          model: { type: 'string', description: 'Model name, e.g. claude-haiku-4-5-20251001' },
          repo_url: { type: 'string', description: 'Optional GitHub repo URL to clone into the sandbox' },
        },
        required: ['name', 'system_prompt', 'provider', 'model'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_agent',
      description: 'Update the settings of an existing agent (system prompt, model, provider, name, etc.).',
      parameters: {
        type: 'object',
        properties: {
          agent_id: { type: 'string', description: 'ID of the agent to update' },
          name: { type: 'string', description: 'New name (optional)' },
          system_prompt: { type: 'string', description: 'New system prompt (optional)' },
          provider: { type: 'string', description: 'New provider (optional): ollama | anthropic | openai' },
          model: { type: 'string', description: 'New model name (optional)' },
          repo_url: { type: 'string', description: 'New GitHub repo URL (optional)' },
        },
        required: ['agent_id'],
      },
    },
  },
]

export async function executeSandboxTool(
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

// Re-export for backward compat
export const tools = sandboxTools
export const executeTool = executeSandboxTool
