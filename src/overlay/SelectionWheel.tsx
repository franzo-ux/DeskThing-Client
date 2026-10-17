import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

  // A wheel around the knob. The centre is the one of the original DeskThing
  // wheel (920, 161 on the 800x480 screen), i.e. the knob itself, just off
  // the right edge. Slots sit STEP degrees apart on that ring: the selected
  // one on the left, its neighbours above and below, the rest behind the
  // knob, off screen. Each slot is an arm rotating around the centre, so the
  // icons travel along the circle. A slot that wraps from one end of the ring
  // to the other jumps there off screen (see the layout effect below).
  const W = window.innerWidth
  const H = window.innerHeight
  const cx = (920 / 800) * W
  const cy = (161 / 480) * H
  const R = (250 / 800) * W
  const STEP = 36
  // which way the ring turns for a knob step (-1 follows the knob)
  const DIR = -1

  // distance of each slot from the selected one, wrapped to -n/2 .. n/2
  const dist = buttons.map((_, index) => {
    let d = (((index - wheelRotation) % n) + n) % n
    if (d > n / 2) d -= n
    return d
  })

  const arms = useRef<(HTMLDivElement | null)[]>([])
  const icons = useRef<(HTMLDivElement | null)[]>([])
  const prevDist = useRef<number[]>([])
  const iconTransform = (d: number, selected: boolean) =>
    `rotate(${-DIR * d * STEP}deg) scale(${opened ? (selected ? 1.6 : 0.9) : 0.2})`

  // A wrapping slot first jumps (no animation) to one step beyond the end it
  // enters from - off screen - and then slides in like the others.
  useLayoutEffect(() => {
    dist.forEach((d, i) => {
      const prev = prevDist.current[i]
      const arm = arms.current[i]
      const icon = icons.current[i]
      if (prev === undefined || Math.abs(d - prev) <= 1 || !arm || !icon) return
      const start = d + Math.sign(d - prev)
      arm.style.transition = 'none'
      icon.style.transition = 'none'
      arm.style.transform = `rotate(${DIR * start * STEP}deg)`
      icon.style.transform = iconTransform(start, false)
      void arm.getBoundingClientRect() // apply the jump before animating
      arm.style.transition = 'transform 300ms'
      icon.style.transition = 'transform 300ms, opacity 300ms'
      arm.style.transform = `rotate(${DIR * d * STEP}deg)`
      icon.style.transform = iconTransform(d, d === 0)
    })
    prevDist.current = dist
  })

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-10 overflow-hidden transition-opacity duration-200 ${opened ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.88) 50%, rgba(0,0,0,0.65) 100%)' }}
    >
      {buttons.map((action, index) => {
        const d = dist[index]
        const selected = d === 0
        return (
          <div
            key={index}
            ref={(el) => (arms.current[index] = el)}
            className="absolute"
            style={{
              left: cx,
              top: cy,
              width: 0,
              height: 0,
              transform: `rotate(${DIR * d * STEP}deg)`,
              transition: 'transform 300ms'
            }}
          >
            <div
              ref={(el) => (icons.current[index] = el)}
              className="absolute flex items-center justify-center"
              style={{
                left: -R - 32,
                top: -32,
                width: 64,
                height: 64,
                // keep the icon upright while its arm turns
                transform: iconTransform(d, selected),
                opacity: selected ? 1 : 0.6,
                zIndex: selected ? 2 : 1,
                transition: 'transform 300ms, opacity 300ms'
              }}
            >
              <ActionComponent action={action} />
            </div>
          </div>
        )
      })}
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
