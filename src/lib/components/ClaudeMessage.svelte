<script>
	import { getAgentTextColor, getAgentBorderColor } from '$lib/utils/agentColors.js';

	let { event, expandedThinking } = $props();
	let expandedTools = $state(new Set());

	function getMessageContent() {
		if (!event.message) return null;

		const content = event.message.content;

		// If content is a string, return it as a text block
		if (typeof content === 'string') {
			return [{ type: 'text', text: content }];
		}

		// If content is an array, return as-is
		if (Array.isArray(content)) {
			return content;
		}

		return null;
	}

	function toggleThinking() {
		if (expandedThinking.has(event.event_id)) {
			expandedThinking.delete(event.event_id);
		} else {
			expandedThinking.add(event.event_id);
		}
		expandedThinking = new Set(expandedThinking);
	}

	function toggleTool(toolId) {
		if (expandedTools.has(toolId)) {
			expandedTools.delete(toolId);
		} else {
			expandedTools.add(toolId);
		}
		expandedTools = new Set(expandedTools);
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

	function parseTextWithCodeBlocks(text) {
		// Parse markdown code blocks from text
		const blocks = [];
		const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
		let lastIndex = 0;
		let match;

		while ((match = codeBlockRegex.exec(text)) !== null) {
			// Add text before code block
			if (match.index > lastIndex) {
				const textBefore = text.substring(lastIndex, match.index);
				if (textBefore.trim()) {
					blocks.push({ type: 'text', content: textBefore });
				}
			}

			// Add code block
			blocks.push({
				type: 'code',
				language: match[1] || '',
				content: match[2]
			});

			lastIndex = match.index + match[0].length;
		}

		// Add remaining text
		if (lastIndex < text.length) {
			const remaining = text.substring(lastIndex);
			if (remaining.trim()) {
				blocks.push({ type: 'text', content: remaining });
			}
		}

		return blocks.length > 0 ? blocks : [{ type: 'text', content: text }];
	}

	function renderDiff(oldStr, newStr) {
		// Simple diff rendering - show removed and added lines
		const oldLines = oldStr.split('\n');
		const newLines = newStr.split('\n');
		return { oldLines, newLines };
	}

	const contentBlocks = getMessageContent();
	const role = event.message?.role || event.type;
	const isUser = role === 'user';
	const isAssistant = role === 'assistant';

	// Get border color for the agent
	const agent = isUser ? 'user' : 'assistant';
	const borderColor = getAgentBorderColor(agent);
</script>

<div class="message-container {isUser ? 'user-message' : 'assistant-message'}" style="border-left: 3px solid {borderColor};">
	<!-- Role badge -->
	<div class="flex items-center gap-2 mb-2">
		<span
			class="text-xs font-medium px-2 py-1 rounded"
			style={isUser ? '' : `color: ${getAgentTextColor('assistant')}; border: 1px solid ${getAgentBorderColor('assistant')};`}
			class:bg-gray-100={isUser}
			class:text-gray-700={isUser}
		>
			{isUser ? 'User' : 'Assistant'}
		</span>
		{#if event.timestamp}
			<span class="text-xs text-gray-400 font-mono">
				{new Date(event.timestamp).toLocaleTimeString()}
			</span>
		{/if}
	</div>

	<!-- Content blocks -->
	{#if contentBlocks}
		<div class="space-y-3">
			{#each contentBlocks as block, i}
				{#if block.type === 'text'}
					{@const parsedBlocks = parseTextWithCodeBlocks(block.text)}
					{#each parsedBlocks as parsed}
						{#if parsed.type === 'text'}
							<div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
								{parsed.content}
							</div>
						{:else if parsed.type === 'code'}
							<div class="border border-gray-300 rounded bg-gray-900 overflow-hidden">
								{#if parsed.language}
									<div class="px-3 py-1 bg-gray-800 text-gray-400 text-xs font-mono border-b border-gray-700">
										{parsed.language}
									</div>
								{/if}
								<pre class="p-3 overflow-x-auto"><code class="text-sm text-gray-100 font-mono">{parsed.content}</code></pre>
							</div>
						{/if}
					{/each}

				{:else if block.type === 'thinking'}
					<div class="border-l-2 border-purple-300 bg-purple-50 rounded">
						<button
							onclick={toggleThinking}
							class="w-full text-left px-3 py-2 text-xs text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-2"
						>
							<span class="transform transition-transform {expandedThinking.has(event.event_id) ? 'rotate-90' : ''}">▶</span>
							<span class="font-medium">Thinking...</span>
						</button>
						{#if expandedThinking.has(event.event_id)}
							<div class="px-3 pb-3 text-xs text-purple-900 whitespace-pre-wrap font-mono">
								{block.thinking || block.text}
							</div>
						{/if}
					</div>

				{:else if block.type === 'tool_use'}
					{@const toolId = `${event.event_id}-${block.id}`}
					{@const isExpanded = expandedTools.has(toolId)}
					<div class="border border-gray-300 rounded bg-gray-50">
						<button
							onclick={() => toggleTool(toolId)}
							class="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-between"
						>
							<div class="flex items-center gap-2">
								<span class="transform transition-transform {isExpanded ? 'rotate-90' : ''}">▶</span>
								<span class="font-medium">{getToolSummary(block.name, block.input)}</span>
							</div>
							<span class="text-gray-500 font-mono text-xs">{block.name}</span>
						</button>
						{#if isExpanded}
							<div class="border-t border-gray-300 px-3 py-2">
								{#if block.name === 'Edit' && block.input?.old_string && block.input?.new_string}
									{@const diff = renderDiff(block.input.old_string, block.input.new_string)}
									<div class="text-xs mb-2 text-gray-600 font-mono">
										File: {block.input.file_path || 'unknown'}
									</div>
									<div class="border border-gray-300 rounded overflow-hidden">
										<div class="bg-red-50 border-b border-red-200">
											<div class="px-2 py-1 text-xs text-red-700 font-semibold">- Old</div>
											<pre class="px-2 pb-2 text-xs text-red-900 overflow-x-auto"><code>{block.input.old_string}</code></pre>
										</div>
										<div class="bg-green-50">
											<div class="px-2 py-1 text-xs text-green-700 font-semibold">+ New</div>
											<pre class="px-2 pb-2 text-xs text-green-900 overflow-x-auto"><code>{block.input.new_string}</code></pre>
										</div>
									</div>
								{:else if block.name === 'Bash'}
									<div class="space-y-2">
										{#if block.input.description}
											<div class="text-xs text-gray-600">{block.input.description}</div>
										{/if}
										<div class="bg-gray-900 rounded p-2">
											<pre class="text-xs text-green-400 font-mono overflow-x-auto"><code>{block.input.command}</code></pre>
										</div>
										{#if block.input.timeout}
											<div class="text-xs text-gray-500">Timeout: {block.input.timeout}ms</div>
										{/if}
									</div>
								{:else if block.name === 'Read'}
									<div class="text-xs text-gray-700 font-mono">
										<div class="mb-1 text-gray-600">File path:</div>
										<div class="bg-white p-2 rounded border border-gray-200">{block.input.file_path}</div>
										{#if block.input.offset || block.input.limit}
											<div class="mt-2 text-gray-600">
												{#if block.input.offset}Offset: {block.input.offset}{/if}
												{#if block.input.limit}Limit: {block.input.limit}{/if}
											</div>
										{/if}
									</div>
								{:else if block.name === 'Write' || block.name === 'Edit'}
									<div class="text-xs text-gray-700 font-mono">
										<div class="mb-1 text-gray-600">File path:</div>
										<div class="bg-white p-2 rounded border border-gray-200 mb-2">{block.input.file_path}</div>
										{#if block.input.content}
											<div class="text-gray-600 mb-1">Content preview:</div>
											<div class="bg-gray-900 rounded p-2 max-h-40 overflow-auto">
												<pre class="text-xs text-gray-100"><code>{block.input.content.substring(0, 500)}{block.input.content.length > 500 ? '...' : ''}</code></pre>
											</div>
										{/if}
									</div>
								{:else}
									<pre class="text-xs text-gray-700 overflow-x-auto"><code>{JSON.stringify(block.input, null, 2)}</code></pre>
								{/if}
							</div>
						{/if}
					</div>

				{:else if block.type === 'tool_result'}
					{@const resultId = `result-${event.event_id}-${block.tool_use_id}`}
					{@const isExpanded = expandedTools.has(resultId)}
					{@const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
					{@const preview = content.substring(0, 100)}
					<div class="border border-blue-300 rounded bg-blue-50">
						<button
							onclick={() => toggleTool(resultId)}
							class="w-full text-left px-3 py-2 text-xs text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-between"
						>
							<div class="flex items-center gap-2">
								<span class="transform transition-transform {isExpanded ? 'rotate-90' : ''}">▶</span>
								<span class="font-medium">Tool Result</span>
								{#if !isExpanded && preview}
									<span class="text-blue-600 truncate max-w-md">{preview}{content.length > 100 ? '...' : ''}</span>
								{/if}
							</div>
							<span class="text-blue-500 font-mono text-xs">{content.length} chars</span>
						</button>
						{#if isExpanded}
							<div class="border-t border-blue-300 px-3 py-2">
								<pre class="text-xs text-blue-900 overflow-x-auto whitespace-pre-wrap"><code>{content}</code></pre>
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Tool result messages (separate message type) -->
	{#if event.type === 'user' && event.toolUseResult}
		{@const resultId = `result-${event.event_id}-tool`}
		{@const isExpanded = expandedTools.has(resultId)}
		{@const result = event.toolUseResult}

		{#if result.filePath && result.oldString && result.newString}
			<!-- Special rendering for Edit tool results -->
			<div class="border border-green-300 rounded bg-green-50 mt-2">
				<button
					onclick={() => toggleTool(resultId)}
					class="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-100 transition-colors flex items-center justify-between"
				>
					<div class="flex items-center gap-2">
						<span class="transform transition-transform {isExpanded ? 'rotate-90' : ''}">▶</span>
						<span class="font-medium">Edit: {result.filePath.split('/').pop()}</span>
					</div>
					<span class="text-green-600 text-xs">✓ Success</span>
				</button>
				{#if isExpanded}
					<div class="border-t border-green-300 px-3 py-2">
						<div class="text-xs mb-2 text-gray-600 font-mono">{result.filePath}</div>
						<div class="border border-gray-300 rounded overflow-hidden">
							<div class="bg-red-50 border-b border-red-200">
								<div class="px-2 py-1 text-xs text-red-700 font-semibold">- Removed</div>
								<pre class="px-2 pb-2 text-xs text-red-900 overflow-x-auto"><code>{result.oldString}</code></pre>
							</div>
							<div class="bg-green-50">
								<div class="px-2 py-1 text-xs text-green-700 font-semibold">+ Added</div>
								<pre class="px-2 pb-2 text-xs text-green-900 overflow-x-auto"><code>{result.newString}</code></pre>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Generic tool result -->
			{@const content = JSON.stringify(result, null, 2)}
			{@const preview = content.substring(0, 100)}
			<div class="border border-blue-300 rounded bg-blue-50 mt-2">
				<button
					onclick={() => toggleTool(resultId)}
					class="w-full text-left px-3 py-2 text-xs text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-between"
				>
					<div class="flex items-center gap-2">
						<span class="transform transition-transform {isExpanded ? 'rotate-90' : ''}">▶</span>
						<span class="font-medium">Tool Result</span>
						{#if !isExpanded && preview}
							<span class="text-blue-600 truncate max-w-md">{preview}{content.length > 100 ? '...' : ''}</span>
						{/if}
					</div>
					<span class="text-blue-500 font-mono text-xs">{content.length} chars</span>
				</button>
				{#if isExpanded}
					<div class="border-t border-blue-300 px-3 py-2 text-xs text-blue-900">
						<pre class="whitespace-pre-wrap overflow-x-auto"><code>{content}</code></pre>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.message-container {
		padding: 1rem;
		border-radius: 0.5rem;
	}

	.user-message {
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
	}

	.assistant-message {
		background-color: #ffffff;
		border: 1px solid #e5e7eb;
	}

	pre code {
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.75rem;
	}
</style>
