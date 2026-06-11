# Claude Code Base Action

This GitHub Action allows you to run [Claude Code](https://www.anthropic.com/claude-code) within your GitHub Actions workflows. You can use this to build any custom workflow on top of Claude Code.

For simply tagging @claude in issues and PRs out of the box, [check out the Claude Code action and GitHub app](https://github.com/anthropics/claude-code-action).

## Usage

Add the following to your workflow file:

```yaml
# Using a direct prompt
- name: Run Claude Code with direct prompt
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    claude_args: --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Or using a prompt from a file
- name: Run Claude Code with prompt file
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt_file: "/path/to/prompt.txt"
    claude_args: --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Or limiting the conversation turns
- name: Run Claude Code with limited turns
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    claude_args: |
      --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
      --max-turns 5
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Using custom system prompts
- name: Run Claude Code with custom system prompt
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Build a REST API"
    claude_args: |
      --system-prompt "You are a senior backend engineer. Focus on security, performance, and maintainability."
      --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Or appending to the default system prompt
- name: Run Claude Code with appended system prompt
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Create a database schema"
    claude_args: |
      --append-system-prompt "After writing code, be sure to code review yourself."
      --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Using fallback model for handling API errors
- name: Run Claude Code with fallback model
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Review and fix TypeScript errors"
    claude_args: |
      --model claude-opus-4-1-20250805
      --fallback-model claude-sonnet-4-20250514
      --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# Using OAuth token instead of API key
- name: Run Claude Code with OAuth token
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Update dependencies"
    claude_args: --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

## Inputs

| Input                            | Description                                                                                                      | Required | Default |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `prompt`                         | The prompt to send to Claude Code                                                                                | No\*     | ''      |
| `prompt_file`                    | Path to a file containing the prompt to send to Claude Code                                                      | No\*     | ''      |
| `settings`                       | Path to Claude Code settings JSON file, or settings JSON string                                                  | No       | ''      |
| `claude_args`                    | Additional arguments passed directly to the Claude CLI (e.g., `--max-turns 3 --mcp-config /path/to/config.json`) | No       | ''      |
| `anthropic_api_key`              | Anthropic API key (required for direct Anthropic API)                                                            | No       | ''      |
| `claude_code_oauth_token`        | Claude Code OAuth token (alternative to anthropic_api_key)                                                       | No       | ''      |
| `use_bedrock`                    | Use Amazon Bedrock with OIDC authentication instead of direct Anthropic API                                      | No       | 'false' |
| `use_vertex`                     | Use Google Vertex AI with OIDC authentication instead of direct Anthropic API                                    | No       | 'false' |
| `use_node_cache`                 | Whether to use Node.js dependency caching (set to true only for Node.js projects with lock files)                | No       | 'false' |
| `path_to_claude_code_executable` | Optional path to a custom Claude Code executable; skips automatic installation                                   | No       | ''      |
| `path_to_bun_executable`         | Optional path to a custom Bun executable; skips automatic Bun installation                                       | No       | ''      |

\*Either `prompt` or `prompt_file` must be provided, but not both.

Options like allowed tools, turn limits, system prompts, models, and MCP configuration are passed through `claude_args` using the corresponding [Claude CLI flags](https://docs.anthropic.com/en/docs/claude-code/cli-reference) (e.g., `--allowedTools`, `--max-turns`, `--system-prompt`, `--model`, `--mcp-config`).

## Outputs

| Output           | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `conclusion`     | Execution status of Claude Code ('success' or 'failure')   |
| `execution_file` | Path to the JSON file containing Claude Code execution log |

## Environment Variables

The following environment variables can be used to configure the action:

| Variable       | Description                                           | Default |
| -------------- | ----------------------------------------------------- | ------- |
| `NODE_VERSION` | Node.js version to use (e.g., '18.x', '20.x', '22.x') | '18.x'  |

Example usage:

```yaml
- name: Run Claude Code with Node.js 20
  uses: anthropics/claude-code-base-action@beta
  env:
    NODE_VERSION: "20.x"
  with:
    prompt: "Your prompt here"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Custom Environment Variables

You can pass custom environment variables to Claude Code execution using the `env` key of the `settings` input. This allows Claude to access environment-specific configuration during its execution:

```yaml
- name: Deploy with custom environment
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Deploy the application to the staging environment"
    settings: |
      {
        "env": {
          "ENVIRONMENT": "staging",
          "API_BASE_URL": "https://api-staging.example.com",
          "DATABASE_URL": "${{ secrets.STAGING_DB_URL }}",
          "DEBUG": "true",
          "LOG_LEVEL": "debug"
        }
      }
    claude_args: --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Using Settings Configuration

You can provide Claude Code settings configuration in two ways:

### Option 1: Settings Configuration File

Provide a path to a JSON file containing Claude Code settings:

```yaml
- name: Run Claude Code with settings file
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    settings: "path/to/settings.json"
    claude_args: --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Option 2: Inline Settings Configuration

Provide the settings configuration directly as a JSON string:

```yaml
- name: Run Claude Code with inline settings
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    settings: |
      {
        "model": "claude-opus-4-20250514",
        "env": {
          "DEBUG": "true",
          "API_URL": "https://api.example.com"
        },
        "permissions": {
          "allow": ["Bash", "Read"],
          "deny": ["WebFetch"]
        },
        "hooks": {
          "PreToolUse": [{
            "matcher": "Bash",
            "hooks": [{
              "type": "command",
              "command": "echo Running bash command..."
            }]
          }]
        }
      }
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

The settings file supports all Claude Code settings options including:

- `model`: Override the default model
- `env`: Environment variables for the session
- `permissions`: Tool usage permissions
- `hooks`: Pre/post tool execution hooks
- `includeCoAuthoredBy`: Include co-authored-by in git commits
- And more...

**Note**: The `enableAllProjectMcpServers` setting is always set to `true` by this action to ensure MCP servers work correctly.

## Using MCP Config

MCP configuration is passed to the Claude CLI via the `--mcp-config` flag in `claude_args`. You can provide it in two ways:

### Option 1: MCP Configuration File

Provide a path to a JSON file containing MCP configuration:

```yaml
- name: Run Claude Code with MCP config file
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    claude_args: |
      --mcp-config path/to/mcp-config.json
      --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Option 2: Inline MCP Configuration

Provide the MCP configuration directly as a JSON string:

```yaml
- name: Run Claude Code with inline MCP config
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    claude_args: |
      --mcp-config '{"mcpServers":{"server-name":{"command":"node","args":["./server.js"],"env":{"API_KEY":"your-api-key"}}}}'
      --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

The MCP config file should follow this format:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["./server.js"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

To allow Claude to use a tool from an MCP server, include it in `--allowedTools` as `mcp__server-name__tool_name`:

```yaml
- name: Run Claude Code with MCP and custom tools
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Access the custom MCP server and use its tools"
    claude_args: |
      --mcp-config mcp-config.json
      --allowedTools "Bash(git:*),View,mcp__server-name__custom_tool"
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Example: PR Code Review

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Code Review with Claude
        id: code-review
        uses: anthropics/claude-code-base-action@beta
        with:
          prompt: "Review the PR changes. Focus on code quality, potential bugs, and performance issues. Suggest improvements where appropriate. Write your review as markdown text."
          claude_args: --allowedTools "Bash(git diff --name-only HEAD~1),Bash(git diff HEAD~1),View,GlobTool,GrepTool,Write"
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Extract and Comment PR Review
        if: steps.code-review.outputs.conclusion == 'success'
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const executionFile = '${{ steps.code-review.outputs.execution_file }}';
            const executionLog = JSON.parse(fs.readFileSync(executionFile, 'utf8'));

            // Extract the review content from the execution log
            // The execution log contains the full conversation including Claude's responses
            let review = '';

            // Find the last assistant message which should contain the review
            for (let i = executionLog.length - 1; i >= 0; i--) {
              if (executionLog[i].role === 'assistant') {
                review = executionLog[i].content;
                break;
              }
            }

            if (review) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: "## Claude Code Review\n\n" + review + "\n\n*Generated by Claude Code*"
              });
            }
