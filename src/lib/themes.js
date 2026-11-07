import { Cpu, Leaf, MoonStar, Siren, Waves } from 'lucide-react'

// HUD colour schemes. Keys are kept from the original themes so saved
// profiles (and the "Style Shifter" achievement) keep working.
//  main   = primary line / glow colour
//  alt    = secondary highlight colour (titles, numbers)
//  hue    = map-tile tint (hue-rotate applied to sepia tiles)
export const THEMES = {
  sakura: { name: 'Cyan Core',     icon: Cpu,      main: '#3ef0ff', alt: '#ffd400', hue: '140deg' },
  neon:   { name: 'Neon Magenta',  icon: MoonStar, main: '#ff3ef0', alt: '#3ef0ff', hue: '250deg' },
  ocean:  { name: 'Deep Blue',     icon: Waves,    main: '#4da3ff', alt: '#9effe0', hue: '175deg' },
  forest: { name: 'Matrix Green',  icon: Leaf,     main: '#38ff9c', alt: '#d4ff3e', hue: '90deg' },
  sunset: { name: 'Crimson Alert', icon: Siren,    main: '#ff4d5e', alt: '#ffb02e', hue: '-25deg' },
}

export function applyTheme(key) {
  const t = THEMES[key] || THEMES.sakura
  const r = document.documentElement
  r.style.setProperty('--h-cyan', t.main)
  r.style.setProperty('--h-yellow', t.alt)
  r.style.setProperty('--tile-hue', t.hue)
  r.dataset.dark = '1'
}

// every scheme is dark, so maps always use dark tiles
export const isDarkTheme = () => true
