import { Sequelize } from 'sequelize';
import { getDatabase } from '../config/database';
import { Account, initializeAccountModel } from './account';
import { AuthSession, initializeAuthSessionModel } from './auth-session';
import { initializeMovementModel, Movement } from './movement';

let initializedFor: Sequelize | undefined;

export function initializeModels(sequelize: Sequelize = getDatabase()): { Account: typeof Account; Movement: typeof Movement; AuthSession: typeof AuthSession } {
  if (initializedFor !== sequelize) {
    initializeAccountModel(sequelize);
    initializeMovementModel(sequelize);
    initializeAuthSessionModel(sequelize);
    Account.hasMany(Movement, { as: 'movements', foreignKey: 'accountId' });
    Movement.belongsTo(Account, { as: 'account', foreignKey: 'accountId' });
    initializedFor = sequelize;
  }
  return { Account, Movement, AuthSession };
}

export { Account, AuthSession, Movement };
export { movementTypes } from './movement';
export type { MovementType } from './movement';
