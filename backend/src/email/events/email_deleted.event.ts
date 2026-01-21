export class EmailDeletedEvent {
  constructor(
    public readonly userId: number,
    public readonly emailIds: string[],
  ) {}
}
