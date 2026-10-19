import { Sequelize } from 'sequelize';
import { getDatabase } from '../config/database';
import { Account, initializeAccountModel } from './account';
import { initializeMovementModel, Movement } from './movement';

let initializedFor: Sequelize | undefined;

export function initializeModels(sequelize: Sequelize = getDatabase()): { Account: typeof Account; Movement: typeof Movement } {
  if (initializedFor !== sequelize) {
    initializeAccountModel(sequelize);
    initializeMovementModel(sequelize);
    Account.hasMany(Movement, { as: 'movements', foreignKey: 'accountId' });
    Movement.belongsTo(Account, { as: 'account', foreignKey: 'accountId' });
    initializedFor = sequelize;
  }
  return { Account, Movement };
}

export { Account, Movement };
export { movementTypes } from './movement';
export type { MovementType } from './movement';
