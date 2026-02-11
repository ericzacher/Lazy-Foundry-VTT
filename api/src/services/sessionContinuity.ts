import OpenAI from 'openai';
import { AppDataSource } from '../config/database';
import { SessionResult } from '../entities/SessionResult';
import { NPCHistory } from '../entities/NPCHistory';
import { TimelineEvent } from '../entities/TimelineEvent';
import { Session, SessionStatus } from '../entities/Session';
import { NPC } from '../entities/NPC';
import { Campaign } from '../entities/Campaign';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1',
});

const getModel = () =>
  process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

// --- Interfaces ---

export interface SessionSummaryAI {
  summary: string;
  keyEvents: string[];
  npcInteractions: Record<string, string>;
  worldChanges: Record<string, string>;
  plotAdvancement: string;
  unresolvedThreads: string[];
}

export interface CampaignSummary {
  sessionsCompleted: number;
  totalSessions: number;
  timelineEvents: Array<{
    session: number | null;
    title: string;
    description: string | null;
    type: string;
    significance: string;
  }>;
  npcStatuses: Record<
    string,
    {
      npcId: string;
      name: string;
      alignment: string | null;
      loyalty: string | null;
      status: string;
      relationshipSummary: string | null;
    }
  >;
  majorPlotPoints: string[];
}

export interface ContinuityScenario {
  title: string;
  overview: string;
  connectionToPrevious: string;
  npcInvolvement: Record<string, string>;
  plotProgression: string;
  keyScenes: Array<{ title: string; description: string }>;
  potentialComplications: string[];
  setupForNext: string[];
}

// --- AI Summarization ---

