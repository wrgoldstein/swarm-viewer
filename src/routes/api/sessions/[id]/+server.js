import { json } from '@sveltejs/kit';
import { readFile, access, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { constants } from 'fs';

const SWARM_SESSIONS_DIR = join(homedir(), '.claude-swarm', 'sessions');
const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

async function fileExists(path) {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

function parseRubyLog(logContent) {
	const events = [];
	const lines = logContent.split('\n');

	for (const line of lines) {
		if (!line.trim()) continue;

		// Try to extract JSON from Ruby logger format
		// Format: I, [timestamp #pid]  INFO -- instance: {json...}
		const jsonMatch = line.match(/INFO -- \w+: ({.+})/);
		if (jsonMatch) {
			try {
				const eventData = JSON.parse(jsonMatch[1]);
				// Extract instance from the log line
				const instanceMatch = line.match(/INFO -- (\w+):/);
				events.push({
					instance: instanceMatch ? instanceMatch[1] : 'unknown',
					timestamp: new Date().toISOString(),
					event: eventData,
					type: eventData.type || 'log'
				});
			} catch (e) {
				// Skip lines that aren't valid JSON
			}
		} else {
			// Plain log line
			events.push({
				instance: 'system',
				timestamp: new Date().toISOString(),
				event: { message: line },
				type: 'log'
			});
		}
	}

	return events;
}

async function getSwarmSession(projectDir, sessionId) {
	const sessionPath = join(SWARM_SESSIONS_DIR, projectDir, sessionId);

	// Read session metadata
	const metadataPath = join(sessionPath, 'session_metadata.json');
	const metadataContent = await readFile(metadataPath, 'utf-8');
	const metadata = JSON.parse(metadataContent);

	// Check if session is active by looking in run directory
	const SWARM_RUN_DIR = join(homedir(), '.claude-swarm', 'run');
	try {
		const runLinkPath = join(SWARM_RUN_DIR, sessionId);
		await access(runLinkPath, constants.F_OK);
		metadata.active = true;
	} catch {
		metadata.active = false;
	}

	let events = [];

	// Try session.log.json first (NDJSON format)
	const jsonLogPath = join(sessionPath, 'session.log.json');
	if (await fileExists(jsonLogPath)) {
		const logContent = await readFile(jsonLogPath, 'utf-8');
		events = logContent
			.trim()
			.split('\n')
			.filter(line => line.trim())
			.map((line, index) => {
				const event = JSON.parse(line);
				// Add unique event_id
				const signature = event.event?.message?.content?.[0]?.signature;
				event.event_id = signature ? signature.slice(0, 36) : `${event.timestamp}-${index}`;
				return event;
			});
	}

	return { metadata, events };
}

async function getClaudeSession(projectDir, sessionId) {
	const sessionPath = join(CLAUDE_PROJECTS_DIR, projectDir, `${sessionId}.jsonl`);
	const fileContent = await readFile(sessionPath, 'utf-8');
	const lines = fileContent.trim().split('\n').filter(l => l.trim());

	// Parse all events
	const events = lines.map((line, index) => {
		const event = JSON.parse(line);

		// Add event_id based on uuid or generate one
		event.event_id = event.uuid || `${event.timestamp || index}-${index}`;

		// For Claude sessions, we keep the original structure
		// but mark it as a claude-type event for the frontend
		event.sessionType = 'claude';

		// Extract instance for agent filtering
		if (event.type === 'user') {
			event.instance = 'user';
		} else if (event.type === 'assistant') {
			event.instance = 'assistant';
		} else if (event.type === 'summary' || event.type === 'file-history-snapshot') {
			event.instance = 'system';
		}

		return event;
	});

	// Extract metadata from events
	let summary = 'Untitled';
	let timestamp = null;
	let cwd = null;
	let firstUserMessage = null;

	// Search first 10 lines for summary and first user message
	for (const line of lines.slice(0, Math.min(10, lines.length))) {
		try {
			const event = JSON.parse(line);

			// Extract summary if found
			if (event.type === 'summary' && event.summary) {
				summary = event.summary;
			}

			// Extract timestamp and cwd from first user message
			if (event.type === 'user' && event.timestamp && !timestamp) {
				timestamp = event.timestamp;
				cwd = event.cwd || null;

				// Store first user message content as fallback
				if (!firstUserMessage && event.message?.content) {
					const content = typeof event.message.content === 'string'
						? event.message.content
						: '';
					// Extract first line or first 80 chars
					firstUserMessage = content.split('\n')[0].trim().replace(/^#+\s*/, '').substring(0, 80);
				}
			}

			// Stop if we have both
			if (summary !== 'Untitled' && timestamp) break;
		} catch (e) {
			// Skip malformed lines
		}
	}

	// Use first user message as title if no summary found
	if (summary === 'Untitled' && firstUserMessage) {
		summary = firstUserMessage;
	}

	// Check if session is active (modified within last 2 minutes)
	const stats = await stat(sessionPath);
	const now = Date.now();
	const fileAge = now - stats.mtime.getTime();
	const isActive = fileAge < 2 * 60 * 1000; // 2 minutes

	const metadata = {
		swarm_name: summary,
		root_directory: cwd || projectDir,
		start_time: timestamp,
		active: isActive
	};

	return { metadata, events };
}

export async function GET({ params }) {
	try {
		// params.id is in format "type:projectDir/sessionId"
		const [type, ...rest] = params.id.split(':');
		const path = rest.join(':'); // Handle colons in path
		const [projectDir, sessionId] = path.split('/');

		let sessionData;

		if (type === 'swarm') {
			sessionData = await getSwarmSession(projectDir, sessionId);
		} else if (type === 'claude') {
			sessionData = await getClaudeSession(projectDir, sessionId);
		} else {
			return json({ error: 'Invalid session type' }, { status: 400 });
		}

		return json({
			...sessionData,
			id: params.id,
			type
		});
	} catch (error) {
		console.error('Error reading session:', error);
		return json({ error: error.message }, { status: 500 });
	}
}
