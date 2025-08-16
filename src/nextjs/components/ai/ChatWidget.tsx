'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type UserMessage = {
	id: string
	content: string
}

type AssistantMessage = {
	id: string
	content: string
}

export default function ChatWidget() {
	const [isOpen, setIsOpen] = useState(true)
	const [input, setInput] = useState('')
	const [messages, setMessages] = useState<Array<UserMessage | AssistantMessage>>([])
	const [isThinking, setIsThinking] = useState(false)
	const scrollRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		if (isOpen) {
			textareaRef.current?.focus()
		}
	}, [isOpen])

	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
	}, [messages])

	function handleToggle() {
		setIsOpen((v) => !v)
	}

	async function handleSend() {
		const content = input.trim()
		if (!content) return
		const userId = `${Date.now()}-u`
		setMessages((prev) => [...prev, { id: userId, content }])
		setInput('')
		setIsThinking(true)

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ message: content })
			})
			const data = (await res.json()) as { answer?: string; content?: string; code?: string; message?: string }
			if (!res.ok) {
				const assistantId = `${Date.now()}-e`
				const isQuota = res.status === 429 || data?.code === 'llm_quota_exceeded'
				setMessages((prev) => [...prev, { id: assistantId, content: isQuota ? 'LLM quota exceeded. Please try again later or check billing.' : (data?.message || 'Sorry, the system is temporarily unavailable.') }])
				return
			}

			const assistantId = `${Date.now()}-a`
			setMessages((prev) => [...prev, { id: assistantId, content: data.answer || data.content || '(no content)' }])
		} catch (e) {
			const assistantId = `${Date.now()}-e`
			setMessages((prev) => [...prev, { id: assistantId, content: 'Sorry, the system is temporarily unavailable.' }])
		} finally {
			setIsThinking(false)
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	const containerClasses = useMemo(() => {
		const base = 'fixed z-50 transition-all ease-out duration-200'
		const pos = 'right-4 bottom-4'
		const size = 'w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] md:w-[380px] md:h-[560px]'
		const visible = isOpen
			? 'opacity-100 translate-y-0 scale-100'
			: 'pointer-events-none opacity-0 translate-y-2 scale-95'
		return [base, pos, size, visible].join(' ')
	}, [isOpen])

	return (
		<>
			{/* Floating Action Button (minimized) */}
			<button
				aria-label={isOpen ? 'Close chat' : 'Open chat'}
				onClick={handleToggle}
				className={[
					'fixed right-4 bottom-4 z-50 md:right-5 md:bottom-5',
					'inline-flex items-center justify-center rounded-full shadow-lg',
					'h-14 w-14 md:h-16 md:w-16',
					'bg-accent text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent',
					isOpen ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100',
					'transition-all duration-200 ease-out'
				].join(' ')}
			>
				<ChatBubbleIcon className="h-7 w-7" />
			</button>

			{/* Chat Panel */}
			<div
				role="dialog"
				aria-modal="true"
				aria-hidden={!isOpen}
				className={containerClasses}
			>
				<div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
					{/* Header */}
					<div className="flex items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
						<div className="flex items-center gap-2">
							<div className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-accent">
								<BotIcon className="h-5 w-5" />
							</div>
							<div className="leading-tight">
								<div className="text-lg font-semibold text-white">ResumeBot</div>
							</div>
						</div>
						<div className="ml-auto">
							<button
								className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
								aria-label="Minimize"
								onClick={handleToggle}
							>
								<MinusIcon className="h-5 w-5" />
							</button>
						</div>
					</div>

					{/* Messages */}
					<div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
						{messages.length === 0 ? (
							<div className="grid h-full place-items-center text-center">
								<div className="space-y-2">
									<div className="text-md font-medium text-zinc-700 dark:text-zinc-200">Start chatting</div>
									<div className="text-sm text-zinc-500 dark:text-zinc-400">Hi 👋 You can ask anything about my education, projects, or skills here.</div>
								</div>
							</div>
						) : (
							<ul className="space-y-3">
								{messages.map((m, idx) => {
									const isUser = String(m.id).endsWith('-u')
									return (
										<li key={m.id ?? idx} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
											<div className={isUser
												? 'max-w-[85%] rounded-2xl bg-accent px-3 py-2 text-sm text-white shadow'
												: 'max-w-[85%] rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-100'}>
												{m.content}
											</div>
										</li>
									)
								})}
								{isThinking && (
									<li className="flex justify-start">
										<div className="max-w-[85%] rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-100">
											<span className="inline-flex items-center gap-2">
												<span>Typing</span>
												<span className="inline-flex items-center" aria-hidden="true">
													<span className="mx-[2px] h-[6px] w-[6px] rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
													<span className="mx-[2px] h-[6px] w-[6px] rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
													<span className="mx-[2px] h-[6px] w-[6px] rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
												</span>
											</span>
										</div>
									</li>
								)}
							</ul>
						)}
					</div>

					{/* Composer */}
					<div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
						<form
							onSubmit={(e) => {
								e.preventDefault()
								handleSend()
							}}
							className="flex items-end gap-2"
						>
							<textarea
								ref={textareaRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								rows={1}
								placeholder="Type your message"
								className="min-h-[44px] max-h-36 w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
							/>
							<button
								type="submit"
								className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-accent px-3 text-sm font-medium text-white shadow hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
								disabled={!input.trim() || isThinking}
							>
								Send
							</button>
						</form>
					</div>
				</div>
			</div>
		</>
	)
}

function ChatBubbleIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
		</svg>
	)
}

function MinusIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M5 12h14" />
		</svg>
	)
}

function BotIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect x="3" y="8" width="18" height="10" rx="2" />
			<path d="M12 2v4" />
			<circle cx="8" cy="13" r="1" />
			<circle cx="16" cy="13" r="1" />
		</svg>
	)
}


