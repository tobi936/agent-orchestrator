import { Low, JSONFile } from 'lowdb'
import { nanoid } from 'nanoid'
import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { dataRoot } from '../paths.js'

export interface User {
  id: string
  email: string
  passwordHash: string
  createdAt: string
  claudeCredentials?: string
}

interface UsersSchema {
  users: User[]
}

let dbInstance: Low<UsersSchema> | null = null

async function getDb(): Promise<Low<UsersSchema>> {
  if (!dbInstance) {
    mkdirSync(dataRoot, { recursive: true })
    const adapter = new JSONFile<UsersSchema>(join(dataRoot, 'users.json'))
    dbInstance = new Low<UsersSchema>(adapter)
    await dbInstance.read()
    dbInstance.data ??= { users: [] }
    dbInstance.data.users ??= []
  }
  return dbInstance
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb()
  return db.data!.users.find((u) => u.email === email.toLowerCase())
}

export async function findUserById(id: string): Promise<User | undefined> {
  const db = await getDb()
  return db.data!.users.find((u) => u.id === id)
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const db = await getDb()
  const user: User = {
    id: nanoid(10),
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  }
  db.data!.users.push(user)
  await db.write()
  return user
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User | undefined> {
  const db = await getDb()
  const idx = db.data!.users.findIndex((u) => u.id === id)
  if (idx === -1) return undefined
  db.data!.users[idx] = { ...db.data!.users[idx], ...patch }
  await db.write()
  return db.data!.users[idx]
}
