import * as borsh from 'borsh';

export class GreetingAccount {
  counter = 0;
  constructor(fields?: { counter: number }) {
    if (fields) this.counter = fields.counter;
  }
}

export const GreetingSchema = new Map([
  [GreetingAccount, { kind: 'struct', fields: [['counter', 'u32']] }],
]);

export const GREETING_SIZE = borsh.serialize(
  GreetingSchema,
  new GreetingAccount(),
).length;
