'use client'

import Link from 'next/link'
import { Button } from '@carbon/react'
import { Add } from '@carbon/icons-react'

interface NewButtonProps {
  href: string
  label?: string
  kind?: 'primary' | 'secondary' | 'ghost' | 'tertiary'
  size?: 'sm' | 'md' | 'lg'
}

export function NewButton({ href, label = 'New', kind = 'primary', size = 'md' }: NewButtonProps) {
  return (
    <Link href={href}>
      <Button renderIcon={Add} size={size} kind={kind}>{label}</Button>
    </Link>
  )
}
