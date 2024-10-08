export class InstructionData {
  number: number;
  constructor(fields: { number: number } | undefined = undefined) {
    this.number = fields?.number ?? 0;
  }
}
