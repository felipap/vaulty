import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { WelcomeStep } from './WelcomeStep'
import { ServerStep } from './ServerStep'
import { DoneStep } from './DoneStep'

type Props = {
  onComplete: () => void
}

type Step = 'welcome' | 'server' | 'done'

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={twMerge(
            'h-1.5 rounded-full transition-all duration-300',
            i === current
              ? 'w-6 bg-blue-500'
              : i < current
                ? 'w-1.5 bg-blue-300'
                : 'w-1.5 bg-white',
          )}
        />
      ))}
    </div>
  )
}

const STEP_INDEX: Record<Step, number> = {
  welcome: 0,
  server: 1,
  done: 2,
}

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome')

  const handleFinish = async () => {
    await window.electron.setOnboardingCompleted(true)
    onComplete()
  }

  return (
    <div className="h-screen relative bg-inverted">
      {/* Content */}
      <div className="absolute inset-0">
        {step === 'welcome' && <WelcomeStep onNext={() => setStep('server')} />}
        {step === 'server' && (
          <ServerStep
            onNext={() => setStep('done')}
            onBack={() => setStep('welcome')}
          />
        )}
        {step === 'done' && <DoneStep onFinish={handleFinish} />}
      </div>

      {/* Step indicator */}
      <div className="relative flex justify-center pt-6 pb-2 z-10">
        <StepIndicator current={STEP_INDEX[step]} total={3} />
      </div>
    </div>
  )
}
