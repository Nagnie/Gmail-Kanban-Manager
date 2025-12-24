export class EmailEmbeddingEvent {
  constructor(
    public readonly userId: number,
    public readonly emailIds: string[],
    public readonly batchNumber: number = 1,
  ) {}
}
