// Centralized agent color utilities for consistent coloring across the app
// Carefully curated palette for light mode with maximum distinction
// Colors are ordered to ensure dissimilar colors are assigned sequentially

export const agentColorPalette = [
	{ hex: '#0066cc' },  // blue
	{ hex: '#d94f00' },  // orange
	{ hex: '#7c3f8f' },  // purple
	{ hex: '#00a86b' },  // green
	{ hex: '#dc143c' },  // crimson
	{ hex: '#1e6f8f' },  // teal
	{ hex: '#c77700' },  // amber
	{ hex: '#8b4789' },  // violet
	{ hex: '#2d7a3e' },  // forest green
	{ hex: '#b8336a' },  // magenta
	{ hex: '#005f8c' },  // navy
	{ hex: '#a85300' },  // burnt orange
];

export const defaultColor = {
	hex: '#6b7280' // neutral gray for user/system
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