export async function autoSummarizeSession(
  transcript: string,
  campaignContext: string,
  partyComposition: string
): Promise<SessionSummaryAI> {
  const prompt = `You are a Dungeon Master documenting a D&D 5e session. Analyze the following session transcript or description.

**Session Content:**
${transcript}

**Party Composition:**
${partyComposition}

**Campaign Context:**
${campaignContext}

Provide analysis as JSON with these fields:
1. "summary": 2-3 sentence executive summary
2. "keyEvents": Array of 3-5 major events that occurred
3. "npcInteractions": Object with NPC names as keys, description of how they were involved as values
4. "worldChanges": Object describing how the world/setting was affected
5. "plotAdvancement": How the main storyline advanced (string)
6. "unresolvedThreads": Array of plot hooks for next session

Respond ONLY with valid JSON.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content);
}

// --- NPC Status Tracking ---

export async function getNPCCurrentStatus(npcId: string): Promise<{
  npcId: string;
  name: string;
  alignment: string | null;
  loyalty: string | null;
  status: string;
  relationshipSummary: string | null;
} | null> {
  const npcRepo = AppDataSource.getRepository(NPC);
  const historyRepo = AppDataSource.getRepository(NPCHistory);

  const npc = await npcRepo.findOne({ where: { id: npcId } });
  if (!npc) return null;

  const latestHistory = await historyRepo.findOne({
    where: { npcId },
    order: { createdAt: 'DESC' },
  });

  return {
    npcId: npc.id,
    name: npc.name,
    alignment: latestHistory?.alignmentAfter ?? null,
    loyalty: latestHistory?.loyaltyAfter ?? null,
    status: latestHistory?.statusAfter ?? 'alive',
    relationshipSummary: latestHistory?.relationshipChange ?? null,
  };
}

export async function trackNPCChanges(
  npcId: string,
  sessionId: string,
  changes: Partial<NPCHistory>
): Promise<NPCHistory> {
  const historyRepo = AppDataSource.getRepository(NPCHistory);
  const history = historyRepo.create({
    npcId,
    sessionId,
    ...changes,
  });
  return historyRepo.save(history);
}

// --- Timeline ---

export async function addTimelineEvent(
  campaignId: string,
  sessionId: string | null,
  eventData: Partial<TimelineEvent>
): Promise<TimelineEvent> {
  const timelineRepo = AppDataSource.getRepository(TimelineEvent);
  const sessionRepo = AppDataSource.getRepository(Session);

  let sessionNumber: number | undefined;
  if (sessionId) {
    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    sessionNumber = session?.sessionNumber;
  }

  const event = timelineRepo.create({
    campaignId,
    sessionId: sessionId ?? undefined,
    sessionNumber,
    ...eventData,
  });
  return timelineRepo.save(event);
}

export async function getTimeline(campaignId: string): Promise<TimelineEvent[]> {
  const timelineRepo = AppDataSource.getRepository(TimelineEvent);
  return timelineRepo.find({
    where: { campaignId },
    order: { sessionNumber: 'ASC', createdAt: 'ASC' },
  });
}

// --- Campaign Summary ---

export async function getCampaignSummary(
  campaignId: string,
  upToSession?: number
): Promise<CampaignSummary> {
  const sessionRepo = AppDataSource.getRepository(Session);
  const timelineRepo = AppDataSource.getRepository(TimelineEvent);
  const npcRepo = AppDataSource.getRepository(NPC);

  let sessions = await sessionRepo.find({
    where: { campaignId },
    order: { sessionNumber: 'ASC' },
  });
  if (upToSession) {
    sessions = sessions.filter((s) => s.sessionNumber <= upToSession);
  }

  let timeline = await timelineRepo.find({
    where: { campaignId },
    order: { sessionNumber: 'ASC' },
  });
  if (upToSession) {
    timeline = timeline.filter(
      (t) => !t.sessionNumber || t.sessionNumber <= upToSession
    );
  }

  const npcs = await npcRepo.find({ where: { campaignId } });
  const npcStatuses: CampaignSummary['npcStatuses'] = {};
  for (const npc of npcs) {
    const status = await getNPCCurrentStatus(npc.id);
    if (status) npcStatuses[npc.name] = status;
  }

  return {
    sessionsCompleted: sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED
    ).length,
    totalSessions: sessions.length,
    timelineEvents: timeline.map((t) => ({
      session: t.sessionNumber ?? null,
      title: t.title,
      description: t.description ?? null,
      type: t.eventType,
      significance: t.significance,
    })),
    npcStatuses,
    majorPlotPoints: timeline
      .filter((t) => t.significance === 'critical')
      .map((t) => t.title),
  };
}

// --- Continuity Context ---

export async function buildContinuityContext(
  campaignId: string,
  upToSession?: number
): Promise<string> {
  const summary = await getCampaignSummary(campaignId, upToSession);

  return `**Campaign Progress Summary:**

Sessions Completed: ${summary.sessionsCompleted} / ${summary.totalSessions}

**Timeline of Major Events:**
${JSON.stringify(summary.timelineEvents, null, 2)}

**NPC Status:**
${JSON.stringify(summary.npcStatuses, null, 2)}

**Major Plot Points:**
${JSON.stringify(summary.majorPlotPoints, null, 2)}`;
}

// --- Continuity-Aware Scenario Generation ---

export async function generateContinuityScenario(
  campaignId: string,
  sessionDescription: string,
  partyLevel: number,
  partyComposition: string
): Promise<ContinuityScenario> {
  const campaignRepo = AppDataSource.getRepository(Campaign);
  const resultRepo = AppDataSource.getRepository(SessionResult);
  const sessionRepo = AppDataSource.getRepository(Session);

  const campaign = await campaignRepo.findOne({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found');

  const continuityContext = await buildContinuityContext(campaignId);

  // Get unresolved threads from latest session result
  const latestSession = await sessionRepo.findOne({
    where: { campaignId },
    order: { sessionNumber: 'DESC' },
  });
  let unresolvedThreads: string[] = [];
  if (latestSession) {
    const latestResult = await resultRepo.findOne({
      where: { sessionId: latestSession.id },
    });
    if (latestResult) {
      unresolvedThreads = latestResult.unfinishedThreads || [];
    }
  }

  const prompt = `You are a Dungeon Master creating the next session in an ongoing D&D 5e campaign.

**Campaign:** ${campaign.name}
${campaign.description || ''}

**Campaign Context:**
${continuityContext}

**Unresolved Plot Threads:**
${JSON.stringify(unresolvedThreads, null, 2)}

**Party Level:** ${partyLevel}
**Party Composition:** ${partyComposition}

**Session Request:** ${sessionDescription}

Create a scenario that:
1. Naturally continues from where the last session left off
2. Respects NPC relationships and status changes
3. Builds on unresolved plot threads
4. Reflects world changes from previous sessions
5. Offers multiple paths forward while maintaining continuity

Provide as JSON:
1. "title": Session title
2. "overview": What this session is about
3. "connectionToPrevious": How this connects to past events
4. "npcInvolvement": Object with NPC names as keys, how they appear as values
5. "plotProgression": How this advances the main story
6. "keyScenes": Array of 3-4 objects with "title" and "description"
7. "potentialComplications": Array of what could go wrong
8. "setupForNext": Array of hooks this sets up for future sessions

Respond ONLY with valid JSON.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content);
}
