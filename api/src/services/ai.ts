import OpenAI from 'openai';

// Support both OpenAI and Groq (OpenAI-compatible)
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GROQ_API_KEY
    ? 'https://api.groq.com/openai/v1'
    : 'https://api.openai.com/v1',
});

// Use appropriate model based on provider
const getModel = () => process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

export interface GeneratedCampaignLore {
  worldDescription: string;
  history: string;
  factions: Array<{ name: string; description: string }>;
  locations: Array<{ name: string; description: string }>;
  hooks: string[];
}

export interface GeneratedNPC {
  name: string;
  role: string;
  description: string;
  personality: {
    traits: string[];
    ideals: string;
    bonds: string;
    flaws: string;
  };
  motivations: string[];
  background: string;
  stats?: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
}

export interface GeneratedScenario {
  title: string;
  summary: string;
  objectives: string[];
  encounters: Array<{
    name: string;
    description: string;
    difficulty: string;
    enemies?: string[];
  }>;
  rewards: string[];
  twists: string[];
}

export async function generateCampaignLore(
  name: string,
  setting: string,
  theme: string,
  tone: string
): Promise<GeneratedCampaignLore> {
  const prompt = `You are a creative Dungeon Master. Generate rich world lore for a D&D campaign with the following details:

Campaign Name: ${name}
Setting: ${setting || 'High Fantasy'}
Theme: ${theme || 'Adventure'}
Tone: ${tone || 'Balanced'}

Respond with a JSON object containing:
- worldDescription: A 2-3 paragraph description of the world
- history: A brief history of the world (1-2 paragraphs)
- factions: An array of 3-4 major factions with name and description
- locations: An array of 4-5 notable locations with name and description
- hooks: An array of 3-5 potential adventure hooks

Respond ONLY with valid JSON, no markdown or explanation.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content);
}

export async function generateNPCs(
  campaignContext: string,
  count: number = 3,
  roles?: string[]
): Promise<GeneratedNPC[]> {
  const roleHint = roles?.length
    ? `The NPCs should fill these roles: ${roles.join(', ')}`
    : 'Create a diverse mix of NPCs (merchants, guards, nobles, commoners, etc.)';

  const prompt = `You are a creative Dungeon Master. Generate ${count} unique NPCs for a D&D campaign.

Campaign Context: ${campaignContext}

${roleHint}

For each NPC, include:
- name: A fitting fantasy name
- role: Their occupation or role in the world
- description: Physical appearance and first impression
- personality: Object with traits (array), ideals, bonds, flaws
- motivations: Array of what drives them
- background: A brief backstory
- stats: Object with strength, dexterity, constitution, intelligence, wisdom, charisma (values 8-18)

Respond with a JSON object containing an "npcs" array. Respond ONLY with valid JSON.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  const parsed = JSON.parse(content);
  return parsed.npcs;
}

