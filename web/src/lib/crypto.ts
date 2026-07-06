/**
 * 简单的加密/解密工具
 * 主要用于本地记住密码功能
 */

const SECRET_KEY = 'bico-admin-secret-key'

/**
 * 加密字符串
 */
export function encrypt(text: string): string {
  try {
    // 使用 Base64 与简易异或运算进行模糊加密，防止明文存储
    const encrypted = btoa(
      text
        .split('')
        .map((char, i) =>
          String.fromCharCode(
            char.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length)
          )
        )
        .join('')
    )
    return encrypted
  } catch {
    return ''
  }
}

/**
 * 解密字符串
 */
export function decrypt(encrypted: string): string {
  try {
    // 解密前置校验，空字符串直接返回
    if (!encrypted) return ''

    const decrypted = atob(encrypted)
      .split('')
      .map((char, i) =>
        String.fromCharCode(
          char.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length)
        )
      )
      .join('')
    return decrypted
  } catch {
    return ''
  }
}

/**
 * 保存记住的账号密码
 */
export function saveCredentials(username: string, password: string) {
  try {
    localStorage.setItem('remembered_username', encrypt(username))
    localStorage.setItem('remembered_password', encrypt(password))
  } catch {
    return
  }
}

/**
 * 获取记住的账号密码
 */
export function getCredentials(): { username: string; password: string } | null {
  try {
    const encryptedUsername = localStorage.getItem('remembered_username')
    const encryptedPassword = localStorage.getItem('remembered_password')

    // 如果任何一个凭证不存在，说明没有选择记住密码
    if (!encryptedUsername || !encryptedPassword) {
      return null
    }

    return {
      username: decrypt(encryptedUsername),
      password: decrypt(encryptedPassword),
    }
  } catch {
    return null
  }
}

/**
 * 清除记住的账号密码
 */
export function clearCredentials() {
  try {
    localStorage.removeItem('remembered_username')
    localStorage.removeItem('remembered_password')
  } catch {
    return
  }
}
