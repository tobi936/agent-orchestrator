import { Sandbox } from 'e2b'

const CTAGS_INDEX = '/tmp/ctags.json'

async function rebuildCtags(sandbox: Sandbox): Promise<void> {
  await sandbox.commands.run(
    `which ctags >/dev/null 2>&1 || apt-get install -y -q universal-ctags 2>/dev/null || true; ` +
    `ctags -R --output-format=json --fields=+n -f ${CTAGS_INDEX} . 2>/dev/null || true`,
    { timeoutMs: 30_000 },
  )
}

export class FileTracker {
  private readCache = new Map<string, string>()

  onRead(path: string, content: string) {
    this.readCache.set(path, content)
  }

  // Returns cached content if file is unchanged, null if re-read is needed
  getCached(path: string, currentContent: string): string | null {
    const cached = this.readCache.get(path)
    if (cached !== undefined && cached === currentContent) return cached
    return null
  }

  hasRead(path: string): boolean {
    return this.readCache.has(path)
  }

  // After write, invalidate cache so next write requires re-read
  onWrite(path: string) {
    this.readCache.delete(path)
  }
}

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
  {
    type: 'function' as const,
    function: {
      name: 'make_directory',
      description: 'Create a directory (and all parent directories) in the sandbox.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path of the directory to create' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_directory',
      description: 'List files and directories inside a directory (non-recursive).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the directory' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'copy_file',
      description: 'Copy a file to a new location in the sandbox.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Absolute path to the source file' },
          destination: { type: 'string', description: 'Absolute path to the destination' },
        },
        required: ['source', 'destination'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_file',
      description: 'Delete a file in the sandbox.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file to delete' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'move_file',
      description: 'Move or rename a file in the sandbox.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Absolute path to the source file' },
          destination: { type: 'string', description: 'Absolute path to the destination' },
        },
        required: ['source', 'destination'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_files',
      description: 'Search for a text pattern across files in a directory.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the directory to search in' },
          pattern: { type: 'string', description: 'Text or regex pattern to search for' },
          file_glob: { type: 'string', description: 'File name pattern to restrict search, e.g. "*.ts" (optional)' },
        },
        required: ['path', 'pattern'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_repo_map',
      description: 'Get a symbol index of the repository: all classes, functions, and methods with their file and line number. Use this before reading files to understand the codebase structure. The index is automatically kept up to date after every file write.',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Optional: filter symbols by name (substring match)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'print_tree',
      description: 'Print the directory tree of a path in the sandbox.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the directory (defaults to /)' },
          depth: { type: 'number', description: 'Maximum depth to traverse (default: 3)' },
        },
        required: [],
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

const MAX_OUTPUT_CHARS = 4000

function truncate(output: string): string {
  if (output.length <= MAX_OUTPUT_CHARS) return output
  const omitted = output.length - MAX_OUTPUT_CHARS
  return output.slice(0, MAX_OUTPUT_CHARS) + `\n… [${omitted} chars truncated — use a more targeted command to get the rest]`
}

