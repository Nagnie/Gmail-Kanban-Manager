export class GenerateEmbeddingsEvent {
  constructor(public readonly emailIds: string[]) {}
}
