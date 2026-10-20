import { DataTypes, Op, QueryInterface, Transaction } from 'sequelize';

export const name = '202610190001-create-bank-domain';

export async function up(queryInterface: QueryInterface, transaction: Transaction): Promise<void> {
  await queryInterface.createTable('bank_accounts', {
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  }, { transaction });

  await queryInterface.createTable('bank_movements', {
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
    accountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'bank_accounts', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    counterparty: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.STRING(240), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    type: { type: DataTypes.ENUM('subscription', 'received', 'sent'), allowNull: false },
    occurredAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  }, { transaction });

  await queryInterface.addConstraint('bank_movements', {
    fields: ['amount'],
    type: 'check',
    name: 'bank_movements_amount_positive',
    where: { amount: { [Op.gt]: 0 } },
    transaction,
  });
  await queryInterface.addIndex('bank_movements', ['accountId', 'occurredAt'], {
    name: 'bank_movements_account_date_idx', transaction,
  });
  await queryInterface.addIndex('bank_movements', ['accountId', 'type'], {
    name: 'bank_movements_account_type_idx', transaction,
  });
}
