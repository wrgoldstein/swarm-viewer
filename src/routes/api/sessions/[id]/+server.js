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

export async function GET({ params }) {
	try {
		// params.id is in format "projectDir/sessionId"
		const [projectDir, sessionId] = params.id.split('/');
		const sessionPath = join(SESSIONS_DIR, projectDir, sessionId);

		// Read session metadata
		const metadataPath = join(sessionPath, 'session_metadata.json');
		const metadataContent = await readFile(metadataPath, 'utf-8');
		const metadata = JSON.parse(metadataContent);

		// Read session.log.json (NDJSON format)
		const jsonLogPath = join(sessionPath, 'session.log.json');
		let events = [];

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
