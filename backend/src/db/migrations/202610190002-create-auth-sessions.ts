import { DataTypes, QueryInterface, Transaction } from 'sequelize';

export const name = '202610190002-create-auth-sessions';

export async function up(queryInterface: QueryInterface, transaction: Transaction): Promise<void> {
  await queryInterface.createTable('auth_sessions', {
    token_hash: { type: DataTypes.STRING(64), allowNull: false, primaryKey: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  }, { transaction });
  await queryInterface.addIndex('auth_sessions', ['expires_at'], {
    name: 'auth_sessions_expires_at_idx', transaction,
  });
}
