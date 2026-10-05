import { useEffect, useMemo, useState } from 'react'
import { tutorials } from '@/data/git-assist-tutorials'
import { categories, knowledge } from '@/data/git-assist-knowledge'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import './LearningSection.css'

import type {
  ChatMessage,
  KnowledgeCategory,
  KnowledgeConcept,
  ModalState,
  Pillar,
  Tutorial,
} from './types'
import { LearningSidebar } from './LearningSidebar'
import { LearningCoachCard } from './LearningCoachCard'
import { LearningSimulator } from './LearningSimulator'
import { KnowledgeExplorer } from './KnowledgeExplorer'
import { LearningConceptModal } from './LearningConceptModal'
import { LearningChatDrawer } from './LearningChatDrawer'
import { AILearningModulesView } from './AILearningModulesView'

const STORAGE_KEYS = {
  completed: 'git_assist_completed_tutorials',
  chat: 'git_assist_chat_messages',
}

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

const saveStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage may be unavailable */
  }
}

const typedTutorials = tutorials as Tutorial[]
const typedCategories = categories as KnowledgeCategory[]
const typedKnowledge = knowledge as KnowledgeConcept[]

export function LearningSection() {
  const [pillar, setPillar] = useState<Pillar>('learn')
  const [tutorialId, setTutorialId] = useState<string>('branch')
  const [step, setStep] = useState(0)
  const [lessonComplete, setLessonComplete] = useState(false)
  const [completed, setCompleted] = useState<string[]>(() =>
    readStorage(STORAGE_KEYS.completed, []),
  )
  const username = useAuthStore((state) => state.user?.username ?? 'you')

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [modal, setModal] = useState<ModalState>(null)

  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    readStorage(STORAGE_KEYS.chat, [
      {
        role: 'assist',
        text: 'Hi! I’m Assist, your Git and GitHub learning companion. What would you like to understand?',
      },
    ]),
  )
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const [branch, setBranch] = useState('main')
  const [branchMenu, setBranchMenu] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [notice, setNotice] = useState('')

  const tutorial = typedTutorials.find((t) => t.id === tutorialId) || typedTutorials[0]
  const coach = tutorial.coachConfigs[Math.min(step, tutorial.coachConfigs.length - 1)]

  const filteredKnowledge = useMemo(
    () =>
      typedKnowledge.filter(
        (item) =>
          (category === 'all' || item.category === category) &&
          (!search ||
            `${item.title} ${item.short} ${item.explanation} ${item.categoryName}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [category, search],
  )

  const isDone = (id: string) => completed.includes(id)

  useEffect(() => {
    saveStorage(STORAGE_KEYS.completed, completed)
  }, [completed])

  useEffect(() => {
    saveStorage(STORAGE_KEYS.chat, messages)
  }, [messages])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModal(null)
        setChatOpen(false)
      }
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes(
          (document.activeElement as HTMLElement)?.tagName,
        )
      ) {
        e.preventDefault()
        setPillar('knowledge')
        setTimeout(() => document.getElementById('concept-search')?.focus(), 0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function startTutorial(id: string) {
    setTutorialId(id)
    setStep(0)
    setLessonComplete(false)
    setBranch('main')
    setBranchMenu(false)
    setBranchName('')
    setPillar('learn')
  }

  function completeStep(createdBranch?: string) {
    if (createdBranch) {
      setBranch(createdBranch)
      setNotice(`Switched to branch: ${createdBranch}`)
      setTimeout(() => setNotice(''), 2500)
    }
    if (step + 1 < tutorial.steps.length) {
      setStep((value) => value + 1)
      return
    }
    setCompleted((value) =>
      value.includes(tutorial.id) ? value : [...value, tutorial.id],
    )
    setNotice(`Tutorial completed: ${tutorial.title}`)
    setTimeout(() => setNotice(''), 3000)
    setLessonComplete(true)
  }

  function goToNextTutorial() {
    const currentIndex = typedTutorials.findIndex((item) => item.id === tutorial.id)
    startTutorial(typedTutorials[currentIndex + 1]?.id ?? typedTutorials[0].id)
  }

  function send(text = draft) {
    const q = text.trim()
    if (!q || sending) return
    const next: ChatMessage[] = [...messages, { role: 'user', text: q }]
    setMessages(next)
    setDraft('')
    setSending(true)
    fetch('/api/v1/chatbot/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: q,
        skill_profile: {
          skill_level: 'beginner',
          tech_stack: ['Git', 'GitHub', 'React', 'TypeScript'],
          learning_goals: ['Learn Git and GitHub workflows for open-source contribution'],
        },
      }),
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error('offline')
        return data.answer as string
      })
      .catch(() => {
        const match = typedKnowledge.find((k) =>
          `${k.title} ${k.short} ${k.explanation}`.toLowerCase().includes(
            q
              .toLowerCase()
              .split(/\W+/)
              .find((w) => w.length > 3) || '',
          ),
        )
        return match
          ? `${match.short}\n\n${match.whyItMatters || ''}`
          : 'I’m having trouble reaching the AI service right now. Try the Knowledge area for a quick answer, or ask me again in a moment.'
      })
      .then((reply) =>
        setMessages((v) => [...v, { role: 'assist', text: reply }]),
      )
      .finally(() => setSending(false))
  }

  const currentTutorialIndex = typedTutorials.indexOf(tutorial)
  const nextTutorial = typedTutorials[currentTutorialIndex + 1]

  return (
    <div className="learning-module app-shell">
      <div className="main-content">
        <div className="mb-5 flex w-fit items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            aria-pressed={pillar === 'learn'}
            onClick={() => setPillar('learn')}
            className={cn(
              'rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              pillar === 'learn'
                ? 'bg-accent text-on-accent'
                : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            Learn
          </button>
          <button
            type="button"
            aria-pressed={pillar === 'ai-modules'}
            onClick={() => setPillar('ai-modules')}
            className={cn(
              'rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              pillar === 'ai-modules'
                ? 'bg-accent text-on-accent'
                : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            AI Learning Modules
          </button>
          <button
            type="button"
            aria-pressed={pillar === 'knowledge'}
            onClick={() => setPillar('knowledge')}
            className={cn(
              'rounded-md px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              pillar === 'knowledge'
                ? 'bg-accent text-on-accent'
                : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            Q&amp;A Knowledge
          </button>
        </div>

        <div className="module-heading">
          {pillar === 'learn' ? (
            <>
              <div className="eyebrow">LEARN GIT &amp; GITHUB</div>
              <h1>GitHub Processes</h1>
              <p>Practice the essential GitHub workflows in a safe, guided workspace.</p>
            </>
          ) : pillar === 'ai-modules' ? (
            <>
              <div className="eyebrow">AI CURRICULUM SYNTHESIZER</div>
              <h1>AI Learning Modules</h1>
              <p>Generate structured modules, takeaways, and verified source citations on any technical topic.</p>
            </>
          ) : (
            <>
              <div className="eyebrow">GIT KNOWLEDGE</div>
              <h1>Other Git Concepts</h1>
              <p>Explore the concepts that support the GitHub workflows you just practiced.</p>
            </>
          )}
        </div>

        {pillar === 'learn' && (
          <section className="learn-layout">
            <LearningSidebar
              tutorials={typedTutorials}
              currentTutorialId={tutorialId}
              isDone={isDone}
              onSelectTutorial={startTutorial}
              onOpenKnowledge={() => setPillar('knowledge')}
            />

            <div className="lesson-main">
              <LearningCoachCard
                tutorial={tutorial}
                tutorialIndex={currentTutorialIndex}
                totalTutorials={typedTutorials.length}
                nextTutorialName={nextTutorial?.name}
                step={step}
                coach={coach}
                lessonComplete={lessonComplete}
                onCompleteStep={completeStep}
                onNextTutorial={goToNextTutorial}
                onOpenWhyModal={(title, text) =>
                  setModal({ kind: 'why', title, text })
                }
              />

              <LearningSimulator
                username={username}
                tutorial={tutorial}
                step={step}
                coach={coach}
                branch={branch}
                branchMenu={branchMenu}
                branchName={branchName}
                lessonComplete={lessonComplete}
                setBranch={setBranch}
                setBranchMenu={setBranchMenu}
                setBranchName={setBranchName}
                onCompleteStep={completeStep}
                onPrevStep={() => setStep(Math.max(0, step - 1))}
              />
            </div>
          </section>
        )}

        {pillar === 'ai-modules' && <AILearningModulesView />}

        {pillar === 'knowledge' && (
          <KnowledgeExplorer
            search={search}
            setSearch={setSearch}
            category={category}
            setCategory={setCategory}
            categories={typedCategories}
            filteredConcepts={filteredKnowledge}
            onSelectConcept={(concept) => setModal(concept)}
            onBackToLearn={() => setPillar('learn')}
          />
        )}
      </div>

      <LearningConceptModal modal={modal} onClose={() => setModal(null)} />

      <LearningChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        sending={sending}
        draft={draft}
        setDraft={setDraft}
        onSend={send}
      />

      {notice && <div className="toast">✓ {notice}</div>}
    </div>
  )
}

export default LearningSection
