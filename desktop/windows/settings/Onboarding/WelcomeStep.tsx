import onboardingPic from '../../../assets/onboarding/pic.png'

type Props = {
  onNext: () => void
}

export function WelcomeStep({ onNext }: Props) {
  return (
    <div className="relative h-full overflow-hidden">
      <img
        src={onboardingPic}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

      <div className="relative flex flex-col items-center justify-end h-full text-center px-8 pb-10">
        <h1 className="text-2xl font-semibold mb-3 text-white drop-shadow-md">
          Welcome to Vaulty
        </h1>

        <p className="text-white/90 text-md leading-regular max-w-md mb-2 drop-shadow-sm">
          Vaulty securely syncs your data &mdash; screenshots, iMessage,
          contacts, and WhatsApp &mdash; to your private server with end-to-end
          encryption.
        </p>

        <p className="text-white/90 text-md leading-regular max-w-md mb-8 drop-shadow-sm">
          It runs quietly in your menu bar, keeping everything in sync
          automatically.
        </p>

        <button
          onClick={onNext}
          className="px-8 py-2.5 bg-white/20 track-10 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors font-medium border border-white/30"
        >
          Get Started
        </button>
      </div>
    </div>
  )
}
