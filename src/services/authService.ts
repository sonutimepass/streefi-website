/**
 * Authentication Service
 * 
 * Business logic for admin authentication and session management.
 * Uses AdminRepository and SessionRepository.
 * 
 * Responsibilities:
 * - Validate login credentials (bcrypt password verification)
 * - Create and manage sessions
 * - Validate session tokens
 * - Handle logout
 */

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { adminRepository } from "../lib/repositories";
import { sessionRepository } from "../lib/repositories";
import type { LoginRequest, LoginResponse, Session } from "../types/domain";

export class AuthService {
  /**
   * Authenticate admin and create session
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      // Get admin from database
      const admin = await adminRepository.getAdminForValidation(request.adminId);
      
      if (!admin) {
        return {
          success: false,
          message: "Invalid credentials"
        };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(request.password, admin.password_hash);
      
      if (!isValidPassword) {
        return {
          success: false,
          message: "Invalid credentials"
        };
      }

      // Create session
      const sessionId = `sess_${this.generateSessionToken()}`;
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 7 * 24 * 60 * 60; // 7 days
      const expiresAt = now + expiresIn;

      await sessionRepository.createSession({
        session_id: sessionId,
        email: admin.email || request.adminId,
        type: 'whatsapp-session',
        status: 'active',
        expiresAt: expiresAt,
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        sessionToken: sessionId,
        expiresAt: new Date(expiresAt * 1000)
      };
    } catch (error) {
      console.error("[AuthService] Login error:", error);
      return {
        success: false,
        message: "Login failed"
      };
    }
  }

  /**
   * Validate session token
   */
  async validateSession(sessionToken: string): Promise<Session | null> {
    try {
      const session = await sessionRepository.getSessionById(sessionToken);
      
      if (!session) {
        return null;
      }

      return {
        token: session.session_id,
        adminId: session.email,
        createdAt: new Date(session.createdAt),
        expiresAt: new Date(session.expiresAt * 1000)
      };
    } catch (error) {
      console.error("[AuthService] Session validation error:", error);
      return null;
    }
  }

  /**
   * Logout (delete session)
   */
  async logout(sessionToken: string): Promise<void> {
    try {
      await sessionRepository.deleteSession(sessionToken);
    } catch (error) {
      console.error("[AuthService] Logout error:", error);
      throw new Error("Logout failed");
    }
  }

  /**
   * Generate secure session token
   */
  private generateSessionToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Hash password (for future admin creation)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}

// Export singleton instance
export const authService = new AuthService();
