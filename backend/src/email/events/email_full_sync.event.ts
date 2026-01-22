export class EmailFullSyncEvent {
  constructor(
    public readonly userId: number,
    public readonly pageToken?: string,
    public readonly pageCount: number = 0,
  ) {}
}
