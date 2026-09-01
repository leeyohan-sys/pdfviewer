import type { ReactNode } from 'react'

type IconProps = {
  size?: number
}

function Svg({
  size = 18,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconOpen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h16a1 1 0 0 0 1-1V8.5a1 1 0 0 0-1-1h-7L11 5H5a1 1 0 0 0-1 1z" />
    </Svg>
  )
}

export function IconSave(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4h11l4 4v12H5z" />
      <path d="M9 4v6h8" />
      <path d="M8 20v-6h8v6" />
    </Svg>
  )
}

export function IconNew(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3h8l5 5v13H7z" />
      <path d="M15 3v5h5" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </Svg>
  )
}

export function IconSelect(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4l6 16 2.2-6.2L19 12z" />
    </Svg>
  )
}

export function IconText(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 6h14" />
      <path d="M12 6v14" />
      <path d="M8 20h8" />
    </Svg>
  )
}

export function IconPen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20l4.5-1.2L19 8.3 15.7 5 5.2 15.5z" />
    </Svg>
  )
}

export function IconEraser(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15.5 4.5l4 4-9.8 9.8H5.7l-2.2-2.2 12-11.6z" />
      <path d="M6 20h13" />
    </Svg>
  )
}

export function IconHighlight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 18h16" />
      <path d="M7 15l4-9h2l4 9" />
      <path d="M8.5 12h7" />
    </Svg>
  )
}

export function IconRect(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
    </Svg>
  )
}

export function IconImage(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M6 16l4.2-4.2 3 3L16 12l4 4" />
    </Svg>
  )
}

export function IconRotateLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 7H5V3" />
      <path d="M5 7a8 8 0 1 1-1.2 7.5" />
    </Svg>
  )
}

export function IconRotateRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 7h4V3" />
      <path d="M19 7a8 8 0 1 0 1.2 7.5" />
    </Svg>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 7h14" />
      <path d="M10 7V5h4v2" />
      <path d="M7 7l1 13h8l1-13" />
    </Svg>
  )
}

export function IconCopy(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="8" y="8" width="11" height="13" rx="1.5" />
      <path d="M6 16H5a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 5 2h11A1.5 1.5 0 0 1 17.5 3.5V5" />
    </Svg>
  )
}

export function IconZoomIn(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </Svg>
  )
}

export function IconZoomOut(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
      <path d="M8 11h6" />
    </Svg>
  )
}

export function IconUndo(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 8H4V4" />
      <path d="M4 8a9 9 0 1 1 2.5 10" />
    </Svg>
  )
}

export function IconRedo(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 8h4V4" />
      <path d="M20 8a9 9 0 1 0-2.5 10" />
    </Svg>
  )
}

export function IconPage(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3h8l5 5v13H7z" />
      <path d="M15 3v5h5" />
    </Svg>
  )
}

export function IconView(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Svg>
  )
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 16.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 7.6l1.4-1.4" />
    </Svg>
  )
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 6l-6 6 6 6" />
    </Svg>
  )
}

export function IconChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 6l6 6-6 6" />
    </Svg>
  )
}
