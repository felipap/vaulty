import { twMerge } from 'tailwind-merge'
import {
  VscChecklist,
  VscComment,
  VscCommentDiscussion,
  VscDeviceCamera,
  VscNote,
  VscNotebook,
  VscOrganization,
  VscOutput,
  VscSettingsGear,
} from 'react-icons/vsc'
import { IconType } from 'react-icons'
import { SyncLogSource } from '../electron'

export type ActiveTab = 'general' | 'logs' | SyncLogSource

export type DataSourceInfo = {
  source: SyncLogSource
  label: string
  enabled: boolean
  lastSyncFailed: boolean
}

type Props = {
  activeTab: ActiveTab
  onSelectTab: (tab: ActiveTab) => void
  enabledSources: DataSourceInfo[]
  disabledSources: DataSourceInfo[]
}

const SYNC_SOURCE_ICONS: Record<SyncLogSource, IconType> = {
  screenshots: VscDeviceCamera,
  imessage: VscComment,
  contacts: VscOrganization,
  'whatsapp-sqlite': VscCommentDiscussion,
  'macos-stickies': VscNote,
  'win-sticky-notes': VscNote,
  'apple-notes': VscNotebook,
  'apple-reminders': VscChecklist,
}

function SidebarButton({
  active,
  onClick,
  children,
  disabled,
  hasError,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  hasError?: boolean
  icon?: IconType
}) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        'group w-full px-3 py-[7px] text-[13px] text-left rounded-md transition-colors flex items-center justify-between gap-2',
        'text-[var(--color-contrast)] hover:bg-[var(--background-color-three)]',
        disabled && 'text-tertiary opacity-70',
        active && 'bg-[#007AFF] text-white hover:bg-[#007AFF]',
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        {Icon && (
          <Icon
            size={15}
            className={twMerge(
              'shrink-0 text-tertiary',
              active && 'text-white',
            )}
          />
        )}
        <span className="truncate">{children}</span>
      </span>
      {hasError && !active && (
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
      )}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-tertiary">
      {children}
    </div>
  )
}

export function Sidebar({
  activeTab,
  onSelectTab,
  enabledSources,
  disabledSources,
}: Props) {
  return (
    <div
      className="w-64 shrink-0 border-r flex flex-col"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="h-16 shrink-0" />
      <div
        className="px-1.5 space-y-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <SidebarButton
          active={activeTab === 'general'}
          onClick={() => onSelectTab('general')}
          icon={VscSettingsGear}
        >
          General
        </SidebarButton>
        <SidebarButton
          active={activeTab === 'logs'}
          onClick={() => onSelectTab('logs')}
          icon={VscOutput}
        >
          All Logs
        </SidebarButton>
      </div>

      <div className="mx-3 mt-2 border-t" />
      <div
        className="flex-1 overflow-auto px-1.5 pb-2 pt-2 space-y-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {enabledSources.map((info) => (
          <SidebarButton
            key={info.source}
            active={activeTab === info.source}
            onClick={() => onSelectTab(info.source)}
            hasError={info.lastSyncFailed}
            icon={SYNC_SOURCE_ICONS[info.source]}
          >
            {info.label}
          </SidebarButton>
        ))}
        {disabledSources.map((info) => (
          <SidebarButton
            key={info.source}
            active={activeTab === info.source}
            onClick={() => onSelectTab(info.source)}
            disabled
            icon={SYNC_SOURCE_ICONS[info.source]}
          >
            {info.label}
          </SidebarButton>
        ))}
      </div>
    </div>
  )
}
