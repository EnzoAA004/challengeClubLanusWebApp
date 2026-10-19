import { DataTypes, Model, Sequelize } from 'sequelize';

export class AuthSession extends Model {
  declare tokenHash: string;
  declare expiresAt: Date;
}

export function initializeAuthSessionModel(sequelize: Sequelize): void {
  AuthSession.init({
    tokenHash: { type: DataTypes.STRING(64), primaryKey: true, field: 'token_hash' },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  }, {
    sequelize,
    tableName: 'auth_sessions',
    timestamps: true,
    underscored: true,
  });
}