export async function generateScenario(
  campaignContext: string,
  sessionDescription: string,
  previousResults?: string
): Promise<GeneratedScenario> {
  const continuityContext = previousResults
    ? `Previous Session Results: ${previousResults}\n\nBuild upon these events.`
    : '';

  const prompt = `You are a creative Dungeon Master. Generate a session scenario for a D&D campaign.

Campaign Context: ${campaignContext}

Session Description: ${sessionDescription}

${continuityContext}

Create a scenario with:
- title: A compelling session title
- summary: Overview of the session (2-3 paragraphs)
- objectives: Array of 2-4 main objectives for players
- encounters: Array of 2-4 encounters, each with name, description, difficulty (easy/medium/hard/deadly), and optional enemies array
- rewards: Array of potential rewards (items, gold, information, allies)
- twists: Array of 1-2 possible plot twists or complications

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

export async function summarizeSession(
  events: string[],
  playerDecisions: string[]
): Promise<string> {
  const prompt = `Summarize the following D&D session events into a cohesive narrative summary (2-3 paragraphs):

Key Events:
${events.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Player Decisions:
${playerDecisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Write a narrative summary that captures the important moments and decisions. This will be used to provide context for future sessions.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0].message.content || 'Session summary unavailable.';
}

export interface GeneratedBackground {
  characterName: string;
  race: string;
  class: string;
  background: string;
  backstory: string;
  personalityTraits: string[];
  ideals: string;
  bonds: string[];
  flaws: string;
  hooks: string[];
  reasonsForAdventure: string;
}

export async function generatePlayerBackgrounds(
  campaignContext: string,
  playerCount: number
): Promise<GeneratedBackground[]> {
  const prompt = `You are a creative Dungeon Master. Generate ${playerCount} interconnected player character backgrounds for a D&D campaign.

Campaign Context: ${campaignContext}

For each character, include:
- characterName: A fitting fantasy name
- race: D&D 5e race
- class: Suggested D&D 5e class
- background: D&D 5e background (e.g., Acolyte, Criminal, Noble)
- backstory: A paragraph of backstory
- personalityTraits: Array of 2 personality traits
- ideals: One ideal they pursue
- bonds: Array of 1-2 bonds to other party members or the world
- flaws: One character flaw
- hooks: Array of 2-3 story hooks involving this character
- reasonsForAdventure: Why this character is adventuring

Make the backgrounds interconnected where possible to create party chemistry.

Respond with a JSON object containing a "backgrounds" array. Respond ONLY with valid JSON.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  const parsed = JSON.parse(content);
  return parsed.backgrounds || parsed.characters || [parsed];
}

export interface GeneratedMapDescription {
  name: string;
  description: string;
  type: string;
  dimensions: { width: number; height: number };
  gridSize: number;
  rooms: Array<{
    name: string;
    description: string;
    features: string[];
    connections: string[];
  }>;
  pointsOfInterest: Array<{
    name: string;
    description: string;
    type: string;
  }>;
  encounters: Array<{
    location: string;
    description: string;
    difficulty: string;
  }>;
  atmosphere: string;
  hazards: string[];
}

export async function generateMapDescription(
  campaignContext: string,
  locationDescription: string,
  mapType: string
): Promise<GeneratedMapDescription> {
  const prompt = `You are a creative Dungeon Master and cartographer. Generate a detailed map description for a D&D campaign.

Campaign Context: ${campaignContext}

Location Description: ${locationDescription}
Map Type: ${mapType}

Create a detailed map layout. Respond with VALID JSON only. Use this exact structure:

{
  "name": "Location Name",
  "description": "Overall description",
  "type": "${mapType}",
  "dimensions": {"width": 30, "height": 30},
  "gridSize": 50,
  "rooms": [
    {
      "name": "Room Name",
      "description": "Room description",
      "features": ["feature1", "feature2"],
      "connections": ["Connected Room Name"]
    }
  ],
  "pointsOfInterest": [
    {
      "name": "POI Name",
      "description": "POI description",
      "type": "treasure"
    }
  ],
  "encounters": [
    {
      "location": "Room Name",
      "description": "Encounter description",
      "difficulty": "medium"
    }
  ],
  "atmosphere": "Description of mood and atmosphere",
  "hazards": [
    {
      "name": "Hazard Name",
      "description": "Hazard description"
    }
  ]
}

Important: 
- Keep dimensions between 20-60 for width and height
- Create 4-8 rooms
- Do NOT add extra fields to encounters (no "name" field in encounters)
- Ensure all JSON is properly formatted
- Use double quotes for all strings`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content);
}

export interface GeneratedEncounter {
  name: string;
  description: string;
  difficulty: string;
  challengeRating: string;
  enemies: Array<{
    name: string;
    count: number;
    cr: string;
    hitPoints: number;
    armorClass: number;
    abilities: string[];
    tactics: string;
  }>;
  terrain: string;
  objectives: string[];
  rewards: string[];
  tacticalNotes: string;
  alternativeResolutions: string[];
}

export async function generateDetailedEncounters(
  campaignContext: string,
  partyLevel: number,
  partySize: number,
  encounterType: string
): Promise<GeneratedEncounter[]> {
  const prompt = `You are an expert D&D 5e encounter designer. Create 3 detailed combat encounters.

Campaign Context: ${campaignContext}

Party Level: ${partyLevel}
Party Size: ${partySize}
Encounter Theme: ${encounterType}

For each encounter, provide:
- name: Encounter name (string)
- description: 1-2 paragraph scene description (string)
- difficulty: easy/medium/hard/deadly (string)
- challengeRating: Overall CR as a STRING (e.g., "3", "1/2", "1/4")
- enemies: Array of enemy objects with:
  - name: Enemy name (string)
  - count: Number of this enemy (integer)
  - cr: Challenge rating as a STRING (e.g., "1", "1/2", "1/4", "2")
  - hitPoints: HP value (integer)
  - armorClass: AC value (integer)
  - abilities: Array of ability names (array of strings)
  - tactics: Tactical description (string)
- terrain: Battlefield description (string)
- objectives: Array of objective descriptions (array of strings)
- rewards: Array of reward descriptions as STRINGS (e.g., "500 XP", "Magic sword +1")
- tacticalNotes: DM tips (string)
- alternativeResolutions: Array of non-combat solution descriptions (array of strings)

IMPORTANT:
- All CR values MUST be strings in quotes (e.g., "1/4", "1/2", "1", "2")
- Rewards must be simple strings, not objects
- Alternative resolutions must be simple strings, not objects

Balance encounters for a party of ${partySize} level ${partyLevel} characters.

Respond with a JSON object containing an "encounters" array. Respond ONLY with valid JSON.`;

  const response = await openai.chat.completions.create({
    model: getModel(),
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No response from AI');

  const parsed = JSON.parse(content);
  return parsed.encounters || [parsed];
}
