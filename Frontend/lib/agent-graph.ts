import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { searchChunks } from "./vector-store";

// Define the state for our agent
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  campaignId: Annotation<string>(),
  userId: Annotation<string>(),
  campaignInfo: Annotation<string>(), // Pre-loaded title/desc
  retrievedContext: Annotation<string>(), // Chunks from RAG
});

/**
 * Semantic search for relevant campaign documents.
 */
async function retrieveRAGContext(state: typeof AgentState.State) {
  const { campaignId, userId, messages } = state;
  if (!campaignId || !userId) return { retrievedContext: "" };

  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content.toString();

  try {
    console.log(`🔍 [RAG] Searching for: "${query}"`);
    const chunks = await searchChunks(campaignId, userId, query, 3);
    
    if (chunks.length === 0) {
      return { retrievedContext: "No specific document information found for this query." };
    }

    return { 
      retrievedContext: `Relevant excerpts from documents:\n${chunks.join("\n\n")}` 
    };
  } catch (err) {
    console.error("RAG retrieval error:", err);
    return { retrievedContext: "Error searching document knowledge base." };
  }
}

/**
 * Generate a response using the pre-loaded campaign info AND retrieved RAG context.
 */
async function callModel(state: typeof AgentState.State) {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_CALLING,
  });

  const systemMessage = new SystemMessage(
    `You are an AI calling agent. Use the context below to answer accurately.
    
    CAMPAIGN INFO:
    ${state.campaignInfo}
    
    ${state.retrievedContext}

    INSTRUCTIONS:
    - Keep responses professional, friendly, and very concise for a phone call.
    - If the answer isn't in the context, say you'll check with the team.`
  );

  const response = await model.invoke([systemMessage, ...state.messages]);
  return { messages: [response] };
}

/**
 * Create the LangGraph orchestrator.
 */
export function createAgentGraph() {
  const workflow = new StateGraph(AgentState)
    .addNode("retrieve", retrieveRAGContext)
    .addNode("respond", callModel)
    .addEdge(START, "retrieve")
    .addEdge("retrieve", "respond")
    .addEdge("respond", END);

  return workflow.compile();
}

/**
 * Execute a query against the campaign knowledge graph with pre-loaded context.
 */
export async function queryCampaignKnowledge(
  campaignId: string,
  userId: string,
  campaignInfo: string,
  query: string,
  history: BaseMessage[] = []
) {
  const app = createAgentGraph();
  const inputs = {
    campaignId,
    userId,
    campaignInfo,
    messages: [...history, new HumanMessage(query)],
  };

  const result = await app.invoke(inputs);
  const lastMessage = result.messages[result.messages.length - 1];
  return lastMessage.content.toString();
}
