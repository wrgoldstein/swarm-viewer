// Centralized agent color utilities for consistent coloring across the app
// Using ColorBrewer Set3 palette for better visual distinction

export const agentColorPalette = [
	{ hex: '#a6cee3' },
	{ hex: '#1f78b4' },
	{ hex: '#b2df8a' },
	{ hex: '#33a02c' },
	{ hex: '#fb9a99' },
	{ hex: '#e31a1c' },
	{ hex: '#fdbf6f' },
	{ hex: '#ff7f00' },
	{ hex: '#cab2d6' },
	{ hex: '#6a3d9a' },
	{ hex: '#ffff99' },
	{ hex: '#b15928' }
];

export const defaultColor = {
	hex: '#ff7f00' // orange for user/system
};

// Track assigned colors to avoid reuse
const agentColorMap = new Map();
let nextColorIndex = 0;

export function hashString(str) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash) + str.charCodeAt(i);
		hash = hash & hash;
	}
	return Math.abs(hash);
}

export function getAgentHexColor(agentName) {
	if (agentName === 'user' || agentName === 'system') {
		return defaultColor.hex;
	}

	// Check if we've already assigned a color to this agent
	if (agentColorMap.has(agentName)) {
		return agentColorMap.get(agentName);
	}

	// Assign the next available color
	const color = agentColorPalette[nextColorIndex % agentColorPalette.length].hex;
	agentColorMap.set(agentName, color);
	nextColorIndex++;

	return color;
}

// Function to reset color assignments (useful for testing or new sessions)
export function resetColorAssignments() {
	agentColorMap.clear();
	nextColorIndex = 0;
}

// Generate dynamic Tailwind-compatible style string for text color
export function getAgentTextStyle(agentName) {
	return `color: ${getAgentHexColor(agentName)}`;
}

// Generate dynamic Tailwind-compatible style string for border color
export function getAgentBorderStyle(agentName) {
	return `border-color: ${getAgentHexColor(agentName)}`;
}

// Generate dynamic Tailwind-compatible style string for background color
export function getAgentBgStyle(agentName) {
	return `background-color: ${getAgentHexColor(agentName)}`;
}

// For compatibility with existing code
export function getAgentTextColor(agentName) {
	return getAgentHexColor(agentName);
}

export function getAgentBorderColor(agentName) {
	return getAgentHexColor(agentName);
}

export function getAgentBgColor(agentName) {
	return getAgentHexColor(agentName);
}