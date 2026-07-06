import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { UserAuthForm } from './user-auth-form'

// Mock 路由跳转
const navigate = vi.fn()
// Mock 状态设置
const setUserMock = vi.fn()
const setAccessTokenMock = vi.fn()

// Mock 认证 Store
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    auth: {
      setUser: setUserMock,
      setAccessToken: setAccessTokenMock,
      accessToken: '',
    },
  }),
}))

// Mock TanStack 路由组件
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

// Mock 后端 API 接口
const loginMock = vi.fn()
const getCurrentUserMock = vi.fn()
const getCaptchaMock = vi.fn()

vi.mock('@/services/auth', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  getCurrentUser: (...args: unknown[]) => getCurrentUserMock(...args),
  getCaptcha: (...args: unknown[]) => getCaptchaMock(...args),
}))

describe('UserAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 默认的 API 响应模拟
    getCaptchaMock.mockResolvedValue({
      code: 0,
      msg: 'success',
      data: { id: 'captcha-id-123', image: 'data:image/png;base64,mock' },
    })

    loginMock.mockResolvedValue({
      code: 0,
      msg: 'success',
      data: { token: 'mock-session-token' },
    })

    getCurrentUserMock.mockResolvedValue({
      code: 0,
      msg: 'success',
      data: {
        id: 1,
        username: 'admin',
        name: '管理员',
        avatar: 'avatar-url',
        roles: ['admin'],
        permissions: ['*'],
      },
    })
  })

  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let usernameInput: Locator
    let passwordInput: Locator
    let captchaInput: Locator
    let signInButton: Locator

    beforeEach(async () => {
      screen = await render(<UserAuthForm />)
      usernameInput = screen.getByRole('textbox', { name: /^用户名$/i })
      passwordInput = screen.getByLabelText(/^密码$/i)
      captchaInput = screen.getByPlaceholder(/^验证码$/i)
      signInButton = screen.getByRole('button', { name: /^登录$/i })
    })

    it('renders fields and submit button', async () => {
      await expect.element(usernameInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(captchaInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
    })

    it('authenticates and navigates to default route on success', async () => {
      await userEvent.fill(usernameInput, 'admin')
      await userEvent.fill(passwordInput, 'admin123')
      await userEvent.fill(captchaInput, '1234')

      await userEvent.click(signInButton)

      await vi.waitFor(() => expect(loginMock).toHaveBeenCalledOnce())
      expect(loginMock).toHaveBeenCalledWith({
        username: 'admin',
        password: 'admin123',
        captchaId: 'captcha-id-123',
        captchaCode: '1234',
      })

      await vi.waitFor(() => expect(setUserMock).toHaveBeenCalledOnce())
      expect(setUserMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          username: 'admin',
          name: '管理员',
        })
      )
      expect(setAccessTokenMock).toHaveBeenCalledWith('mock-session-token')

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
      )
    })
  })
})
