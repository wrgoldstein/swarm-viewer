import { json } from '@sveltejs/kit';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { constants } from 'fs';

const SESSIONS_DIR = join(homedir(), '.claude-swarm', 'sessions');

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

export async function GET({ params }) {
	try {
		// params.id is in format "projectDir/sessionId"
		const [projectDir, sessionId] = params.id.split('/');
		const sessionPath = join(SESSIONS_DIR, projectDir, sessionId);

		// Read session metadata
		const metadataPath = join(sessionPath, 'session_metadata.json');
		const metadataContent = await readFile(metadataPath, 'utf-8');
		const metadata = JSON.parse(metadataContent);

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
		} else {
			// Fall back to session.log (Ruby logger format)
			const logPath = join(sessionPath, 'session.log');
			if (await fileExists(logPath)) {
				const logContent = await readFile(logPath, 'utf-8');
				events = parseRubyLog(logContent);
				// Add event_id to ruby log events
				events.forEach((event, index) => {
					event.event_id = `${event.timestamp}-${index}`;
				});
			}
		}

		return json({
			metadata,
			events,
			id: params.id
		});
	} catch (error) {
		console.error('Error reading session:', error);
		return json({ error: error.message }, { status: 500 });
	}
}