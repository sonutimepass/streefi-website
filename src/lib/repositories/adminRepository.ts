/**
 * Admin Repository
 * 
 * Abstracts DynamoDB operations for admin user records.
 * Table: streefi_admins
 * Schema: Simple key (admin_id)
 * 
 * Operations:
 * - getAdminById: Retrieve admin credentials by ID
 * - validateAdminCredentials: Check admin exists and password matches
 */

import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand, UpdateItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient, TABLES } from "../dynamoClient";

export type AdminRole = 'super_admin' | 'admin';

/**
 * Admin entity from DynamoDB.
 * admin_id is stored as the email address for O(1) lookup without a GSI.
 */
export interface AdminRecord {
  admin_id: string;       // Partition key — equals email
  password_hash: string;  // PBKDF2 "salt:hash" format
  email: string;
  role: AdminRole;
  created_at?: number;
  updated_at?: number;
}

/**
 * Repository for admin user operations
 */
export class AdminRepository {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(client: DynamoDBClient = dynamoClient, tableName: string = TABLES.ADMINS) {
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Get admin record by ID
   * @param adminId - The admin identifier
   * @returns Admin record or null if not found
   */
  async getAdminById(adminId: string): Promise<AdminRecord | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            admin_id: { S: adminId }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      return {
        admin_id: response.Item.admin_id?.S || "",
        password_hash: response.Item.password_hash?.S || "",
        email: response.Item.email?.S || response.Item.admin_id?.S || "",
        role: (response.Item.role?.S as AdminRole) || 'admin',
        created_at: response.Item.created_at?.N ? parseInt(response.Item.created_at.N, 10) : undefined,
        updated_at: response.Item.updated_at?.N ? parseInt(response.Item.updated_at.N, 10) : undefined,
      };
    } catch (error) {
      console.error("[AdminRepository] Error fetching admin:", error);
      throw new Error(`Failed to fetch admin: ${adminId}`);
    }
  }

  /**
   * Get admin record by email (admin_id IS the email in this schema)
   */
  async getAdminByEmail(email: string): Promise<AdminRecord | null> {
    return this.getAdminById(email.toLowerCase().trim());
  }

  /**
   * Create a new admin record.
   * Fails with ConditionalCheckFailedException if email already exists.
   */
  async createAdminRecord(
    email: string,
    passwordHash: string,
    role: AdminRole = 'admin'
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const normalizedEmail = email.toLowerCase().trim();
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          admin_id: { S: normalizedEmail },
          email: { S: normalizedEmail },
          password_hash: { S: passwordHash },
          role: { S: role },
          created_at: { N: now.toString() },
          updated_at: { N: now.toString() },
        },
        ConditionExpression: 'attribute_not_exists(admin_id)',
      })
    );
  }

  /**
   * Check if admin exists
   * @param adminId - The admin identifier
   * @returns true if admin exists, false otherwise
   */
  async adminExists(adminId: string): Promise<boolean> {
    const admin = await this.getAdminById(adminId);
    return admin !== null;
  }

  /**
   * Validate admin credentials (without checking password)
   * Password validation should be done in service layer using crypto
   * @param adminId - The admin identifier
   * @returns Admin record with password hash, or null if not found
   */
  async getAdminForValidation(adminId: string): Promise<AdminRecord | null> {
    return this.getAdminById(adminId);
  }

  /**
   * List all admin records (Scan — small table, acceptable for admin management)
   */
  async listAllAdmins(): Promise<Omit<AdminRecord, 'password_hash'>[]> {
    try {
      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          ProjectionExpression: 'admin_id, email, #r, created_at, updated_at',
          ExpressionAttributeNames: { '#r': 'role' },
        })
      );

      return (response.Items || []).map(item => ({
        admin_id: item.admin_id?.S || '',
        email: item.email?.S || item.admin_id?.S || '',
        role: (item.role?.S as AdminRole) || 'admin',
        created_at: item.created_at?.N ? parseInt(item.created_at.N, 10) : undefined,
        updated_at: item.updated_at?.N ? parseInt(item.updated_at.N, 10) : undefined,
      }));
    } catch (error) {
      console.error('[AdminRepository] Error listing admins:', error);
      throw new Error('Failed to list admin records');
    }
  }

  /**
   * Update an admin's role.
   */
  async updateAdminRole(adminId: string, role: AdminRole): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: { admin_id: { S: adminId } },
          ConditionExpression: 'attribute_exists(admin_id)',
          UpdateExpression: 'SET #r = :role, updated_at = :now',
          ExpressionAttributeNames: { '#r': 'role' },
          ExpressionAttributeValues: {
            ':role': { S: role },
            ':now': { N: now.toString() },
          },
        })
      );
    } catch (error) {
      console.error('[AdminRepository] Error updating admin role:', error);
      throw error;
    }
  }

  /**
   * Update an admin's password hash.
   */
  async updateAdminPassword(adminId: string, passwordHash: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: { admin_id: { S: adminId } },
          ConditionExpression: 'attribute_exists(admin_id)',
          UpdateExpression: 'SET password_hash = :hash, updated_at = :now',
          ExpressionAttributeValues: {
            ':hash': { S: passwordHash },
            ':now': { N: now.toString() },
          },
        })
      );
    } catch (error) {
      console.error('[AdminRepository] Error updating admin password:', error);
      throw error;
    }
  }

  /**
   * Delete an admin record.
   */
  async deleteAdmin(adminId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: { admin_id: { S: adminId } },
        })
      );
    } catch (error) {
      console.error('[AdminRepository] Error deleting admin:', error);
      throw new Error(`Failed to delete admin: ${adminId}`);
    }
  }

  // Rate limiting operations removed — moved to sessionRepository (streefi_sessions table)
}

// Export singleton instance
export const adminRepository = new AdminRepository();
