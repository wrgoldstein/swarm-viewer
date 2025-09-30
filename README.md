# Claude Swarm Viewer

A real-time viewer for [claude-swarm](https://github.com/parruda/claude-swarm) session logs. Displays multi-agent conversations stored in `~/.claude-swarm/sessions/` with a clean, filterable UI.

## Features

- **Real-time monitoring**: Auto-refreshes active sessions every 2 seconds
- **Session management**: Browse and switch between sessions with active session detection
- **Smart filtering**: Hides internal messages, tool calls, sub-agent execution, and system events by default
- **Agent color coding**: Consistent hash-based colors for each agent, orange for user/system
- **Sub-agent visualization**: Purple borders and indentation for nested agent execution
- **Collapsible thinking**: Expandable thinking blocks when "Show all details" is enabled
- **Dual format support**: Handles both NDJSON (`session.log.json`) and Ruby logger (`session.log`) formats

## Key Files

### API Routes
- **`src/routes/api/sessions/+server.js`**: Lists all sessions from `~/.claude-swarm/sessions/`, detects active sessions via symlinks in `~/.claude-swarm/run/`, adds unique `event_id` for stable rendering
- **`src/routes/api/sessions/[id]/+server.js`**: Reads individual session data, parses both NDJSON and Ruby logger formats

### Components
- **`src/routes/+page.svelte`**: Main app with session loading, auto-refresh, event filtering logic, and scroll management
- **`src/lib/components/SessionList.svelte`**: Sidebar displaying sessions with active badges and metadata
- **`src/lib/components/EventMessage.svelte`**: Container for individual events with sub-agent styling
- **`src/lib/components/EventHeader.svelte`**: Agent names with hash-based color assignment
- **`src/lib/components/ContentBlock.svelte`**: Renders text, thinking, tool_use, and tool_result blocks

## Event Filtering

The viewer filters events based on multiple criteria:
- Hides sessions shorter than 30 seconds
- Hides tool results and agent-to-agent requests (unless "Show all details")
- Hides sub-agent internal execution (`calling_instance` field)
- Always hides system init events (`type: "system"`, `subtype: "init"`)
- Detects tool results by checking if previous event is type "result"

## Tech Stack

- SvelteKit with Svelte 5 runes (`$state`, `$props`)
- Tailwind CSS
- Node.js fs/promises for file system operations

## Development

```sh
npm install
npm run dev
```