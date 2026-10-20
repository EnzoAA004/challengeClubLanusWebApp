import { AppError } from '../errors/app-error';
import { initializeModels } from '../models';

const demoAccountCode = 'GRANATE-DEMO';

export async function getDemoAccount() {
  const { Account } = initializeModels();
  const account = await Account.findOne({ where: { code: demoAccountCode } });
  if (!account) throw new AppError(404, 'No encontramos la cuenta de demostración.');

  return {
    id: account.id,
    name: account.name,
    balance: account.balance,
    currency: account.currency,
  };
}
