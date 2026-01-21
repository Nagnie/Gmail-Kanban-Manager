export class EmailSyncEvent {
  constructor(
    public readonly userId: number,
    public readonly pageToken?: string,
    public readonly pageCount: number = 1,
    public readonly deletedEmailIds?: string[],
  ) {}
}