export async function executeSandboxTool(
  name: string,
  input: Record<string, string>,
  sandbox: Sandbox,
  tracker?: FileTracker,
): Promise<string> {
  try {
    if (name === 'read_file') {
      const current = await sandbox.files.read(input.path)
      if (tracker) {
        const cached = tracker.getCached(input.path, current)
        if (cached !== null) return truncate(cached)
        tracker.onRead(input.path, current)
      }
      return truncate(current)
    }

    if (name === 'write_file') {
      if (tracker && !tracker.hasRead(input.path)) {
        return `Error: you must read_file("${input.path}") before writing it`
      }
      await sandbox.files.write(input.path, input.content)
      tracker?.onWrite(input.path)
      rebuildCtags(sandbox)
      return `Written: ${input.path}`
    }

    if (name === 'edit_file') {
      const content = await sandbox.files.read(input.path)
      if (!content.includes(input.old_string)) return `Error: old_string not found in ${input.path}`
      await sandbox.files.write(input.path, content.replace(input.old_string, input.new_string))
      tracker?.onWrite(input.path)
      rebuildCtags(sandbox)
      return `Edited: ${input.path}`
    }

    if (name === 'get_repo_map') {
      // Build index if it doesn't exist yet
      const check = await sandbox.commands.run(`test -f ${CTAGS_INDEX} && echo ok || echo missing`)
      if (check.stdout?.trim() !== 'ok') await rebuildCtags(sandbox)

      const raw = await sandbox.files.read(CTAGS_INDEX).catch(() => '')
      if (!raw) return '(no symbol index available — try run_command to check ctags is installed)'

      const filter = (input.filter ?? '').toLowerCase()
      const lines = raw.split('\n').filter(Boolean)
      const symbols: string[] = []

      for (const line of lines) {
        try {
          const tag = JSON.parse(line) as { name: string; path: string; line: number; kind: string }
          if (!['function', 'class', 'method', 'interface', 'type', 'variable', 'module'].includes(tag.kind)) continue
          if (filter && !tag.name.toLowerCase().includes(filter)) continue
          symbols.push(`${tag.name.padEnd(40)} ${tag.path}:${tag.line}  [${tag.kind}]`)
        } catch { /* skip malformed lines */ }
      }

      if (symbols.length === 0) return filter ? `No symbols matching "${input.filter}"` : '(no symbols found)'
      return truncate(symbols.join('\n'))
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
        return truncate(`Error (exit ${result.exitCode}): ${out || '(no output)'}`)
      }
      return truncate(out || '(no output)')
    }

    if (name === 'make_directory') {
      await sandbox.commands.run(`mkdir -p "${input.path}"`)
      return `Created: ${input.path}`
    }

    if (name === 'list_directory') {
      const entries = await sandbox.files.list(input.path)
      return truncate(entries.map((e) => `${e.type === 'dir' ? 'd' : 'f'} ${e.name}`).join('\n') || '(empty)')
    }

    if (name === 'copy_file') {
      await sandbox.commands.run(`cp "${input.source}" "${input.destination}"`)
      return `Copied: ${input.source} → ${input.destination}`
    }

    if (name === 'delete_file') {
      await sandbox.commands.run(`rm -f ${input.path}`)
      return `Deleted: ${input.path}`
    }

    if (name === 'move_file') {
      await sandbox.commands.run(`mv ${input.source} ${input.destination}`)
      return `Moved: ${input.source} → ${input.destination}`
    }

    if (name === 'search_files') {
      const glob = input.file_glob ? `--include="${input.file_glob}"` : ''
      let stdout = ''
      let stderr = ''
      await sandbox.commands.run(`grep -rn ${glob} -e "${input.pattern}" "${input.path}" 2>/dev/null || true`, {
        timeoutMs: 30_000,
        onStdout: (d) => { stdout += d },
        onStderr: (d) => { stderr += d },
      })
      return truncate(stdout.trim() || '(no matches)')
    }

    if (name === 'print_tree') {
      const dir = input.path || '/'
      const depth = Number(input.depth) || 3
      let stdout = ''
      let stderr = ''
      const result = await sandbox.commands.run(`find ${dir} -maxdepth ${depth} | sort | awk 'NR>1{gsub(/[^/]*\//,"  ",$0); sub(/  /,"",$0)} {print}'`, {
        timeoutMs: 30_000,
        onStdout: (d) => { stdout += d },
        onStderr: (d) => { stderr += d },
      })
      const out = (stdout + (stderr ? `\n[stderr] ${stderr}` : '')).trim()
      if (result.exitCode !== 0) {
        return truncate(`Error (exit ${result.exitCode}): ${out || '(no output)'}`)
      }
      return truncate(out || '(empty)')
    }

    return `Unknown tool: ${name}`
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}

