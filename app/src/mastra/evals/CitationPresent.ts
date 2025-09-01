import { Metric, type MetricResult } from "@mastra/core";

export class CitationPresenceMetric extends Metric {
  constructor() {
    super();
  }

  async measure(input: string, output: string): Promise<MetricResult> {
    const hasCitation = /\b(19[7-9]\d|20[0-1]\d)\b/.test(output) || output.includes("Source");

    return {
      score: hasCitation ? 1 : 0,
      info: {
        message: hasCitation
          ? "Citations found in the answer."
          : "No citations detected; answer may not be grounded.",
      },
    };
  }
}
