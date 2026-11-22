import 'server-only'
import { randomBytes } from 'crypto'

/**
 * Generates a cryptographically secure random temporary password.
 * Guaranteed to contain at least one uppercase letter, one lowercase letter,
 * one number, and one symbol.
 */
export function generateTemporaryPassword(length: number = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%^&*'
  const allChars = upper + lower + numbers + symbols

  // Pick at least one from each character set
  const passwordChars: string[] = [
    upper[randomBytes(1)[0] % upper.length],
    lower[randomBytes(1)[0] % lower.length],
    numbers[randomBytes(1)[0] % numbers.length],
    symbols[randomBytes(1)[0] % symbols.length],
  ]

  // Fill remaining characters from allChars
  const remainingLength = Math.max(length, 10) - passwordChars.length
  const randomBuffer = randomBytes(remainingLength)
  for (let i = 0; i < remainingLength; i++) {
    passwordChars.push(allChars[randomBuffer[i] % allChars.length])
  }

  // Shuffle using Fisher-Yates with crypto random bytes
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1)
    const temp = passwordChars[i]
    passwordChars[i] = passwordChars[j]
    passwordChars[j] = temp
  }

  return passwordChars.join('')
}
