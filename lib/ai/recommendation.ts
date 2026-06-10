import OpenAI from "openai";
import type { Portfolio, Scenario, YieldOpportunity } from "@/lib/types";

export type AiRecommendationInput = {
  portfolio: Portfolio;
  opportunities: YieldOpportunity[];
  scenarios: Scenario[];
  constraints: {
    maximumProtocolCount: number;
    maximumAllocationPercent: number;
  };
};

export async function explainRecommendation(input: AiRecommendationInput): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return "OpenAI is not configured. Based on net yield after estimated costs, review the highest net-yield scenario while checking protocol concentration and chain exposure before executing.";
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.2",
    instructions:
      "You are YieldPilot, a DeFi portfolio analyst. Be concise. Return at most 120 words. Use short markdown bullets. Include: Recommendation, Rationale, Tradeoffs. Do not include follow-up suggestions, questions, offers to help, or closing remarks. Avoid promising returns.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              task: "Explain the best allocation scenario using current portfolio, candidate opportunities, costs, and diversification constraints.",
              portfolio: input.portfolio,
              opportunities: input.opportunities,
              scenarios: input.scenarios,
              constraints: input.constraints
            })
          }
        ]
      }
    ]
  });

  return response.output_text;
}
