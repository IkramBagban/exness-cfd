import { v4 as uuidv4 } from "uuid";

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface PendingVerification {
  email: string;
  action: "signup" | "signin";
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export class UserManager {
  private users: Map<string, User> = new Map(); // email -> User
  private pendingVerifications: Map<string, PendingVerification> = new Map(); // token -> PendingVerification
  private userSessions: Map<string, string> = new Map(); // sessionToken -> userId

  constructor() {
    setInterval(() => {
      this.cleanupExpiredVerifications();
    }, 5 * 60 * 1000);
  }

  createUser(email: string): User {
    const user: User = {
      id: uuidv4(),
      email: email.toLowerCase(),
      username: email.split('@')[0],
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    this.users.set(user.email, user);
    console.log(`User created: ${user.email} (ID: ${user.id})`);
    return user;
  }

  getUserByEmail(email: string): User | null {
    return this.users.get(email.toLowerCase()) || null;
  }

  getUserById(userId: string): User | null {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return null;
  }

  userExists(email: string): boolean {
    return this.users.has(email.toLowerCase());
  }

  addPendingVerification(email: string, action: "signup" | "signin", token: string): void {
    const verification: PendingVerification = {
      email: email.toLowerCase(),
      action,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
    };

    this.pendingVerifications.set(token, verification);
    console.log(`Pending ${action} verification created for: ${email}`);
  }

  getPendingVerification(token: string): PendingVerification | null {
    const verification = this.pendingVerifications.get(token);
    
    if (!verification) {
      return null;
    }

    if (new Date() > verification.expiresAt) {
      this.pendingVerifications.delete(token);
      return null;
    }

    return verification;
  }

  completeVerification(token: string): { success: boolean; user?: User; error?: string } {
    const verification = this.getPendingVerification(token);
    
    if (!verification) {
      return { success: false, error: "Invalid or expired verification token" };
    }

    if (verification.action === "signup") {
      if (this.userExists(verification.email)) {
        this.pendingVerifications.delete(token);
        return { success: false, error: "User already exists" };
      }

      const user = this.createUser(verification.email);
      this.pendingVerifications.delete(token);
      return { success: true, user };

    } else if (verification.action === "signin") {
      const user = this.getUserByEmail(verification.email);
      if (!user) {
        this.pendingVerifications.delete(token);
        return { success: false, error: "User not found" };
      }

      user.lastLoginAt = new Date();
      this.pendingVerifications.delete(token);
      return { success: true, user };
    }

    return { success: false, error: "Invalid verification action" };
  }

  createSession(userId: string): string {
    const sessionToken = uuidv4();
    this.userSessions.set(sessionToken, userId);
    console.log(`Session created for user ID: ${userId}`);
    return sessionToken;
  }

  getUserBySession(sessionToken: string): User | null {
    const userId = this.userSessions.get(sessionToken);
    if (!userId) {
      return null;
    }
    return this.getUserById(userId);
  }

  removeSession(sessionToken: string): boolean {
    return this.userSessions.delete(sessionToken);
  }

  private cleanupExpiredVerifications(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [token, verification] of this.pendingVerifications.entries()) {
      if (now > verification.expiresAt) {
        this.pendingVerifications.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired verification tokens`);
    }
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  getStats(): {
    totalUsers: number;
    pendingVerifications: number;
    activeSessions: number;
  } {
    return {
      totalUsers: this.users.size,
      pendingVerifications: this.pendingVerifications.size,
      activeSessions: this.userSessions.size,
    };
  }
}

export const userManager = new UserManager();
