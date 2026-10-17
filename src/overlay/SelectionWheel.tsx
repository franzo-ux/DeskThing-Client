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

  // Ring in the free part of the screen (the knob covers the right edge).
  // The selected slot sits at the top with its name in the middle of the
  // ring; the rotation is kept continuous so the icons slide around instead
  // of jumping.
  const W = window.innerWidth
  const H = window.innerHeight
  const cx = (W - 80) / 2
  const cy = H / 2
  const R = Math.min(H * 0.36, cx - 60)
  const step = (2 * Math.PI) / n

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-10 transition-opacity duration-200 ${opened ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(0,0,0,0.82)' }}
    >
      {buttons.map((action, index) => {
        const angle = -Math.PI / 2 + (index - wheelRotation) * step
        const x = cx + R * Math.cos(angle)
        const y = cy + R * Math.sin(angle)
        const selected = index === selectedIndex
        return (
          <div
            key={index}
            className="absolute flex items-center justify-center transition-all duration-300"
            style={{
              left: x - 32,
              top: y - 32,
              width: 64,
              height: 64,
              transform: `scale(${opened ? (selected ? 1.6 : 0.85) : 0.2})`,
              opacity: selected ? 1 : 0.55,
              zIndex: selected ? 2 : 1
            }}
          >
            <ActionComponent action={action} />
          </div>
        )
      })}
      <div
        className="absolute text-white text-2xl whitespace-nowrap transition-all duration-300"
        style={{
          left: cx,
          top: cy,
          transform: 'translate(-50%, -50%)',
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
