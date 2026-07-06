import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { SignIn2 } from '@/features/auth/sign-in/sign-in-2'
import { useLayout } from '@/context/layout-provider'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

function SignInRouteComponent() {
  const { authTemplate } = useLayout()
  return authTemplate === 'split' ? <SignIn2 /> : <SignIn />
}

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignInRouteComponent,
  validateSearch: searchSchema,
})
