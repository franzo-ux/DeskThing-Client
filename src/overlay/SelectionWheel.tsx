import React, { useEffect, useMemo, useState } from 'react'
import ActionComponent from '../components/ui/Action'
import { useAppStore, useMappingStore } from '@src/stores'
import { Action, EventMode } from '@deskthing/types'
import { useActionStore } from '@src/stores/actionStore'

const actionKeys = ['Wheel1', 'Wheel2', 'Wheel3', 'Wheel4']
const MIN_SLOTS = 4
const MAX_SLOTS = 8

/**
 * The `Wheel` component is the app wheel opened by pressing the knob.
 *
 * It has one slot per installed app (from 4 up to 8 slots), placed on a ring
 * around the knob corner. The first four slots keep the user's Wheel1-4
 * mappings; the extra ones open the next apps in the app list. Turning the
 * knob moves the selection, pressing it runs the selected slot.
 */
const Wheel: React.FC = () => {
  const getButtonAction = useMappingStore((store) => store.getButtonAction)
  const executeAction = useMappingStore((store) => store.executeAction)
  const profile = useMappingStore((store) => store.profile)
  const apps = useAppStore((store) => store.apps)
  const [opened, setIsOpened] = useState<boolean>(false)
  const setWheelState = useActionStore((store) => store.setWheelState)
  const wheelRotation = useActionStore((store) => store.wheelRotation)

  const buttons = useMemo(() => {
    const count = Math.max(MIN_SLOTS, Math.min(MAX_SLOTS, apps.length))
    const list: Action[] = []
    for (let i = 0; i < count; i++) {
      const mapped = i < actionKeys.length ? getButtonAction(actionKeys[i], EventMode.KeyDown) : undefined
      list.push(
        mapped ||
          ({ id: 'pref', value: String(i), source: 'server', enabled: true, version_code: 0 } as unknown as Action)
      )
    }
    return list
  }, [getButtonAction, apps.length, profile])

  const n = buttons.length || 1
  const selectedIndex = ((wheelRotation % n) + n) % n
  const selectedAction = buttons[selectedIndex]

  const appLabel = (name: string | undefined) => {
    const app = apps.find((a) => a.name === name)
    return (app && ((app.manifest && app.manifest.label) || app.name)) || name || ''
  }
  const label = (action: Action | undefined): string => {
    if (!action) return ''
    if (action.id === 'pref') {
      const app = apps[Number(action.value) || 0]
      return app ? appLabel(app.name) : ''
    }
    if (action.id === 'open') return appLabel(action.value)
    return action.name || action.id
  }

  const handleClose = async () => {
    setIsOpened(false)
    setTimeout(() => {
      setWheelState(false)
    }, 200)
  }

  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      e.stopPropagation()
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.key === 'Enter') {
        setIsOpened(false)
        if (selectedAction) {
          executeAction(selectedAction)
        }
        handleClose()
      }
    }

    window.addEventListener('keydown', handleEnter)

    setIsOpened(true)

    return () => {
      window.removeEventListener('keydown', handleEnter)
    }
  }, [selectedAction])

  // A real wheel around the knob (right edge): the slots are evenly spaced on
  // a ring centred on the knob and the whole ring turns with it, so the slots
  // behind the knob leave the screen. The selected slot is the one on the
  // left of the ring, facing the middle of the screen, with its name beside it.
  const W = window.innerWidth
  const H = window.innerHeight
  const R = Math.round(H * 0.42)
  const cx = W - 30
  const cy = H / 2
  const stepDeg = 360 / n
  const turn = -wheelRotation * stepDeg // continuous: no jumps when wrapping

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-10 overflow-hidden transition-opacity duration-200 ${opened ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.88) 50%, rgba(0,0,0,0.65) 100%)' }}
    >
      <div
        className="absolute transition-transform duration-300"
        style={{ left: cx - R, top: cy - R, width: 2 * R, height: 2 * R, transform: `rotate(${turn}deg)` }}
      >
        {buttons.map((action, index) => {
          const angle = Math.PI + (index * stepDeg * Math.PI) / 180
          const selected = index === selectedIndex
          return (
            <div
              key={index}
              className="absolute flex items-center justify-center transition-all duration-300"
              style={{
                left: R + R * Math.cos(angle) - 32,
                top: R + R * Math.sin(angle) - 32,
                width: 64,
                height: 64,
                // keep the icon upright while the ring turns
                transform: `rotate(${-turn}deg) scale(${opened ? (selected ? 1.6 : 0.9) : 0.2})`,
                opacity: selected ? 1 : 0.6,
                zIndex: selected ? 2 : 1
              }}
            >
              <ActionComponent action={action} />
            </div>
          )
        })}
      </div>
      <div
        className="absolute text-white text-2xl whitespace-nowrap transition-opacity duration-300"
        style={{
          right: W - (cx - R) + 70,
          top: cy,
          transform: 'translateY(-50%)',
          opacity: opened ? 1 : 0,
          textShadow: '0 1px 4px #000'
        }}
      >
        {label(selectedAction)}
      </div>
    </div>
  )
}

export default Wheel
