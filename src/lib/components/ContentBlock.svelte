<script>
	import ToolResult from './ToolResult.svelte';

	let { block, sessionId, eventIndex, blockIdx, expandedThinking } = $props();

	const blockKey = `${sessionId}-${eventIndex}-${blockIdx}`;
	let isExpanded = $state(false)

	function toggleExpanded() {
		isExpanded = !isExpanded
	}

	function isFileContent(text) {
		// Detect Read tool output format with line numbers like "     1→"
		const lines = text.split('\n');
		if (lines.length < 3) return false;
		return lines.slice(0, 3).every(line => /^\s+\d+→/.test(line) || line.trim() === '');
	}

	function isEditTool(block) {
		return block.name === 'Edit' && block.input?.old_string && block.input?.new_string;
	}

	function generateDiff(oldString, newString, filePath) {
		const oldLines = oldString.split('\n');
		const newLines = newString.split('\n');

		let diff = `--- ${filePath}\n+++ ${filePath}\n`;

		// Simple line-by-line diff
		const maxLines = Math.max(oldLines.length, newLines.length);
		let inChange = false;
		let changeStart = 0;

		for (let i = 0; i < maxLines; i++) {
			const oldLine = oldLines[i];
			const newLine = newLines[i];

			if (oldLine !== newLine) {
				if (!inChange) {
					changeStart = i;
					inChange = true;
				}
			}
		}

		// Build unified diff format
		diff += `@@ -1,${oldLines.length} +1,${newLines.length} @@\n`;

		for (let i = 0; i < maxLines; i++) {
			const oldLine = oldLines[i];
			const newLine = newLines[i];

			if (oldLine === newLine && oldLine !== undefined) {
				diff += ` ${oldLine}\n`;
			} else {
				if (oldLine !== undefined) {
					diff += `-${oldLine}\n`;
				}
				if (newLine !== undefined) {
					diff += `+${newLine}\n`;
				}
			}
		}

		return diff;
	}

	function getToolSummary(toolName, input) {
		if (toolName === 'Bash') {
			return input.description || input.command?.substring(0, 60) || 'Run bash command';
		} else if (toolName === 'Read') {
			const path = input.file_path || '';
			const filename = path.split('/').pop();
			return `Read ${filename}`;
		} else if (toolName === 'Edit') {
			const path = input.file_path || '';
			const filename = path.split('/').pop();
			return `Edit ${filename}`;
		} else if (toolName === 'Write') {
			const path = input.file_path || '';
			const filename = path.split('/').pop();
			return `Write ${filename}`;
		} else if (toolName === 'Glob') {
			return `Find files: ${input.pattern}`;
		} else if (toolName === 'Grep') {
			return `Search for: ${input.pattern}`;
		}
		return toolName;
	}
</script>

{#if block.type === 'text'}
	{#if isFileContent(block.text)}
		<div class="bg-gray-50 rounded border border-gray-200 overflow-hidden">
			<div class="bg-white px-3 py-2 border-b border-gray-200">
				<span class="text-xs font-mono text-gray-500 uppercase tracking-wide">File Content</span>
			</div>
			<pre class="text-xs text-gray-800 font-mono overflow-x-auto p-4 leading-relaxed">{block.text}</pre>
		</div>
	{:else}
		<pre class="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed">{block.text}</pre>
	{/if}
{:else if block.type === 'tool_use'}
	<div>
		{#if isEditTool(block)}
			<!-- Special diff view for Edit tool -->
			<button
				onclick={toggleExpanded}
				class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100 transition-colors cursor-pointer"
			>
				<svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<span class="font-mono text-gray-700 font-light">{block.name}</span>
				<span class="text-gray-400 font-mono text-xs">{block.input.file_path.split('/').pop()}</span>
				<svg class="w-3 h-3 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if isExpanded}
				<div class="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
					<div class="bg-white px-3 py-2 border-b border-gray-200">
						<span class="text-xs font-mono text-gray-500">{block.input.file_path}</span>
					</div>
					<pre class="text-xs font-mono overflow-x-auto p-4 leading-relaxed">{#each generateDiff(block.input.old_string, block.input.new_string, block.input.file_path).split('\n') as line}<span class:text-red-600={line.startsWith('-')} class:text-green-600={line.startsWith('+')} class:text-gray-500={line.startsWith('@') || line.startsWith('---') || line.startsWith('+++')} class:bg-red-50={line.startsWith('-')} class:bg-green-50={line.startsWith('+')}>{line}</span>
{/each}</pre>
				</div>
			{/if}
		{:else}
			<!-- Regular tool display -->
			{@const summary = getToolSummary(block.name, block.input || {})}
			<button
				onclick={toggleExpanded}
				class="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100 transition-colors cursor-pointer"
			>
				<svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<span class="font-mono text-gray-700 font-light">
					{block.name}
					{#if summary && summary !== block.name && summary.trim() !== ''}
						<span class="text-gray-500"> — {summary}</span>
					{/if}
				</span>
				{#if block.input && Object.keys(block.input).length > 0}
					<svg class="w-3 h-3 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				{/if}
			</button>
			{#if isExpanded && block.input}
				<div class="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
					<div class="bg-white px-3 py-2 border-b border-gray-200">
						<span class="text-xs font-mono text-gray-500 uppercase tracking-wide">Tool Input</span>
					</div>
					<pre class="text-xs text-gray-800 font-mono overflow-x-auto p-4 leading-relaxed">{JSON.stringify(block.input, null, 2)}</pre>
				</div>
			{/if}
		{/if}
	</div>
{:else if block.type === 'tool_result'}
	<ToolResult {block} />
{/if}