import { json } from '@sveltejs/kit';
import { readdir, readFile, access, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { constants } from 'fs';

const SWARM_SESSIONS_DIR = join(homedir(), '.claude-swarm', 'sessions');
const SWARM_RUN_DIR = join(homedir(), '.claude-swarm', 'run');
const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

async function isActiveSwarmSession(sessionId) {
	try {
		const runLinkPath = join(SWARM_RUN_DIR, sessionId);
		await access(runLinkPath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

async function getSwarmSessions() {
	const sessions = [];
	try {
		const projectDirs = await readdir(SWARM_SESSIONS_DIR);

		for (const projectDir of projectDirs) {
			if (projectDir.startsWith('.')) continue;

			const projectPath = join(SWARM_SESSIONS_DIR, projectDir);

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
					const active = await isActiveSwarmSession(sessionId);

					sessions.push({
						id: `swarm:${projectDir}/${sessionId}`,
						type: 'swarm',
						projectDir,
						sessionId,
						active,
						...metadata
					});
				} catch (err) {
					console.error(`Error reading swarm metadata for ${sessionId}:`, err);
				}
			}
		}
	} catch (error) {
		console.error('Error reading swarm sessions:', error);
	}
	return sessions;
}

async function getClaudeSessions() {
	const sessions = [];
	try {
		const projectDirs = await readdir(CLAUDE_PROJECTS_DIR);

		for (const projectDir of projectDirs) {
			if (projectDir.startsWith('.')) continue;

			const projectPath = join(CLAUDE_PROJECTS_DIR, projectDir);
			let files;
			try {
				files = await readdir(projectPath);
			} catch {
				continue;
			}

			// Find all .jsonl files (these are session files)
			const sessionFiles = files.filter(f => f.endsWith('.jsonl'));

			for (const sessionFile of sessionFiles) {
				const sessionId = sessionFile.replace('.jsonl', '');
				const sessionPath = join(projectPath, sessionFile);

				try {
					const stats = await stat(sessionPath);
					const fileContent = await readFile(sessionPath, 'utf-8');
					const lines = fileContent.trim().split('\n').filter(l => l.trim());

					if (lines.length === 0) continue;

					// Find summary, timestamp, and cwd from the session
					let summary = 'Untitled';
					let timestamp = null;
					let cwd = null;
					let firstUserMessage = null;
					let isWarmup = false;

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

									// Check if this is a warmup session
									if (content.trim().toLowerCase() === 'warmup') {
										isWarmup = true;
									}
								}
							}

							// Stop if we have both
							if (summary !== 'Untitled' && timestamp) break;
						} catch (e) {
							// Skip malformed lines
						}
					}

					// Skip warmup sessions (these are redundant with swarm sessions)
					if (isWarmup) continue;

					// Use first user message as title if no summary found
					if (summary === 'Untitled' && firstUserMessage) {
						summary = firstUserMessage;
					}

					const messageCount = lines.filter(l => {
						try {
							const e = JSON.parse(l);
							return e.type === 'user' || e.type === 'assistant';
						} catch { return false; }
					}).length;

					// Skip sessions with no messages
					if (messageCount === 0) continue;

					// Check if session is active (modified within last 2 minutes)
					const now = Date.now();
					const fileAge = now - stats.mtime.getTime();
					const isActive = fileAge < 2 * 60 * 1000; // 2 minutes

					sessions.push({
						id: `claude:${projectDir}/${sessionId}`,
						type: 'claude',
						projectDir,
						sessionId,
						active: isActive,
						swarm_name: summary,
						root_directory: cwd || projectDir,
						start_time: timestamp || stats.mtime.toISOString(),
						timestamp: timestamp || stats.mtime.toISOString(),
						message_count: messageCount
					});
				} catch (err) {
					console.error(`Error reading claude session ${sessionFile}:`, err);
				}
			}
		}
	} catch (error) {
		console.error('Error reading claude sessions:', error);
	}
	return sessions;
}

export async function GET({ url }) {
	try {
		const type = url.searchParams.get('type') || 'all'; // 'swarm', 'claude', or 'all'

		let sessions = [];

		if (type === 'swarm' || type === 'all') {
			const swarmSessions = await getSwarmSessions();
			sessions.push(...swarmSessions);
		}

		if (type === 'claude' || type === 'all') {
			const claudeSessions = await getClaudeSessions();
			sessions.push(...claudeSessions);
		}

		// Sort by active first, then timestamp (newest first)
		sessions.sort((a, b) => {
			if (a.active !== b.active) return a.active ? -1 : 1;
			return new Date(b.timestamp) - new Date(a.timestamp);
		});

		// When showing all sessions, interleave types while keeping active sessions first
		if (type === 'all' && sessions.length > 20) {
			// Separate active and inactive sessions
			const activeSessions = sessions.filter(s => s.active);
			const inactiveSessions = sessions.filter(s => !s.active);

			// Interleave active sessions by type
			const activeSwarm = activeSessions.filter(s => s.type === 'swarm');
			const activeClaude = activeSessions.filter(s => s.type === 'claude');
			const activeInterleaved = [];
			const activeMaxLen = Math.max(activeSwarm.length, activeClaude.length);
			for (let i = 0; i < activeMaxLen; i++) {
				if (i < activeSwarm.length) activeInterleaved.push(activeSwarm[i]);
				if (i < activeClaude.length) activeInterleaved.push(activeClaude[i]);
			}

			// Interleave inactive sessions by type
			const inactiveSwarm = inactiveSessions.filter(s => s.type === 'swarm');
			const inactiveClaude = inactiveSessions.filter(s => s.type === 'claude');
			const inactiveInterleaved = [];
			const inactiveMaxLen = Math.max(inactiveSwarm.length, inactiveClaude.length);
			for (let i = 0; i < inactiveMaxLen; i++) {
				if (i < inactiveSwarm.length) inactiveInterleaved.push(inactiveSwarm[i]);
				if (i < inactiveClaude.length) inactiveInterleaved.push(inactiveClaude[i]);
			}

			// Combine: active first, then inactive
			sessions = [...activeInterleaved, ...inactiveInterleaved];
		}

		return json(sessions);
	} catch (error) {
		console.error('Error listing sessions:', error);
		return json({ error: error.message }, { status: 500 });
	}
}