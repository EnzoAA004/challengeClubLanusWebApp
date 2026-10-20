import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export const movementTypes = ['subscription', 'received', 'sent'] as const;
export type MovementType = (typeof movementTypes)[number];

export class Movement extends Model<InferAttributes<Movement>, InferCreationAttributes<Movement>> {
  declare id: CreationOptional<string>;
  declare accountId: string;
  declare counterparty: string;
  declare description: string;
  declare amount: string;
  declare currency: string;
  declare type: MovementType;
  declare occurredAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initializeMovementModel(sequelize: Sequelize): void {
  Movement.init({
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    accountId: { type: DataTypes.UUID, allowNull: false },
    counterparty: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.STRING(240), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    currency: { type: DataTypes.STRING(3), allowNull: false },
    type: { type: DataTypes.ENUM(...movementTypes), allowNull: false },
    occurredAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, tableName: 'bank_movements', timestamps: true });
}