export const ghTools = [
  {
    type: 'function' as const,
    function: {
      name: 'gh_get_issue',
      description: 'Fetch a GitHub issue by owner, repo and issue number. Use this whenever a GitHub issue URL or number is mentioned.',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner (username or org)' },
          repo:  { type: 'string', description: 'Repository name' },
          number: { type: 'number', description: 'Issue number' },
        },
        required: ['owner', 'repo', 'number'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'gh_list_issues',
      description: 'List open issues for a GitHub repository.',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo:  { type: 'string', description: 'Repository name' },
          state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Filter by state (default: open)' },
        },
        required: ['owner', 'repo'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'gh_get_pull_request',
      description: 'Fetch a GitHub pull request by owner, repo and PR number.',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo:  { type: 'string', description: 'Repository name' },
          number: { type: 'number', description: 'Pull request number' },
        },
        required: ['owner', 'repo', 'number'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'gh_get_repo',
      description: 'Get information about a GitHub repository.',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo:  { type: 'string', description: 'Repository name' },
        },
        required: ['owner', 'repo'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'gh_close_pull_request',
      description: 'Close a GitHub pull request without merging. Use this to close a PR when the sandbox is no longer available.',
      parameters: {
        type: 'object',
        properties: {
          owner:  { type: 'string', description: 'Repository owner' },
          repo:   { type: 'string', description: 'Repository name' },
          number: { type: 'number', description: 'Pull request number' },
        },
        required: ['owner', 'repo', 'number'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'gh_delete_branch',
      description: 'Delete a remote branch on GitHub via the API. Use this when the sandbox is no longer available and you cannot run git commands.',
      parameters: {
        type: 'object',
        properties: {
          owner:  { type: 'string', description: 'Repository owner' },
          repo:   { type: 'string', description: 'Repository name' },
          branch: { type: 'string', description: 'Branch name to delete' },
        },
        required: ['owner', 'repo', 'branch'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'gh_merge_pull_request',
      description: 'Merge a GitHub pull request via the API.',
      parameters: {
        type: 'object',
        properties: {
          owner:        { type: 'string', description: 'Repository owner' },
          repo:         { type: 'string', description: 'Repository name' },
          number:       { type: 'number', description: 'Pull request number' },
          merge_method: { type: 'string', enum: ['merge', 'squash', 'rebase'], description: 'Merge method (default: merge)' },
        },
        required: ['owner', 'repo', 'number'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'gh_list_pull_requests',
      description: 'List pull requests for a GitHub repository.',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string', description: 'Repository owner' },
          repo:  { type: 'string', description: 'Repository name' },
          state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Filter by state (default: open)' },
        },
        required: ['owner', 'repo'],
      },
    },
  },
]

async function ghFetch(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
): Promise<string> {
  const token = process.env.GITHUB_TOKEN
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return 'OK'
  const json = await res.json() as unknown
  if (!res.ok) return `GitHub API error ${res.status}: ${JSON.stringify(json)}`
  return JSON.stringify(json, null, 2)
}

export async function executeGhTool(name: string, input: Record<string, string | number>): Promise<string> {
  try {
    if (name === 'gh_get_issue') return ghFetch(`/repos/${input.owner}/${input.repo}/issues/${input.number}`)
    if (name === 'gh_list_issues') return ghFetch(`/repos/${input.owner}/${input.repo}/issues?state=${input.state ?? 'open'}&per_page=30`)
    if (name === 'gh_get_pull_request') return ghFetch(`/repos/${input.owner}/${input.repo}/pulls/${input.number}`)
    if (name === 'gh_get_repo') return ghFetch(`/repos/${input.owner}/${input.repo}`)
    if (name === 'gh_list_pull_requests') return ghFetch(`/repos/${input.owner}/${input.repo}/pulls?state=${input.state ?? 'open'}&per_page=30`)
    if (name === 'gh_close_pull_request') return ghFetch(`/repos/${input.owner}/${input.repo}/pulls/${input.number}`, 'PATCH', { state: 'closed' })
    if (name === 'gh_delete_branch') return ghFetch(`/repos/${input.owner}/${input.repo}/git/refs/heads/${input.branch}`, 'DELETE')
    if (name === 'gh_merge_pull_request') return ghFetch(`/repos/${input.owner}/${input.repo}/pulls/${input.number}/merge`, 'PUT', { merge_method: input.merge_method ?? 'merge' })
    return `Unknown gh tool: ${name}`
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}

// Re-export for backward compat
export const tools = sandboxTools
export const executeTool = executeSandboxTool
