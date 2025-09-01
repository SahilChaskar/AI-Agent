import { Metric, type MetricResult } from "@mastra/core";

export class TemporalRelevanceMetric extends Metric {
  constructor() {
    super();
  }

  async measure(input: string, output: string): Promise<MetricResult> {
    const yearsInInput: string[] = input.match(/\b(19[7-9]\d|20[0-1]\d)\b/g) ?? [];
    const yearsInOutput: string[] = output.match(/\b(19[7-9]\d|20[0-1]\d)\b/g) ?? [];

    const relevance = yearsInInput.some((year) => yearsInOutput.includes(year));

    return {
      score: relevance ? 1 : 0.3,
      info: {
        message: relevance
          ? "Answer includes the requested years."
          : "Answer does not reference years from the question.",
      },
    };
  }
}
