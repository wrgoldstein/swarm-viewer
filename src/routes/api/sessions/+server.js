import { json } from '@sveltejs/kit';
import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { constants } from 'fs';

const SESSIONS_DIR = join(homedir(), '.claude-swarm', 'sessions');
const RUN_DIR = join(homedir(), '.claude-swarm', 'run');

async function isActiveSession(sessionId) {
	try {
		const runLinkPath = join(RUN_DIR, sessionId);
		await access(runLinkPath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

export async function GET() {
	try {
		// Read all project directories
		const projectDirs = await readdir(SESSIONS_DIR);
		const sessions = [];

		for (const projectDir of projectDirs) {
			if (projectDir.startsWith('.')) continue;

			const projectPath = join(SESSIONS_DIR, projectDir);

			// Read session UUIDs within each project
			const sessionIds = await readdir(projectPath);

			for (const sessionId of sessionIds) {
				if (sessionId.startsWith('.')) continue;

				const sessionPath = join(projectPath, sessionId);
				const metadataPath = join(sessionPath, 'session_metadata.json');

				try {
					const metadataContent = await readFile(metadataPath, 'utf-8');
					const metadata = JSON.parse(metadataContent);

					// Check if this session is active
					const active = await isActiveSession(sessionId);

					sessions.push({
						id: `${projectDir}/${sessionId}`,
						projectDir,
						sessionId,
						active,
						...metadata
					});
				} catch (err) {
					console.error(`Error reading metadata for ${sessionId}:`, err);
				}
			}
		}

		// Sort by active first, then timestamp (newest first)
		sessions.sort((a, b) => {
			if (a.active !== b.active) return a.active ? -1 : 1;
			return new Date(b.timestamp) - new Date(a.timestamp);
		});

		return json(sessions);
	} catch (error) {
		console.error('Error listing sessions:', error);
		return json({ error: error.message }, { status: 500 });
	}
}