```

Check out additional examples in [`./examples`](./examples).

## Using Cloud Providers

You can authenticate with Claude using any of these methods:

1. Direct Anthropic API (default) - requires API key or OAuth token
2. Amazon Bedrock - requires OIDC authentication and automatically uses cross-region inference profiles
3. Google Vertex AI - requires OIDC authentication

**Note**:

- Bedrock and Vertex use OIDC authentication exclusively
- AWS Bedrock automatically uses cross-region inference profiles for certain models
- For cross-region inference profile models, you need to request and be granted access to the Claude models in all regions that the inference profile uses
- The Bedrock API endpoint URL is automatically constructed using the AWS_REGION environment variable (e.g., `https://bedrock-runtime.us-west-2.amazonaws.com`)
- You can override the Bedrock API endpoint URL by setting the `ANTHROPIC_BEDROCK_BASE_URL` environment variable

### Model Configuration

Use provider-specific model names via `--model` in `claude_args` based on your chosen provider:

```yaml
# For direct Anthropic API (default)
- name: Run Claude Code with Anthropic API
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    claude_args: --model claude-3-7-sonnet-20250219
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}

# For Amazon Bedrock (requires OIDC authentication)
- name: Configure AWS Credentials (OIDC)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
    aws-region: us-west-2

- name: Run Claude Code with Bedrock
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    claude_args: --model anthropic.claude-3-7-sonnet-20250219-v1:0
    use_bedrock: "true"

# For Google Vertex AI (requires OIDC authentication)
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

- name: Run Claude Code with Vertex AI
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    claude_args: --model claude-3-7-sonnet@20250219
    use_vertex: "true"
```

## Example: Using OIDC Authentication for AWS Bedrock

This example shows how to use OIDC authentication with AWS Bedrock:

```yaml
- name: Configure AWS Credentials (OIDC)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
    aws-region: us-west-2

- name: Run Claude Code with AWS OIDC
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    use_bedrock: "true"
    claude_args: |
      --model anthropic.claude-3-7-sonnet-20250219-v1:0
      --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
```

## Example: Using OIDC Authentication for GCP Vertex AI

This example shows how to use OIDC authentication with GCP Vertex AI:

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

- name: Run Claude Code with GCP OIDC
  uses: anthropics/claude-code-base-action@beta
  with:
    prompt: "Your prompt here"
    use_vertex: "true"
    claude_args: |
      --model claude-3-7-sonnet@20250219
      --allowedTools "Bash(git:*),View,GlobTool,GrepTool,BatchTool"
```

## Security Best Practices

**⚠️ IMPORTANT: Never commit API keys directly to your repository! Always use GitHub Actions secrets.**

To securely use your Anthropic API key:

1. Add your API key as a repository secret:

   - Go to your repository's Settings
   - Navigate to "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Name it `ANTHROPIC_API_KEY`
   - Paste your API key as the value

2. Reference the secret in your workflow:
   ```yaml
   anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
   ```

**Never do this:**

```yaml
# ❌ WRONG - Exposes your API key
anthropic_api_key: "sk-ant-..."
```

**Always do this:**

```yaml
# ✅ CORRECT - Uses GitHub secrets
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

This applies to all sensitive values including API keys, access tokens, and credentials.
We also recommend that you always use short-lived tokens when possible

## License

This project is licensed under the MIT License—see the LICENSE file for details.
